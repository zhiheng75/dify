from enum import Enum


class RetrievalMethod(Enum):
    SEMANTIC_SEARCH = 'semantic_search'
    FULL_TEXT_SEARCH = 'full_text_search'  # ES text search with segment
    HYBRID_SEARCH = 'hybrid_search'
    ES_TEXT_SEARCH = 'es_text_search'   # ES text search without segment

    @staticmethod
    def is_support_semantic_search(retrieval_method: str) -> bool:
        return retrieval_method in {RetrievalMethod.SEMANTIC_SEARCH.value, RetrievalMethod.HYBRID_SEARCH.value}

    @staticmethod
    def is_support_fulltext_search(retrieval_method: str) -> bool:
        return retrieval_method in {RetrievalMethod.FULL_TEXT_SEARCH.value, RetrievalMethod.HYBRID_SEARCH.value}
