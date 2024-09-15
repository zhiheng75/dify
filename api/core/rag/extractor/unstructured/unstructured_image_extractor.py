import logging

from core.rag.extractor.extractor_base import BaseExtractor
from core.rag.models.document import Document

logger = logging.getLogger(__name__)


class UnstructuredImageExtractor(BaseExtractor):
    """Extract text data from image file.


    Args:
        file_path: Path to the image file to load.
    """

    def __init__(self, file_path: str, api_url: str):
        """Initialize with file path."""
        self._file_path = file_path
        self._api_url = api_url

    def extract(self) -> list[Document]:
        from unstructured.partition.image import partition_image

        elements = partition_image(
            filename=self._file_path, languages=["chi_sim", "eng"], strategy="auto", api_url=self._api_url
        )
        from unstructured.chunking.title import chunk_by_title

        chunks = chunk_by_title(elements, max_characters=2000, combine_text_under_n_chars=0)
        documents = []
        for chunk in chunks:
            text = chunk.text.strip()
            documents.append(Document(page_content=text))

        return documents


if __name__ == "__main__":
    extractor = UnstructuredImageExtractor(
        file_path="/Users/zhihengw/projects/testdata/image0.jpg",
        # file_path="/Users/zhihengw/projects/testdata/image1.png",
        api_url="http://localhost:8000",
    )
    documents = extractor.extract()
    print(documents)
    for document in documents:
        logger.info(f"Extracted document: {document}")
