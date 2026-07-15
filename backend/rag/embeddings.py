import logging
from typing import List

logger = logging.getLogger("embeddings")

class SklearnEmbeddingsWrapper:
    def __init__(self, dim: int = 384):
        from sklearn.feature_extraction.text import HashingVectorizer
        self._vec = HashingVectorizer(n_features=dim, norm="l2")

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self._vec.transform(texts).toarray().tolist()

    def embed_query(self, text: str) -> List[float]:
        return self._vec.transform([text]).toarray()[0].tolist()

class EmbeddingService:
    def __init__(self):
        self._wrapped = None
        try:
            self._wrapped = SklearnEmbeddingsWrapper()
        except Exception as e:
            logger.warning(f"Embeddings init failed: {e}")

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if self._wrapped:
            try:
                return self._wrapped.embed_documents(texts)
            except Exception as e:
                logger.warning(f"Embedding failed: {e}")
        return [[0.0] * 384 for _ in texts]

    def embed_query(self, text: str) -> List[float]:
        return self.embed_texts([text])[0]

    def get_langchain_embeddings(self):
        return self._wrapped

    def is_available(self) -> bool:
        return self._wrapped is not None