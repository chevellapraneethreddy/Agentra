# Knowledge manager module for organizing PDFs, website scrapings, and FAQs.
from typing import Dict, List, Any, Optional

class KnowledgeManager:
    """
    Manages document libraries (PDFs, docs), website scrapes, FAQs, and indexes chunks
    to support future Retrieval-Augmented Generation (RAG) vector pipelines.
    """
    def __init__(self):
        # Category registries: file_id -> metadata dictionary
        self._pdfs: Dict[str, Dict[str, Any]] = {}
        self._websites: Dict[str, Dict[str, Any]] = {}
        self._faqs: Dict[str, Dict[str, Any]] = {}
        
        # Indexed chunks registry: file_id -> List of text chunks
        self._indexed_chunks: Dict[str, List[str]] = {}

    def register_pdf(self, pdf_id: str, name: str, size_bytes: int, status: str = "indexed"):
        """
        Registers an uploaded PDF document.
        """
        self._pdfs[pdf_id] = {
            "name": name,
            "size": size_bytes,
            "status": status,
            "type": "pdf"
        }

    def register_website_content(self, page_id: str, url: str, scraped_text: str):
        """
        Registers scraped website page text content.
        """
        self._websites[page_id] = {
            "url": url,
            "text": scraped_text,
            "type": "web"
        }

    def register_faq(self, faq_id: str, question: str, answer: str):
        """
        Registers a customer FAQ question/answer pair.
        """
        self._faqs[faq_id] = {
            "question": question,
            "answer": answer,
            "type": "faq"
        }

    def add_document_chunks(self, doc_id: str, chunks: List[str]):
        """
        Adds text passages/chunks for semantic lookup.
        """
        if doc_id not in self._indexed_chunks:
            self._indexed_chunks[doc_id] = []
        self._indexed_chunks[doc_id].extend(chunks)

    def retrieve_relevant_contexts(self, query: str, limit: int = 3) -> List[str]:
        """
        Simulates RAG semantic retrieval.
        Finds overlapping passages across PDFs, scraped sites, and FAQs.
        """
        results = []
        q_words = set(query.lower().split())
        
        # 1. Search PDFs chunks
        for doc_id, passages in self._indexed_chunks.items():
            for p in passages:
                if any(w in p.lower() for w in q_words):
                    results.append(f"[Document Link] {p}")

        # 2. Search Website content
        for page_id, info in self._websites.items():
            text = info.get("text", "")
            if any(w in text.lower() for w in q_words):
                results.append(f"[Web Link] {text[:200]}...")

        # 3. Search FAQs
        for faq_id, info in self._faqs.items():
            q = info.get("question", "")
            a = info.get("answer", "")
            if any(w in q.lower() or w in a.lower() for w in q_words):
                results.append(f"[FAQ] Q: {q} - A: {a}")

        # Return matches up to limits, or fallback default documentation entries
        return results[:limit] if results else ["Default standard operating workflows placeholder context."]
Class = KnowledgeManager
