"""OCR/text extraction for digital PDFs and scanned images/PDFs."""
import base64, io, re
from typing import Any
from app.schemas.ai import OCRResponse

class OCRService:
    def extract(self, file_base64: str | None = None, mime_type: str = "application/pdf", text_content: str | None = None) -> OCRResponse:
        if text_content:
            text=text_content.strip()
            return OCRResponse(success=True, extracted_text=text, confidence=0.98 if text else 0.0,
                is_low_confidence=not bool(text), page_count=1, language=self._language(text), metadata={"source":"text"})
        if not file_base64:
            return OCRResponse(success=False, extracted_text="", confidence=0.0, is_low_confidence=True, page_count=0, language="en", metadata={"error":"No input"})
        try:
            raw=base64.b64decode(file_base64)
            if mime_type == "application/pdf" or raw[:4] == b"%PDF":
                return self._pdf(raw)
            return self._image(raw, mime_type)
        except Exception as exc:
            return OCRResponse(success=False, extracted_text="", confidence=0.0, is_low_confidence=True, page_count=0, language="en", metadata={"error":str(exc)})

    def _pdf(self, raw: bytes) -> OCRResponse:
        import fitz
        doc=fitz.open(stream=raw, filetype="pdf")
        chunks=[]; used_ocr=False; confidences=[]
        for page in doc:
            txt=page.get_text("text").strip()
            if txt:
                chunks.append(txt); confidences.append(0.98); continue
            used_ocr=True
            pix=page.get_pixmap(matrix=fitz.Matrix(1.6,1.6), alpha=False)
            result=self._ocr_bytes(pix.tobytes("png"), "image/png")
            chunks.append(result[0]); confidences.append(result[1])
        text="\n\n".join(c for c in chunks if c).strip()
        conf=sum(confidences)/len(confidences) if confidences else 0.0
        return OCRResponse(success=True, extracted_text=text, confidence=round(conf,3), is_low_confidence=conf<0.65,
            page_count=len(doc), language=self._language(text), metadata={"source":"pdf","used_ocr":used_ocr})

    def _image(self, raw: bytes, mime_type: str) -> OCRResponse:
        text,conf=self._ocr_bytes(raw,mime_type)
        return OCRResponse(success=True, extracted_text=text, confidence=round(conf,3), is_low_confidence=conf<0.65,
            page_count=1, language=self._language(text), metadata={"source":"image","ocr_engine":"tesseract"})

    @staticmethod
    def _ocr_bytes(raw: bytes, mime_type: str):
        from PIL import Image, ImageOps
        import pytesseract
        img=Image.open(io.BytesIO(raw)).convert("RGB")
        img=ImageOps.grayscale(img)
        data=pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT, config="--psm 6")
        words=[]; scores=[]
        for w,c in zip(data.get("text",[]),data.get("conf",[])):
            w=w.strip()
            try: score=float(c)/100
            except Exception: score=0
            if w and score>0:
                words.append(w); scores.append(score)
        text=" ".join(words).strip()
        return text, (sum(scores)/len(scores) if scores else 0.0)

    @staticmethod
    def _language(text:str)->str:
        if not text: return "en"
        kannada=len(re.findall(r"[\u0C80-\u0CFF]",text)); latin=len(re.findall(r"[A-Za-z]",text))
        return "kn" if kannada>latin else ("mixed" if kannada and latin else "en")

ocr_service = OCRService()
