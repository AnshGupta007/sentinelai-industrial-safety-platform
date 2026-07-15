import os
from typing import List, Dict, Optional

from rag.embeddings import EmbeddingService
from rag.document_loader import load_all_documents, chunk_documents, load_documents_as_langchain

CHROMA_PERSIST_DIR = os.path.join(os.path.dirname(__file__), "..", "chroma_db")
COLLECTION_NAME = "sentinelai_rag"

class RAGRetriever:
    def __init__(self):
        self.embedder = EmbeddingService()
        self.collection = None
        self.vectorstore = None
        self.initialized = False

    def initialize(self) -> bool:
        try:
            import chromadb
            client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
            try:
                self.collection = client.get_collection(COLLECTION_NAME)
            except Exception:
                self.collection = client.create_collection(COLLECTION_NAME)
            lc_embeddings = self.embedder.get_langchain_embeddings()
            if lc_embeddings:
                try:
                    from langchain_community.vectorstores import Chroma
                    self.vectorstore = Chroma(
                        client=client,
                        collection_name=COLLECTION_NAME,
                        embedding_function=lc_embeddings,
                    )
                except ImportError:
                    pass
                except Exception:
                    pass
            self.initialized = True
            return True
        except Exception as e:
            print(f"ChromaDB init failed: {e}")
            return False

    def is_populated(self) -> bool:
        if not self.collection:
            return False
        try:
            return self.collection.count() > 0
        except Exception:
            return False

    def populate(self) -> int:
        if not self.collection:
            if not self.initialize():
                return 0
        lc_docs = load_documents_as_langchain()
        if lc_docs and self.vectorstore:
            try:
                self.vectorstore.add_documents(lc_docs)
                return len(lc_docs)
            except Exception:
                pass
        docs = load_all_documents()
        chunks = chunk_documents(docs)
        if not chunks:
            return 0
        existing_ids = set()
        try:
            existing = self.collection.get(limit=10000)
            existing_ids = set(existing["ids"]) if existing and "ids" in existing else set()
        except Exception:
            pass
        texts = []
        metadatas = []
        ids = []
        for i, c in enumerate(chunks):
            cid = f"{c['type']}_{c['source']}_{i}"
            if cid in existing_ids:
                continue
            texts.append(c["content"])
            meta = {"title": c["title"], "source": c["source"], "type": c.get("type", "regulation")}
            for k, v in c.get("metadata", {}).items():
                if k != "type":
                    meta[k] = str(v)
            metadatas.append(meta)
            ids.append(cid)
        if texts:
            embeddings = self.embedder.embed_texts(texts)
            self.collection.add(documents=texts, metadatas=metadatas, ids=ids, embeddings=embeddings)
        return len(texts)

    def retrieve(self, query: str, k: int = 5, filter_type: Optional[str] = None) -> List[Dict]:
        if self.vectorstore:
            try:
                filter_dict = {"type": filter_type} if filter_type else None
                results = self.vectorstore.similarity_search_with_score(query, k=k, filter=filter_dict)
                return [
                    {
                        "content": doc.page_content,
                        "metadata": doc.metadata,
                        "score": float(1.0 - score) if score else 0.5,
                    }
                    for doc, score in results
                ]
            except Exception as e:
                print(f"LangChain vectorstore query error: {e}")
        if not self.collection:
            return self._fallback(query, k)
        try:
            query_embedding = self.embedder.embed_query(query)
            where = {"type": filter_type} if filter_type else None
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=k,
                where=where,
            )
            if not results or not results["documents"] or not results["documents"][0]:
                return self._fallback(query, k)
            return [
                {
                    "content": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i] if results.get("metadatas") else {},
                    "score": results["distances"][0][i] if results.get("distances") else 0.0,
                }
                for i in range(len(results["documents"][0]))
            ]
        except Exception as e:
            print(f"ChromaDB query error: {e}")
            return self._fallback(query, k)

    def retrieve_incidents(self, query: str, k: int = 5) -> List[Dict]:
        return self.retrieve(query, k, filter_type="incident")

    def retrieve_regulations(self, query: str, k: int = 3) -> List[Dict]:
        return self.retrieve(query, k, filter_type="regulation")

    def as_langchain_retriever(self, search_kwargs: Optional[dict] = None):
        if self.vectorstore:
            kwargs = search_kwargs or {"k": 5}
            return self.vectorstore.as_retriever(search_kwargs=kwargs)
        return None

    def get_qa_chain(self):
        try:
            from langchain.chains import RetrievalQA
            from langchain.prompts import PromptTemplate
            lc_retriever = self.as_langchain_retriever(search_kwargs={"k": 8})
            if not lc_retriever:
                return None
            api_key = os.getenv("GROQ_API_KEY", "")
            if not api_key:
                return None
            from langchain.llms.base import LLM
            from groq import Groq
            class GroqLLM(LLM):
                model: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
                temperature: float = 0.1
                max_tokens: int = 1024
                _client: Groq = Groq(api_key=api_key)
                @property
                def _llm_type(self) -> str:
                    return "groq"
                def _call(self, prompt: str, stop=None, **kwargs) -> str:
                    resp = self._client.chat.completions.create(
                        model=self.model, messages=[{"role": "user", "content": prompt}],
                        temperature=self.temperature, max_tokens=self.max_tokens,
                    )
                    return resp.choices[0].message.content or ""
            llm = GroqLLM()
            template = """You are SentinelAI's industrial safety RAG assistant. Use the context to answer questions about incidents, regulations, and safety.

Context:
{context}

Question: {question}

Answer concisely based on the context. If the context lacks relevant information, state that."""
            PROMPT = PromptTemplate(template=template, input_variables=["context", "question"])
            return RetrievalQA.from_chain_type(
                llm=llm,
                chain_type="stuff",
                retriever=lc_retriever,
                chain_type_kwargs={"prompt": PROMPT},
                return_source_documents=True,
            )
        except ImportError:
            return None
        except Exception as e:
            print(f"QA chain creation failed: {e}")
            return None

    def _fallback(self, query: str, k: int) -> List[Dict]:
        try:
            from data.simulator import HISTORICAL_INCIDENTS, REGULATIONS as REGS
            lower = query.lower()
            matched = []
            for i in HISTORICAL_INCIDENTS:
                if lower in i["description"].lower() or lower in i["type"].lower() or lower in i["zone"].lower():
                    matched.append({
                        "content": f"{i['incident_id']}: {i['type']} at {i['plant']} ({i['date']}). {i['description']}",
                        "metadata": {"source": i["incident_id"], "type": "incident"},
                        "score": 0.5
                    })
            for r in REGS:
                if lower in r["title"].lower() or lower in r["content"].lower():
                    matched.append({
                        "content": f"{r['source']} §{r['section']}: {r['title']}\n{r['content']}",
                        "metadata": {"source": f"{r['source']} §{r['section']}", "type": "regulation"},
                        "score": 0.5
                    })
            return matched[:k]
        except Exception:
            return [{"content": "RAG system unavailable.", "metadata": {"source": "error", "type": "error"}, "score": 0.0}]

    def reset(self) -> bool:
        try:
            import chromadb
            client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
            try:
                client.delete_collection(COLLECTION_NAME)
            except Exception:
                pass
            self.collection = None
            self.vectorstore = None
            self.initialized = False
            return True
        except Exception:
            return False


retriever = RAGRetriever()
