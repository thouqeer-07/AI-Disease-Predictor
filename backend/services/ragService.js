const { GoogleGenerativeAI } = require('@google/generative-ai');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { formatGeminiHistory } = require('../utils/geminiHistory');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Ensure upload and vector store directories exist
const UPLOADS_DIR = path.resolve(__dirname, '../uploads/reports');
const VECTOR_STORE_DIR = path.resolve(__dirname, '../uploads/vector_store');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(VECTOR_STORE_DIR)) fs.mkdirSync(VECTOR_STORE_DIR, { recursive: true });

// Cache in-memory map of documentId -> metadata
const activeDocumentStores = new Map();

/**
 * Indexes a PDF medical report using Python FAISS RAG pipeline.
 * @param {string} pdfFilePath - Local filesystem path to saved PDF.
 * @param {string} originalName - Original uploaded filename.
 * @param {string} docId - Optional document ID.
 */
exports.indexMedicalPdf = async (pdfFilePath, originalName, docId = null) => {
  try {
    const id = docId || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const outputDir = path.join(VECTOR_STORE_DIR, id);

    console.log('\n==================================================');
    console.log('📄 [RAG INDEXING] Processing Medical PDF Report');
    console.log(`   • File Name  : ${originalName}`);
    console.log(`   • Document ID: ${id}`);
    console.log(`   • Path       : ${pdfFilePath}`);
    console.log('==================================================');

    const scriptPath = path.resolve(__dirname, '../../ml_model/rag_pipeline.py');
    const pyArgs = [
      scriptPath,
      'index',
      '--pdf', pdfFilePath,
      '--out', outputDir,
      '--chunk_size', '500',
      '--chunk_overlap', '100'
    ];

    const result = await new Promise((resolve, reject) => {
      execFile('python', pyArgs, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (stderr && stderr.trim()) {
          console.log(`[RAG PYTHON LOG] ${stderr.trim()}`);
        }
        if (error) {
          console.error("❌ RAG Indexing Python Execution Error:", stderr || error.message);
          return reject(error);
        }
        try {
          const res = JSON.parse(stdout.trim());
          if (res.error) return reject(new Error(res.error));
          resolve(res);
        } catch (e) {
          reject(new Error(`Failed to parse Python RAG stdout: ${stdout}`));
        }
      });
    });

    const metadata = {
      documentId: id,
      originalName: originalName,
      pdfPath: pdfFilePath,
      outputDir: outputDir,
      totalPages: result.total_pages || 1,
      totalChunks: result.total_chunks || 0,
      embeddingDim: result.embedding_dim || 384,
      summaryPreview: result.summary_preview || '',
      createdAt: new Date().toISOString()
    };

    activeDocumentStores.set(id, metadata);

    console.log('✅ [RAG INDEX SUCCESS] FAISS Vector Database Created');
    console.log(`   • Total Chunks Built : ${metadata.totalChunks}`);
    console.log(`   • Output Store Dir   : ${metadata.outputDir}`);
    console.log('==================================================\n');

    return metadata;
  } catch (error) {
    console.error("❌ [RAG INDEX ERROR]", error.message || error);
    throw error;
  }
};

/**
 * Executes RAG similarity search and generates user-friendly medical response using Gemini.
 */
exports.queryRagChat = async ({ message, history = [], documentId = null, vectorStoreDir = null, topK = 10 }) => {
  try {
    let matchedChunks = [];
    let docMeta = null;

    // Resolve vector store directory
    let targetDir = vectorStoreDir;
    if (!targetDir && documentId) {
      if (activeDocumentStores.has(documentId)) {
        docMeta = activeDocumentStores.get(documentId);
        targetDir = docMeta.outputDir;
      } else {
        const potentialDir = path.join(VECTOR_STORE_DIR, documentId);
        if (fs.existsSync(potentialDir)) {
          targetDir = potentialDir;
        }
      }
    }

    // If no specific documentId specified, pick latest active store if available
    if (!targetDir && activeDocumentStores.size > 0) {
      const latest = Array.from(activeDocumentStores.values()).pop();
      targetDir = latest.outputDir;
      docMeta = latest;
    }

    if (targetDir && fs.existsSync(targetDir)) {
      console.log('\n==================================================');
      console.log('🔍 [RAG QUERY] Performing Vector Search');
      console.log(`   • Query Text  : "${message}"`);
      console.log(`   • Target Store: ${targetDir}`);
      console.log(`   • Top K Chunks: ${topK}`);
      console.log('==================================================');

      const scriptPath = path.resolve(__dirname, '../../ml_model/rag_pipeline.py');
      const pyArgs = [
        scriptPath,
        'query',
        '--dir', targetDir,
        '--query', message,
        '--top_k', String(topK)
      ];

      matchedChunks = await new Promise((resolve) => {
        const pyProc = execFile('python', pyArgs, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
          if (error) {
            console.warn("⚠️ Vector search notice:", stderr || error.message);
            return resolve([]);
          }
          try {
            const res = JSON.parse(stdout.trim());
            resolve(res.matched_chunks || []);
          } catch (e) {
            resolve([]);
          }
        });
      });

      // Always augment with Node.js keyword/relevance fallback for exact matches
      const metadataFile = path.join(targetDir, "chunks_metadata.json");
      if (fs.existsSync(metadataFile)) {
        try {
          const rawChunks = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
          const queryWords = (message.toLowerCase().match(/\w+/g) || []).filter(w => w.length > 2);
          
          if (queryWords.length > 0) {
            const scored = rawChunks.map(chunk => {
              const textLower = chunk.text.toLowerCase();
              let score = 0;
              queryWords.forEach(word => {
                const occurrences = (textLower.split(word).length - 1);
                score += occurrences;
              });
              return { ...chunk, score };
            });
            
            // Get top 5 keyword chunks
            const keywordChunks = scored.filter(c => c.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
            
            // Merge with matchedChunks avoiding duplicates
            const existingIds = new Set(matchedChunks.map(c => c.text));
            keywordChunks.forEach(kc => {
              if (!existingIds.has(kc.text)) {
                matchedChunks.push(kc);
                existingIds.add(kc.text);
              }
            });
          } else if (matchedChunks.length === 0) {
            matchedChunks = rawChunks.slice(0, topK);
          }
        } catch (e) {
          console.warn("Fast Node.js chunk retrieval notice:", e.message);
        }
      }

      console.log(`✅ [RAG RETRIEVAL] Found ${matchedChunks.length} matching text sections.`);
    }

    // Build context snippet from matched chunks
    let ragContextSnippet = "";
    if (matchedChunks.length > 0) {
      ragContextSnippet = matchedChunks.map((chunk, idx) => 
        `[Excerpt ${idx + 1} | Page ${chunk.page}]:\n"${chunk.text}"`
      ).join('\n\n');
    }

    // System prompt for concise, context-aware medical answers
    const systemPrompt = `You are a clinical AI assistant answering questions about the user's medical report.

${ragContextSnippet ? `### EXTRACTED PDF CONTEXT:\n${ragContextSnippet}\n\n` : ''}
RESPONSE GUIDELINES:
1. **Analyze with Medical Knowledge**: Extract the relevant value from the PDF context above. First, clearly state the value and reference range, and state if it is normal, high, or low.
2. **AI Health Advice**: Next to it, provide brief AI advice or insight. If the value is borderline (e.g., near the upper or lower edge of the normal range), warn them about potential issues if it worsens, and give a short, practical tip to maintain or improve it.
3. **Short and Simple**: Keep your explanation very short, simple, and direct. Do NOT write long paragraphs.
4. **Missing Info**: If the specific value asked about is completely missing from the PDF context, say that the information is not present in the PDF.

User Question: "${message}"`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // Format and sanitize chat history strictly for Gemini API rules
    const formattedHistory = formatGeminiHistory(history);

    const chat = model.startChat({
      history: formattedHistory
    });

    const result = await chat.sendMessage(systemPrompt);
    const responseText = result.response.text();

    console.log('✅ [RAG CHAT SUCCESS] AI Response generated with memory context.');
    console.log('==================================================\n');

    return {
      response: responseText,
      matchedChunks: matchedChunks,
      documentId: docMeta ? docMeta.documentId : null
    };

  } catch (error) {
    console.error("❌ [RAG CHAT ERROR]", error);
    return {
      response: "I apologize, but I encountered an issue analyzing your medical report chunks. Please try asking again or re-uploading the PDF document.",
      matchedChunks: [],
      error: error.message
    };
  }
};

exports.getActiveStores = () => Array.from(activeDocumentStores.values());
