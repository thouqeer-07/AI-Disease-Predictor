const aiService = require('../services/aiService');
const ragService = require('../services/ragService');
const path = require('path');
const fs = require('fs');

exports.predictDisease = async (req, res) => {
  try {
    const { symptoms, behavioralData } = req.body;
    const prediction = await aiService.getDiseasePrediction(symptoms, behavioralData);
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.chat = async (req, res) => {
  try {
    const { message, history, documentId } = req.body;
    
    // If documentId is present, use RAG pipeline
    if (documentId) {
      const ragResult = await ragService.queryRagChat({ message, history, documentId });
      return res.json({ response: ragResult.response, matchedChunks: ragResult.matchedChunks, documentId: ragResult.documentId });
    }

    const response = await aiService.getChatResponse(message, history);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.uploadReport = async (req, res) => {
  try {
    let filePath = null;
    let originalName = "medical_report.pdf";

    if (req.file) {
      filePath = req.file.path;
      originalName = req.file.originalname || originalName;
    } else if (req.body.base64Data) {
      // Base64 fallback upload support
      const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      originalName = req.body.fileName || `report_${docId}.pdf`;
      const reportsDir = path.resolve(__dirname, '../uploads/reports');
      if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
      filePath = path.join(reportsDir, `${docId}.pdf`);
      
      const buffer = Buffer.from(req.body.base64Data.replace(/^data:application\/pdf;base64,/, ""), 'base64');
      fs.writeFileSync(filePath, buffer);
    } else {
      return res.status(400).json({ error: "No PDF file or base64 data provided." });
    }

    const result = await ragService.indexMedicalPdf(filePath, originalName);

    // Initial comprehensive AI report summary using RAG pipeline
    const summaryQuery = await ragService.queryRagChat({
      message: `Provide a short and simple summary of the key details present in this uploaded PDF document. Do not include long explanations.`,
      documentId: result.documentId,
      topK: 12
    });

    res.json({
      status: "success",
      message: "Medical report processed successfully",
      documentId: result.documentId,
      fileName: result.originalName,
      totalChunks: result.totalChunks,
      totalPages: result.totalPages,
      summaryPreview: result.summaryPreview,
      initialAnalysis: summaryQuery.response
    });
  } catch (error) {
    console.error("Upload & RAG Index error:", error);
    res.status(500).json({ error: error.message || "Failed to process PDF report." });
  }
};

exports.ragChat = async (req, res) => {
  try {
    const { message, history, documentId } = req.body;
    const ragResult = await ragService.queryRagChat({ message, history, documentId });
    res.json(ragResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.analyzeReport = async (req, res) => {
  try {
    const { fileUrl, documentId, message } = req.body;
    
    if (documentId) {
      const ragResult = await ragService.queryRagChat({
        message: message || "Analyze this report and summarize key health parameters",
        documentId
      });
      return res.json(ragResult);
    }

    const analysis = await aiService.analyzeMedicalReport(fileUrl);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
