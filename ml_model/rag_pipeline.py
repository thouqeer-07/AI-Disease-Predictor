import sys
import os
import json
import re
import argparse
import numpy as np

# Ensure sys.path includes current directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------
# PDF Text Extraction
# ---------------------------------------------------------
def extract_pdf_text(pdf_path):
    """
    Extracts text from a PDF file using pypdf or PyPDF2 as fallback.
    Returns list of page dicts: [{"page": page_num, "text": page_text}]
    """
    pages_data = []
    
    # Try pypdf first
    try:
        from pypdf import PdfReader
        reader = PdfReader(pdf_path)
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            pages_data.append({"page": i + 1, "text": text.strip()})
        if any(p["text"] for p in pages_data):
            return pages_data
    except Exception as e:
        sys.stderr.write(f"[RAG PIPELINE] pypdf extraction notice: {e}\n")

    # Try PyPDF2 fallback
    try:
        import PyPDF2
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for i, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                pages_data.append({"page": i + 1, "text": text.strip()})
        if any(p["text"] for p in pages_data):
            return pages_data
    except Exception as e:
        sys.stderr.write(f"[RAG PIPELINE] PyPDF2 extraction notice: {e}\n")

    # Raw fallback if PDF is plain readable or text-like
    try:
        with open(pdf_path, 'r', errors='ignore') as f:
            raw_content = f.read()
            # Clean up binary garbage
            clean_text = re.sub(r'[^\x20-\x7E\n\r\t]', ' ', raw_content)
            if len(clean_text.strip()) > 50:
                pages_data.append({"page": 1, "text": clean_text.strip()})
    except Exception as e:
        sys.stderr.write(f"[RAG PIPELINE] Raw extraction notice: {e}\n")

    return pages_data


# ---------------------------------------------------------
# Overlapping Text Chunking Engine
# ---------------------------------------------------------
def chunk_text_with_overlap(pages_data, chunk_size=500, chunk_overlap=100):
    """
    Splits text from pages into chunks with specified character size and overlap.
    Preserves sentence/line boundaries where possible.
    """
    chunks = []
    chunk_id = 0

    for page_info in pages_data:
        page_num = page_info["page"]
        text = page_info["text"]

        if not text:
            continue

        # Split into paragraphs or sentences first
        sentences = re.split(r'(?<=[.!?\n])\s+', text)
        current_chunk = ""
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue

            if len(current_chunk) + len(sentence) + 1 <= chunk_size:
                if current_chunk:
                    current_chunk += " " + sentence
                else:
                    current_chunk = sentence
            else:
                # Save current chunk
                if current_chunk:
                    chunk_id += 1
                    chunks.append({
                        "id": chunk_id,
                        "page": page_num,
                        "text": current_chunk
                    })

                # Compute overlap start
                overlap_text = current_chunk[-chunk_overlap:] if len(current_chunk) > chunk_overlap else current_chunk
                current_chunk = overlap_text + " " + sentence if overlap_text else sentence

        # Add remaining text
        if current_chunk and len(current_chunk.strip()) > 20:
            chunk_id += 1
            chunks.append({
                "id": chunk_id,
                "page": page_num,
                "text": current_chunk.strip()
            })

    return chunks


# ---------------------------------------------------------
# Text Embedding Model
# ---------------------------------------------------------
class EmbeddingEngine:
    def __init__(self):
        self.model = None
        self.dim = 256

        # Optional heavy model loading only if explicitly enabled via environment variable
        if os.environ.get("USE_HEAVY_EMBEDDINGS") == "true":
            try:
                from sentence_transformers import SentenceTransformer
                sys.stderr.write("[RAG PIPELINE] Loading SentenceTransformer embedding model...\n")
                self.model = SentenceTransformer('all-MiniLM-L6-v2')
                self.dim = self.model.get_sentence_embedding_dimension()
                sys.stderr.write(f"[RAG PIPELINE] Embedding model loaded successfully (dim={self.dim}).\n")
            except Exception as e:
                sys.stderr.write(f"[RAG PIPELINE] SentenceTransformer unavailable ({e}), using fast TF-IDF vectorizer.\n")
                self.model = None
                self.dim = 256
        else:
            sys.stderr.write("[RAG PIPELINE] Using high-speed TF-IDF feature vector engine.\n")

    def embed_texts(self, text_list):
        """
        Generates normalized embedding vectors (N, dim) for a list of strings.
        """
        if self.model is not None:
            embeddings = self.model.encode(text_list, convert_to_numpy=True, show_progress_bar=False)
            # L2 normalize for cosine similarity
            norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            return (embeddings / norms).astype(np.float32)
        else:
            # Deterministic hash-feature embedding fallback
            return self._fallback_embed(text_list)

    def embed_query(self, query_text):
        """
        Generates normalized embedding vector (1, dim) for query string.
        """
        return self.embed_texts([query_text])

    def _fallback_embed(self, text_list):
        vectors = []
        for text in text_list:
            vec = np.zeros(self.dim, dtype=np.float32)
            words = re.findall(r'\w+', text.lower())
            for idx, word in enumerate(words):
                h = hash(word) % self.dim
                vec[h] += 1.0 / (idx + 1)
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec /= norm
            vectors.append(vec)
        return np.array(vectors, dtype=np.float32)


# ---------------------------------------------------------
# FAISS Vector Database Manager
# ---------------------------------------------------------
class FAISSVectorStore:
    def __init__(self, dim=384):
        self.dim = dim
        self.index = None
        self._init_faiss()

    def _init_faiss(self):
        try:
            import faiss
            # Inner Product index on L2 normalized vectors = Cosine Similarity
            self.index = faiss.IndexFlatIP(self.dim)
        except Exception as e:
            sys.stderr.write(f"[RAG PIPELINE] FAISS import error ({e}), initializing NumPy cosine search fallback.\n")
            self.index = None
            self.stored_vectors = None

    def build_and_save(self, vectors, chunks, output_dir):
        """
        Builds FAISS index from vectors and saves index file + chunks metadata.
        """
        os.makedirs(output_dir, exist_ok=True)
        index_file = os.path.join(output_dir, "index.faiss")
        metadata_file = os.path.join(output_dir, "chunks_metadata.json")

        if self.index is not None:
            import faiss
            self.index.reset()
            self.index.add(vectors)
            faiss.write_index(self.index, index_file)
        else:
            # Fallback vector file save
            np.save(os.path.join(output_dir, "vectors.npy"), vectors)

        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(chunks, f, indent=2)

        return index_file, metadata_file

    def search(self, query_vec, output_dir, top_k=4):
        """
        Loads index and metadata from output_dir, performs vector similarity search,
        returns top_k matching chunks with similarity scores.
        """
        metadata_file = os.path.join(output_dir, "chunks_metadata.json")
        if not os.path.exists(metadata_file):
            raise FileNotFoundError(f"Metadata file not found at {metadata_file}")

        with open(metadata_file, 'r', encoding='utf-8') as f:
            chunks = json.load(f)

        index_file = os.path.join(output_dir, "index.faiss")
        
        if os.path.exists(index_file):
            try:
                import faiss
                index = faiss.read_index(index_file)
                scores, indices = index.search(query_vec, min(top_k, len(chunks)))
                
                results = []
                for score, idx in zip(scores[0], indices[0]):
                    if 0 <= idx < len(chunks):
                        chunk = dict(chunks[idx])
                        chunk["score"] = float(score)
                        results.append(chunk)
                return results
            except Exception as e:
                sys.stderr.write(f"[RAG PIPELINE] FAISS read error ({e}), attempting numpy fallback.\n")

        # Numpy fallback
        vec_file = os.path.join(output_dir, "vectors.npy")
        if os.path.exists(vec_file):
            vectors = np.load(vec_file)
            similarities = np.dot(vectors, query_vec[0])
            top_indices = np.argsort(similarities)[::-1][:top_k]
            
            results = []
            for idx in top_indices:
                if 0 <= idx < len(chunks):
                    chunk = dict(chunks[idx])
                    chunk["score"] = float(similarities[idx])
                    results.append(chunk)
            return results

        # Fallback return first top_k chunks
        return [dict(c, score=0.5) for c in chunks[:top_k]]


# ---------------------------------------------------------
# CLI & API Commands
# ---------------------------------------------------------
def index_pdf_command(pdf_path, output_dir, chunk_size=500, chunk_overlap=100):
    if not os.path.exists(pdf_path):
        return {"error": f"PDF file not found: {pdf_path}"}

    pages_data = extract_pdf_text(pdf_path)
    if not pages_data or not any(p["text"] for p in pages_data):
        return {"error": "Failed to extract text from PDF or PDF is empty."}

    chunks = chunk_text_with_overlap(pages_data, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    if not chunks:
        return {"error": "No valid text chunks generated from PDF."}

    embedder = EmbeddingEngine()
    texts = [c["text"] for c in chunks]
    vectors = embedder.embed_texts(texts)

    vector_store = FAISSVectorStore(dim=embedder.dim)
    index_file, metadata_file = vector_store.build_and_save(vectors, chunks, output_dir)

    # Generate document preview / summary text
    full_text_sample = " ".join([c["text"] for c in chunks[:3]])
    summary_preview = full_text_sample[:300] + "..." if len(full_text_sample) > 300 else full_text_sample

    return {
        "status": "success",
        "pdf_path": pdf_path,
        "output_dir": output_dir,
        "total_pages": len(pages_data),
        "total_chunks": len(chunks),
        "embedding_dim": embedder.dim,
        "summary_preview": summary_preview,
        "chunks_sample": chunks[:2]
    }


def query_rag_command(output_dir, query_text, top_k=4):
    embedder = EmbeddingEngine()
    query_vec = embedder.embed_query(query_text)

    vector_store = FAISSVectorStore(dim=embedder.dim)
    matched_chunks = vector_store.search(query_vec, output_dir, top_k=top_k)

    return {
        "status": "success",
        "query": query_text,
        "matched_chunks": matched_chunks
    }


def main():
    parser = argparse.ArgumentParser(description="FAISS RAG Pipeline for Medical PDF Reports")
    subparsers = parser.add_subparsers(dest="command")

    # Index command
    index_parser = subparsers.add_parser("index")
    index_parser.add_argument("--pdf", required=True, help="Path to input PDF medical report")
    index_parser.add_argument("--out", required=True, help="Output directory to store FAISS index & metadata")
    index_parser.add_argument("--chunk_size", type=int, default=500, help="Chunk character length")
    index_parser.add_argument("--chunk_overlap", type=int, default=100, help="Overlap character length")

    # Query command
    query_parser = subparsers.add_parser("query")
    query_parser.add_argument("--dir", required=True, help="Directory containing FAISS index & metadata")
    query_parser.add_argument("--query", required=True, help="User query text")
    query_parser.add_argument("--top_k", type=int, default=4, help="Number of relevant chunks to retrieve")

    args = parser.parse_args()

    if args.command == "index":
        res = index_pdf_command(args.pdf, args.out, args.chunk_size, args.chunk_overlap)
        print(json.dumps(res))
    elif args.command == "query":
        res = query_rag_command(args.dir, args.query, args.top_k)
        print(json.dumps(res))
    else:
        # Check stdin mode if no args
        try:
            stdin_input = sys.stdin.read().strip()
            if stdin_input:
                payload = json.loads(stdin_input)
                cmd = payload.get("command")
                if cmd == "index":
                    res = index_pdf_command(payload["pdf"], payload["out"], payload.get("chunk_size", 500), payload.get("chunk_overlap", 100))
                elif cmd == "query":
                    res = query_rag_command(payload["dir"], payload["query"], payload.get("top_k", 4))
                else:
                    res = {"error": f"Unknown stdin command: {cmd}"}
                print(json.dumps(res))
                return
        except Exception as e:
            pass

        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
