import logging
from typing import List

logger = logging.getLogger("embeddings")

class ChromaEmbeddingsWrapper:
    def __init__(self):
        import chromadb.utils.embedding_functions as ef
        self._fn = ef.DefaultEmbeddingFunction()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self._fn(texts)

    def embed_query(self, text: str) -> List[float]:
        return self._fn([text])[0]

class EmbeddingService:
    def __init__(self):
        self._langchain_embeddings = None
        self._local_fn = None
        try:
            self._local_fn = ChromaEmbeddingsWrapper()
            self._langchain_embeddings = self._local_fn
        except Exception as e:
            logger.warning(f"Embeddings init failed: {e}")

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if self._local_fn:
            try:
                return self._local_fn.embed_documents(texts)
            except Exception as e:
                logger.warning(f"Embedding failed: {e}")
        return [[0.0] * 384 for _ in texts]

    def embed_query(self, text: str) -> List[float]:
        return self.embed_texts([text])[0]

    def get_langchain_embeddings(self):
        return self._langchain_embeddings

    def is_available(self) -> bool:
        return self._langchain_embeddings is not None