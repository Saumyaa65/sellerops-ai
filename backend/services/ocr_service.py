"""
OCR Service — wraps PaddleOCR for listing image text extraction.
PaddleOCR is an optional heavy dependency; we degrade gracefully if unavailable.
"""

from typing import List, Optional

from utils.logger import logger


class OCRService:
    def __init__(self) -> None:
        self._ocr = None
        self._available = False
        self._try_load()

    def _try_load(self) -> None:
        try:
            from paddleocr import PaddleOCR  # type: ignore

            self._ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
            self._available = True
            logger.info("PaddleOCR loaded successfully")
        except ImportError:
            logger.warning("PaddleOCR not available — OCR features will be skipped")

    @property
    def is_available(self) -> bool:
        return self._available

    def extract_text(self, image_path: str) -> Optional[List[str]]:
        """
        Extract text lines from an image file.
        Returns None if OCR is unavailable.
        """
        if not self._available or self._ocr is None:
            return None

        try:
            result = self._ocr.ocr(image_path, cls=True)
            lines = []
            for block in result or []:
                for line in block or []:
                    text = line[1][0] if line and len(line) > 1 else ""
                    if text:
                        lines.append(text)
            return lines
        except Exception as e:
            logger.error(f"OCR extraction failed for {image_path}: {e}")
            return None


ocr_service = OCRService()
