import PyPDF2
from io import BytesIO
from app.parsers.bank_parser import BankStatementParser


def process_pdf(file):
    """Extract and parse the bank statement PDF."""
    try:
        pdf_reader = PyPDF2.PdfReader(BytesIO(file.file.read()))
        content = ""
        for page in pdf_reader.pages:
            text = page.extract_text()
            if text:
                content += text + "\n"

        # Parse with your custom parser
        parser = BankStatementParser(content)
        parsed_data = parser.parse()
        return parsed_data
    except Exception as e:
        print(f"Error processing PDF: {e}")
        raise e