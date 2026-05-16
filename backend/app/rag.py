"""
RAG corpus ingestion — reads Markdown course materials, chunks them,
and stores embeddings in ChromaDB with metadata.
"""
import os
import re
import glob
import logging
from pathlib import Path

import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_text_splitters import RecursiveCharacterTextSplitter

logger = logging.getLogger(__name__)

# Paths — use DATA_DIR env var (set by Docker volume mount) or fallback to local layout
_DATA_ROOT = Path(os.environ.get("DATA_DIR", Path(__file__).resolve().parents[2] / "data"))
DATA_DIR = _DATA_ROOT / "rag_corpus"
CHROMA_DIR = _DATA_ROOT / "chroma_db"


def _extract_week_number(filename: str) -> str:
    """Extract week number from filename like '第3周PPT-...'."""
    match = re.search(r"第(\d+)周", filename)
    return f"Week{match.group(1)}" if match else "General"


def _extract_topic_code(filename: str) -> str:
    """Extract topic code from filenames like 'B1_AI发展简史.md'."""
    match = re.match(r"^([A-Z]\d+)", filename)
    return match.group(1) if match else ""


def _classify_doc_type(filename: str) -> str:
    """Classify document type from filename."""
    if "PPT" in filename:
        return "slide"
    elif "讲稿" in filename or "_" in filename[:3]:
        return "lecture_script"
    elif "大纲" in filename or "教学" in filename:
        return "syllabus"
    elif "申报" in filename or "申请" in filename:
        return "application"
    elif "OBE" in filename or "矩阵" in filename:
        return "obe_matrix"
    else:
        return "document"


def load_and_chunk_documents(corpus_dir: Path | None = None) -> list[dict]:
    """
    Load all .md files from corpus_dir, split into chunks with metadata.
    Returns list of {"text": ..., "metadata": {...}} dicts.
    """
    if corpus_dir is None:
        corpus_dir = DATA_DIR

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n## ", "\n### ", "\n#### ", "\n\n", "\n", "。", "；", " "],
    )

    documents = []
    md_files = sorted(glob.glob(str(corpus_dir / "**" / "*.md"), recursive=True))

    if not md_files:
        logger.warning(f"No .md files found in {corpus_dir}")
        return []

    for filepath in md_files:
        filename = os.path.basename(filepath)
        rel_path = os.path.relpath(filepath, corpus_dir)

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as e:
            logger.warning(f"Failed to read {filepath}: {e}")
            continue

        # Skip very short files
        if len(content.strip()) < 100:
            continue

        week = _extract_week_number(filename)
        topic_code = _extract_topic_code(filename)
        doc_type = _classify_doc_type(filename)

        chunks = splitter.split_text(content)

        for i, chunk_text in enumerate(chunks):
            documents.append({
                "text": chunk_text,
                "metadata": {
                    "source": rel_path,
                    "filename": filename,
                    "week": week,
                    "topic_code": topic_code,
                    "doc_type": doc_type,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                },
            })

    logger.info(f"Loaded {len(documents)} chunks from {len(md_files)} files")
    return documents


def build_vector_store(documents: list[dict] | None = None, force_rebuild: bool = False):
    """
    Build or load ChromaDB collection from chunked documents.
    """
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)

    client = chromadb.PersistentClient(
        path=str(CHROMA_DIR),
        settings=ChromaSettings(anonymized_telemetry=False),
    )

    collection_name = "course_materials"

    # Check if collection already exists and has data
    try:
        collection = client.get_collection(collection_name)
        if collection.count() > 0 and not force_rebuild:
            logger.info(f"Collection '{collection_name}' already exists with {collection.count()} items")
            return collection
        if force_rebuild:
            client.delete_collection(collection_name)
    except Exception:
        pass

    # Create fresh collection
    collection = client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )

    if documents is None:
        documents = load_and_chunk_documents()

    if not documents:
        logger.warning("No documents to index")
        return collection

    # Batch insert (ChromaDB handles embedding internally with default model)
    batch_size = 100
    for i in range(0, len(documents), batch_size):
        batch = documents[i : i + batch_size]
        collection.add(
            ids=[f"doc_{i+j}" for j in range(len(batch))],
            documents=[d["text"] for d in batch],
            metadatas=[d["metadata"] for d in batch],
        )
        logger.info(f"Indexed batch {i // batch_size + 1} ({len(batch)} chunks)")

    logger.info(f"Vector store built: {collection.count()} total chunks")
    return collection


def query_vector_store(query: str, top_k: int = 5, where: dict | None = None):
    """
    Query the ChromaDB collection. Returns list of (text, metadata, distance).
    """
    client = chromadb.PersistentClient(
        path=str(CHROMA_DIR),
        settings=ChromaSettings(anonymized_telemetry=False),
    )

    try:
        collection = client.get_collection("course_materials")
    except Exception:
        logger.error("Collection 'course_materials' not found. Run ingest first.")
        return []

    kwargs = {"query_texts": [query], "n_results": top_k}
    if where:
        kwargs["where"] = where

    results = collection.query(**kwargs)

    output = []
    if results and results["documents"]:
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            output.append({"text": doc, "metadata": meta, "distance": dist})

    return output


# ── CLI entry point ──
if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO)

    if "--rebuild" in sys.argv:
        print("Force rebuilding vector store...")
        docs = load_and_chunk_documents()
        build_vector_store(docs, force_rebuild=True)
    else:
        build_vector_store()

    # Quick test query
    results = query_vector_store("什么是CRISPE框架", top_k=3)
    print(f"\nTest query results ({len(results)} hits):")
    for r in results:
        print(f"  [{r['metadata']['week']}] {r['metadata']['filename']} (dist={r['distance']:.3f})")
        print(f"  {r['text'][:120]}...")
        print()
