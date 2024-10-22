"""Abstract interface for document loader implementations."""

from collections import Counter
from typing import Optional

from pymupdf import Pixmap

from core.rag.extractor.blob.blob import Blob
# from core.rag.extractor.blod.blod import Blob
from core.rag.extractor.extractor_base import BaseExtractor
from core.rag.models.document import Document
from extensions.ext_storage import storage


class MuPdfExtractor(BaseExtractor):
    """Parse PDF using PyMuPDF.


    Args:
        file_path: Path to the file to load.
    """

    def __init__(self, file_path: str, file_cache_key: Optional[str] = None):
        """Initialize with file path."""
        self._file_path = file_path
        self._file_cache_key = file_cache_key

    def extract(self) -> list[Document]:
        plaintext_file_key = ""
        plaintext_file_exists = False
        if self._file_cache_key:
            try:
                text = storage.load(self._file_cache_key).decode("utf-8")
                plaintext_file_exists = True
                return [Document(page_content=text)]
            except FileNotFoundError:
                pass

        import pymupdf

        watermark_line_threshold = 10
        blob = Blob.from_path(self._file_path)
        with blob.as_bytes_io() as file_path:
            doc = pymupdf.open(file_path)
            # iterate the document pages to create a list of all lines
            all_lines = []
            for page in doc:
                all_lines.extend(page.get_text().split("\n"))
            line_counter = Counter(all_lines)

            text_list = []
            document_list = []
            for page in doc:
                lines = page.get_text().split("\n")
                # Remove watermarks
                lines = [line for line in lines if line_counter[line] <= watermark_line_threshold and line.strip()]
                if not lines:
                    # If the page become empty after the watermark removal,
                    # try it again with image parsing
                    image_list = page.get_images(full=True)
                    for image in image_list:
                        pmap = Pixmap(doc, image[0])
                        imgpdf = pymupdf.open("pdf", pmap.pdfocr_tobytes(compress=False, language="chi_sim+eng"))
                        lines = imgpdf[0].get_text().split("\n")

                text_list.append("\n".join(lines))
                metadata = {"source": blob.source, "page": page.number}
                document_list.append(Document(page_content="\n".join(lines), metadata=metadata))
            text = "\n\n".join(text_list)

            # save plaintext file for caching
            if not plaintext_file_exists and plaintext_file_key:
                storage.save(plaintext_file_key, text.encode("utf-8"))

            return document_list
