import os
import fitz  # PyMuPDF
from io import BytesIO
from PyPDF2 import PdfReader, PdfWriter

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
OUTPUT_FOLDER = os.path.join(BASE_DIR, 'static')

def search_text_in_pdf(filename, term):
    pdf_path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(pdf_path):
        return None, "PDF file not found."

    doc = fitz.open(pdf_path)
    results = []

    for i, page in enumerate(doc):
        matches = page.search_for(term)
        if matches:
            results.append({
                "page": i + 1,
                "matches": len(matches)
            })

    doc.close()
    return results, None


def replace_text_in_memory(pdf_file, search_text, replace_text):
    pdf_bytes = pdf_file.read()
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    for page in doc:
        text_instances = page.search_for(search_text)
        for inst in text_instances:
            # Enlarge the rectangle a bit to ensure full coverage
            rect = fitz.Rect(
                inst.x0 - 1, inst.y0 - 1,
                inst.x1 + 1, inst.y1 + 1
            )
            page.add_redact_annot(rect, fill=(1, 1, 1))
        if text_instances:
            page.apply_redactions()
            for inst in text_instances:
                rect = fitz.Rect(
                    inst.x0 - 1, inst.y0 - 1,
                    inst.x1 + 1, inst.y1 + 1
                )
                page.insert_textbox(
                    rect, replace_text,
                    fontsize=12, color=(0, 0, 0), align=0
                )

    output_pdf = BytesIO()
    doc.save(output_pdf)
    doc.close()
    output_pdf.seek(0)
    return output_pdf

    return 'edited.pdf', None
