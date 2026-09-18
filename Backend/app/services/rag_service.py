"""
Retrieval-Augmented Generation (RAG) Service for AI Sustainability Discovery.

Architecture:
- Loads sustainability knowledge base documents from `Backend/data/knowledge/`.
- Splits markdown documents into semantic chunks.
- Primary retrieval engine: Embedding-based vector similarity (sentence-transformers / FAISS).
- Fallback retrieval engine: TF-IDF cosine similarity (scipy / numpy).
- Caches index in memory for high-performance lazy initialization.
- Returns structured context with document source attribution and relevance scores.
"""

import os
import re
import math
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Base path to knowledge directory
KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "knowledge"

# Module-level cached knowledge base state
_KNOWLEDGE_CHUNKS: List[Dict[str, Any]] = []
_EMBEDDINGS_INDEX: Any = None
_VECTORIZER: Any = None
_TFIDF_MATRIX: Any = None
_RETRIEVAL_ENGINE: str = "uninitialized"


class KnowledgeChunk:
    def __init__(self, source: str, title: str, content: str):
        self.source = source
        self.title = title
        self.content = content

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source,
            "title": self.title,
            "content": self.content,
        }


def _load_and_chunk_documents() -> List[Dict[str, Any]]:
    """Reads all markdown files from KNOWLEDGE_DIR and splits them into chunks."""
    chunks: List[Dict[str, Any]] = []

    if not KNOWLEDGE_DIR.exists():
        logger.warning(f"Knowledge directory not found at {KNOWLEDGE_DIR}")
        return chunks

    for filepath in sorted(KNOWLEDGE_DIR.glob("*.md")):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                text = f.read()

            filename = filepath.name
            sections = re.split(r'\n(?=##?\s+)', text)

            for sec in sections:
                clean_sec = sec.strip()
                if not clean_sec:
                    continue

                lines = clean_sec.splitlines()
                first_line = lines[0].strip() if lines else ""

                if first_line.startswith("#"):
                    title = re.sub(r'^#+\s*', '', first_line)
                else:
                    title = filename.replace(".md", "").replace("-", " ").title()

                chunks.append({
                    "source": filename,
                    "title": title,
                    "content": clean_sec,
                })
        except Exception as e:
            logger.error(f"Error loading knowledge file {filepath}: {e}")

    logger.info(f"Loaded {len(chunks)} knowledge chunks from {KNOWLEDGE_DIR}")
    return chunks


def initialize_knowledge_base(force_rebuild: bool = False) -> bool:
    """
    Loads and indexes the sustainability knowledge base.
    Uses sentence-transformers if available, otherwise falls back to TF-IDF.
    """
    global _KNOWLEDGE_CHUNKS, _EMBEDDINGS_INDEX, _VECTORIZER, _TFIDF_MATRIX, _RETRIEVAL_ENGINE

    if _KNOWLEDGE_CHUNKS and not force_rebuild:
        return True

    _KNOWLEDGE_CHUNKS = _load_and_chunk_documents()
    if not _KNOWLEDGE_CHUNKS:
        _RETRIEVAL_ENGINE = "empty"
        return False

    texts = [f"{c['title']}\n{c['content']}" for c in _KNOWLEDGE_CHUNKS]

    # 1. Try sentence-transformers + FAISS / Cosine
    try:
        from sentence_transformers import SentenceTransformer
        import numpy as np

        logger.info("Initializing SentenceTransformer embedding engine (all-MiniLM-L6-v2)...")
        model = SentenceTransformer("all-MiniLM-L6-v2")
        embeddings = model.encode(texts, normalize_embeddings=True)

        try:
            import faiss
            index = faiss.IndexFlatIP(embeddings.shape[1])
            index.add(np.array(embeddings, dtype=np.float32))
            _EMBEDDINGS_INDEX = (model, index, "faiss")
            _RETRIEVAL_ENGINE = "sentence-transformers + faiss"
            logger.info("Vector retrieval initialized with FAISS.")
        except Exception:
            _EMBEDDINGS_INDEX = (model, np.array(embeddings, dtype=np.float32), "numpy")
            _RETRIEVAL_ENGINE = "sentence-transformers + numpy cosine"
            logger.info("Vector retrieval initialized with Numpy cosine similarity.")

        return True
    except Exception as exc:
        logger.warning(f"SentenceTransformer initialization failed ({exc}). Falling back to TF-IDF.")

    # 2. Fallback to TF-IDF + Cosine similarity using scikit-learn
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        vectorizer = TfidfVectorizer(stop_words="english")
        tfidf_matrix = vectorizer.fit_transform(texts)
        _VECTORIZER = vectorizer
        _TFIDF_MATRIX = tfidf_matrix
        _RETRIEVAL_ENGINE = "tfidf + cosine"
        logger.info("Knowledge base indexed using TF-IDF fallback.")
        return True
    except Exception as exc:
        logger.warning(f"Scikit-learn TF-IDF initialization failed ({exc}). Using custom keyword similarity.")

    # 3. Micro fallback if sklearn is absent
    _RETRIEVAL_ENGINE = "keyword + overlap"
    return True


def retrieve_context(query: str, top_k: int = 3) -> List[Dict[str, Any]]:
    """
    Retrieves top_k relevant knowledge chunks for a report query.
    Returns a list of dicts with keys: source, title, content, score.
    """
    global _KNOWLEDGE_CHUNKS, _EMBEDDINGS_INDEX, _VECTORIZER, _TFIDF_MATRIX, _RETRIEVAL_ENGINE

    if not _KNOWLEDGE_CHUNKS:
        initialize_knowledge_base()

    if not _KNOWLEDGE_CHUNKS:
        return []

    query_clean = query.strip()
    if not query_clean:
        return []

    # 1. Sentence Transformers Retrieval
    if _EMBEDDINGS_INDEX is not None:
        try:
            import numpy as np
            model, store, store_type = _EMBEDDINGS_INDEX
            query_embedding = model.encode([query_clean], normalize_embeddings=True)

            results: List[Dict[str, Any]] = []
            if store_type == "faiss":
                scores, indices = store.search(np.array(query_embedding, dtype=np.float32), top_k)
                for score, idx in zip(scores[0], indices[0]):
                    if idx < 0 or idx >= len(_KNOWLEDGE_CHUNKS):
                        continue
                    chunk = _KNOWLEDGE_CHUNKS[idx]
                    results.append({
                        "source": chunk["source"],
                        "title": chunk["title"],
                        "content": chunk["content"],
                        "score": float(max(0.0, min(1.0, round(float(score), 3)))),
                    })
            else:
                # Numpy inner product of unit vectors = cosine similarity
                similarities = np.dot(store, query_embedding.T).squeeze()
                top_indices = np.argsort(similarities)[::-1][:top_k]
                for idx in top_indices:
                    score = float(similarities[idx])
                    chunk = _KNOWLEDGE_CHUNKS[idx]
                    results.append({
                        "source": chunk["source"],
                        "title": chunk["title"],
                        "content": chunk["content"],
                        "score": float(max(0.0, min(1.0, round(score, 3)))),
                    })
            return results
        except Exception as exc:
            logger.error(f"Error in SentenceTransformer retrieval: {exc}")

    # 2. TF-IDF Cosine Retrieval
    if _VECTORIZER is not None and _TFIDF_MATRIX is not None:
        try:
            from sklearn.metrics.pairwise import cosine_similarity
            query_vec = _VECTORIZER.transform([query_clean])
            similarities = cosine_similarity(query_vec, _TFIDF_MATRIX).flatten()
            top_indices = similarities.argsort()[::-1][:top_k]

            results = []
            for idx in top_indices:
                score = float(similarities[idx])
                chunk = _KNOWLEDGE_CHUNKS[idx]
                results.append({
                    "source": chunk["source"],
                    "title": chunk["title"],
                    "content": chunk["content"],
                    "score": float(max(0.0, min(1.0, round(score, 3)))),
                })
            return results
        except Exception as exc:
            logger.error(f"Error in TF-IDF retrieval: {exc}")

    # 3. Simple Keyword Overlap Fallback
    query_words = set(re.findall(r'\w+', query_clean.lower())) - {"the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "is", "are"}
    scored_chunks = []
    for chunk in _KNOWLEDGE_CHUNKS:
        text = (chunk["title"] + " " + chunk["content"]).lower()
        chunk_words = set(re.findall(r'\w+', text))
        overlap = len(query_words.intersection(chunk_words))
        score = min(1.0, overlap / max(1, len(query_words)))
        scored_chunks.append((score, chunk))

    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    results = []
    for score, chunk in scored_chunks[:top_k]:
        results.append({
            "source": chunk["source"],
            "title": chunk["title"],
            "content": chunk["content"],
            "score": round(score, 3),
        })
    return results


def get_retrieval_engine_name() -> str:
    """Returns the active retrieval engine name for status inspection."""
    return _RETRIEVAL_ENGINE
