import os
from typing import List, Optional

class SentenceTransformerEmbeddings:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        from sentence_transformers import SentenceTransformer
        self._model = SentenceTransformer(model_name)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self._model.encode(texts).tolist()

    def embed_query(self, text: str) -> List[float]:
        return self._model.encode(text).tolist()

class EmbeddingService:
    def __init__(self):
        self._local_embeddings = None
        self._langchain_embeddings = None
        try:
            self._langchain_embeddings = SentenceTransformerEmbeddings()
            self._local_embeddings = self._langchain_embeddings
        except Exception:
            pass

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if self._local_embeddings:
            try:
                return self._local_embeddings.embed_documents(texts)
            except Exception:
                pass
        return [[0.0] * 384 for _ in texts]

    def embed_query(self, text: str) -> List[float]:
        return self.embed_texts([text])[0]

    def get_langchain_embeddings(self):
        return self._langchain_embeddings

    def is_available(self) -> bool:
        return self._langchain_embeddings is not None
