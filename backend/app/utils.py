# Helper functions (e.g., PDF parsing)
import PyPDF2
from io import BytesIO
import re

def process_pdf(file):
    # Read the PDF content
    pdf_reader = PyPDF2.PdfReader(BytesIO(file.file.read()))
    content = ""
    for page in pdf_reader.pages:
        content += page.extract_text()

    # Parse the content into transactions
    transactions = parse_transactions(content)
    return transactions


def parse_transactions(content):
    # Example: Parse lines that match transaction patterns
    lines = content.split("\n")
    transactions = []
    transaction_pattern = re.compile(r"(\d{2} \w{3} \d{2})\s+(.+?)\s+(\d+\.\d{2})")
    
    for line in lines:
        match = transaction_pattern.search(line)
        if match:
            transactions.append({
                "date": match.group(1),
                "description": match.group(2),
                "amount": float(match.group(3))
            })

    return transactions