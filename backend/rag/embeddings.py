import os
from typing import List, Optional

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

class EmbeddingService:
    def __init__(self):
        self.client = None
        self._langchain_embeddings = None
        if OPENAI_API_KEY:
            try:
                from openai import OpenAI
                self.client = OpenAI(api_key=OPENAI_API_KEY)
            except Exception:
                pass
            try:
                from langchain_openai import OpenAIEmbeddings
                self._langchain_embeddings = OpenAIEmbeddings(
                    model=EMBEDDING_MODEL,
                    openai_api_key=OPENAI_API_KEY,
                )
            except ImportError:
                pass
            except Exception:
                pass

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if self.client:
            try:
                response = self.client.embeddings.create(input=texts, model=EMBEDDING_MODEL)
                return [r.embedding for r in response.data]
            except Exception:
                pass
        return [[0.0] * 1536 for _ in texts]

    def embed_query(self, text: str) -> List[float]:
        return self.embed_texts([text])[0]

    def get_langchain_embeddings(self):
        return self._langchain_embeddings

    def is_available(self) -> bool:
        return self._langchain_embeddings is not None
