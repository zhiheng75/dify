"""Abstract interface for document loader implementations."""
from collections.abc import Iterator
from typing import Optional

from core.rag.extractor.blod.blod import Blob
from core.rag.extractor.extractor_base import BaseExtractor
from core.rag.models.document import Document
from extensions.ext_storage import storage
from collections import Counter

class PdfExtractor(BaseExtractor):
    """Load pdf files.


    Args:
        file_path: Path to the file to load.
    """

    def __init__(
            self,
            file_path: str,
            file_cache_key: Optional[str] = None
    ):
        """Initialize with file path."""
        self._file_path = file_path
        self._file_cache_key = file_cache_key

    def extract(self) -> list[Document]:
        plaintext_file_key = ''
        plaintext_file_exists = False
        if self._file_cache_key:
            try:
                text = storage.load(self._file_cache_key).decode('utf-8')
                plaintext_file_exists = True
                return [Document(page_content=text)]
            except FileNotFoundError:
                pass
        documents = list(self.load())
        text_list = []
        page_text_list = []
        all_text_counter = {}

        pages = len(documents)
        for document in documents:
            # text_list.append(document.page_content)
            page_all_texts = [txt.strip() for txt in document.page_content.strip().split("\n")]
            page_text_list.append(page_all_texts)
            line_counter = Counter(page_all_texts)
            filtered_lines = [line for line in set(page_all_texts) if line_counter[line] >= 2]
            for filtered_line in filtered_lines:
                if filtered_line in all_text_counter:
                    all_text_counter[filtered_line] = all_text_counter[filtered_line] + 1
                else:
                    all_text_counter[filtered_line] = 1


        watermark_txts = []
        for filtered_line in all_text_counter:

            page_count = all_text_counter[filtered_line]
            watermark = False
            if pages - page_count <= 2 and pages > 5:
                watermark = True
            elif pages == page_count:
                watermark = True
            if len(filtered_line) > 50:
                watermark = False

            if watermark:
                watermark_txts.append(filtered_line)
        watermark_txts_set = set(watermark_txts)

        final_text_list = []
        for text_list in page_text_list:
            filtered_lines = [line for line in text_list if line not in watermark_txts_set]
            final_text_list.append("\n".join(filtered_lines))

        text = "\n\n".join(final_text_list)

        # save plaintext file for caching
        if not plaintext_file_exists and plaintext_file_key:
            storage.save(plaintext_file_key, text.encode('utf-8'))

        if len(documents) == len(final_text_list):
            index = 0
            for document in documents:
                document.page_content = final_text_list[index]
                index = index + 1

        return documents

    def load(
            self,
    ) -> Iterator[Document]:
        """Lazy load given path as pages."""
        blob = Blob.from_path(self._file_path)
        yield from self.parse(blob)

    def parse(self, blob: Blob) -> Iterator[Document]:
        """Lazily parse the blob."""
        import pypdfium2

        with blob.as_bytes_io() as file_path:
            pdf_reader = pypdfium2.PdfDocument(file_path, autoclose=True)
            try:
                for page_number, page in enumerate(pdf_reader):
                    text_page = page.get_textpage()
                    content = text_page.get_text_range()
                    text_page.close()
                    page.close()
                    metadata = {"source": blob.source, "page": page_number}
                    yield Document(page_content=content, metadata=metadata)
            finally:
                pdf_reader.close()
