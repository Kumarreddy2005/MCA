import base64
from app.services.ocr_service import ocr_service

def test_text_ocr():
    r=ocr_service.extract(text_content='Water pipeline leakage near ward 4')
    assert r.success and 'pipeline' in r.extracted_text.lower()
