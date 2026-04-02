import json
import os
from typing import Any, Dict, List

import chromadb
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.messages import HumanMessage
from langchain_groq import ChatGroq
from langchain_text_splitters import RecursiveCharacterTextSplitter

_client = None
_collections = {}


def get_chroma_client():
    global _client
    if _client is None:
        _client = chromadb.Client()
    return _client


def create_document_collection(doc_id: str) -> str:
    client = get_chroma_client()
    collection_name = f"doc_{doc_id}".lower()
    collection = client.get_or_create_collection(
        name=collection_name, metadata={"hnsw:space": "cosine"}
    )
    _collections[doc_id] = collection
    return collection_name


def ingest_pdf(file_path: str, doc_id: str) -> Dict[str, Any]:
    loader = PyPDFLoader(file_path)
    documents = loader.load()

    create_document_collection(doc_id)
    collection = _collections[doc_id]

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500, chunk_overlap=100, separators=["\n\n", "\n", ". ", " ", ""]
    )

    all_concepts = {}
    chunk_id_counter = 0

    for page_idx, doc in enumerate(documents, start=1):
        page_text = doc.page_content
        chunks = splitter.split_text(page_text)

        page_concepts = _extract_concepts(page_text, page_idx)
        all_concepts[page_idx] = page_concepts

        for chunk_idx, chunk_text in enumerate(chunks):
            chunk_id = f"{doc_id}_page{page_idx}_chunk{chunk_idx}"

            metadata = {
                "page_number": page_idx,
                "chunk_index": chunk_idx,
                "text": chunk_text[:1000],
            }

            collection.add(ids=[chunk_id], documents=[chunk_text], metadatas=[metadata])
            chunk_id_counter += 1

    return {
        "doc_id": doc_id,
        "total_pages": len(documents),
        "concepts": all_concepts,
    }


def _extract_concepts(page_text: str, page_num: int) -> List[str]:
    if not os.getenv("GROQ_API_KEY"):
        return ["concept_1", "concept_2", "concept_3"]

    try:
        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0.5,
            max_tokens=100,
        )

        prompt = f"""Extract 3 key concepts or main ideas from this page of text.
Return them as a JSON list of strings.
Only return the JSON, no other text.

Page {page_num}:
{page_text[:800]}
"""

        response = llm.invoke([HumanMessage(content=prompt)])
        try:
            concepts = json.loads(response.content)
            if isinstance(concepts, list) and len(concepts) >= 3:
                return concepts[:3]
        except Exception:
            pass
    except Exception:
        pass

    return ["concept_1", "concept_2", "concept_3"]


def query_collection(
    doc_id: str, concept: str, num_results: int = 3
) -> List[Dict[str, Any]]:
    if doc_id not in _collections:
        return []

    collection = _collections[doc_id]
    try:
        results = collection.query(
            query_texts=[concept],
            n_results=num_results,
        )

        chunks = []
        if results and results["metadatas"]:
            for i, metadata_list in enumerate(results["metadatas"]):
                for metadata in metadata_list:
                    chunks.append(
                        {
                            "page_number": metadata.get("page_number", 1),
                            "chunk_index": metadata.get("chunk_index", 0),
                            "text": metadata.get("text", ""),
                        }
                    )
        return chunks
    except Exception as e:
        print(f"Query error: {e}")
        return []


def delete_collection(doc_id: str):
    client = get_chroma_client()
    if doc_id in _collections:
        client.delete_collection(name=f"doc_{doc_id}".lower())
        del _collections[doc_id]
