from fastapi import FastAPI, HTTPException, UploadFile, File
from typing import Any, Dict, List
from .analysis import analyze_transactions
from .utils import process_pdf
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .models import Transaction
import PyPDF2
from io import BytesIO
import re
from typing import List, Dict, Any
from datetime import datetime
from pydantic import ValidationError


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_transactions_from_json(raw_data: Dict[str, Any]) -> List[Transaction]:
    """
    Takes the entire JSON (with accountInfo, transactions, bankDetails, etc.)
    and returns a list of Transaction objects.
    """
    raw_transactions = raw_data.get("transactions", [])
    transformed = []

    for item in raw_transactions:
        # For type, you could try to parse the `particulars` or just assign a default.
        txn_type = "IMPS" if "IMPS" in (item.get("particulars") or "") else "UNK"

        # If 'credit' or 'debit' is None, treat them as 0
        credit_value = item.get("credit") or 0.0
        debit_value = item.get("debit") or 0.0

        # Create a dictionary matching the Transaction model
        txn_data = {
            "date": item.get("date", ""),
            "description": item.get("particulars", ""),
            "type": txn_type,
            "credit": credit_value,
            "debit": debit_value,
            "balance": item.get("balance") or 0.0
        }

        # Validate and convert to Transaction using Pydantic
        txn_obj = Transaction(**txn_data)
        transformed.append(txn_obj)

    return transformed

@app.post("/analyze-transactions")
def analyze_transactions(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyzes user-reviewed transactions and returns financial insights.
    """
    try:
        total_income = sum(txn["credit"] for txn in transactions if txn["credit"])
        total_expenses = sum(txn["debit"] for txn in transactions if txn["debit"])
        net_flow = total_income - total_expenses

        recommendation = "Approved" if net_flow > 500 else "Denied"
        return {
            "transactions": transactions,
            "analysis": {
                "total_income": total_income,
                "total_expenses": total_expenses,
                "net_flow": net_flow,
                "recommendation": recommendation,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
def parse_pdf_to_transactions(pdf_bytes: bytes) -> List[Transaction]:
    """Parse PDF bank statement to transaction list"""
    try:
        reader = PyPDF2.PdfReader(BytesIO(pdf_bytes))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        
        return parse_transactions(text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing PDF: {str(e)}")

def parse_transactions(text: str) -> List[Transaction]:
    """
    Parse bank statement text into transactions, with specific handling for Commonwealth Bank format
    while maintaining flexibility for other formats.
    """
    transactions = []
    lines = text.strip().split('\n')
    current_date = None
    
    # Skip to transaction section (after header)
    start_idx = 0
    for i, line in enumerate(lines):
        if 'Date' in line and 'Transaction' in line and 'Balance' in line:
            start_idx = i + 1
            break
    
    for line in lines[start_idx:]:
        # Skip empty lines and summary lines
        if not line.strip() or any(x in line for x in ['OPENING BALANCE', 'CLOSING BALANCE']):
            continue
            
        try:
            # Date parsing - look for both full dates and short dates
            date_match = re.search(r'(\d{2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))', line)
            
            if date_match:
                current_date = date_match.group(1)
                # Remove date from line for further processing
                line = line[date_match.end():].strip()
            elif not current_date:
                continue
                
            # Amount extraction - look for amounts at the end of the line
            amounts = re.findall(r'(\d+,?\d*\.\d{2})', line)
            if not amounts:
                continue
                
            # Convert amounts to float
            amounts = [float(amt.replace(',', '')) for amt in amounts]
            
            # Description is everything between date and amounts
            description = line
            for amt in amounts:
                description = description.replace(str(amt), '').strip()
            description = re.sub(r'\s+', ' ', description).strip()
            
            # Determine credit/debit/balance
            credit = 0.0
            debit = 0.0
            balance = amounts[-1]  # Last amount is typically the balance
            
            # If there are multiple amounts, determine credit/debit
            if len(amounts) > 1:
                transaction_amount = amounts[0]
                # Check for credit indicators
                if any(indicator in line.upper() for indicator in ['CR', 'CREDIT', 'DEPOSIT']):
                    credit = transaction_amount
                else:
                    debit = transaction_amount
            
            # Determine transaction type
            tx_type = 'OTHER'
            type_indicators = {
                'BPAY': ['BPAY'],
                'DIRECT_DEBIT': ['DIRECT DEBIT'],
                'DIRECT_CREDIT': ['DIRECT CREDIT'],
                'TRANSFER': ['TRANSFER TO', 'TRANSFER FROM'],
                'FEE': ['FEE', 'CHARGE'],
                'APP': ['COMMBANK APP', 'NETBANK']
            }
            
            for type_name, indicators in type_indicators.items():
                if any(indicator in description.upper() for indicator in indicators):
                    tx_type = type_name
                    break
            
            # Create transaction object
            try:
                # Convert date to standard format (assuming year from statement)
                date_obj = datetime.strptime(current_date, '%d %b')
                date_str = f"2017-{date_obj.strftime('%m-%d')}"  # Using 2017 from the statement
                
                transaction = Transaction(
                    date=date_str,
                    description=description,
                    type=tx_type,
                    credit=credit,
                    debit=debit,
                    balance=balance
                )
                transactions.append(transaction)
                
            except ValidationError as e:
                print(f"Validation error for line: {line}, Error: {str(e)}")
                continue
                
        except Exception as e:
            print(f"Error parsing line: {line}, Error: {str(e)}")
            continue
    
    return transactions

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)) -> Dict[str, Any]:
    try:
        pdf_bytes = await file.read()
        # Add debug print for raw text
        reader = PyPDF2.PdfReader(BytesIO(pdf_bytes))
        raw_text = ""
        for page in reader.pages:
            raw_text += page.extract_text() + "\n"
        print("Raw text extracted from PDF:")
        print(raw_text)
        
        transactions = parse_pdf_to_transactions(pdf_bytes)
        print("Number of transactions found:", len(transactions))
        if transactions:
            print("First transaction:", transactions[0].dict())
        return {"status": "success", "transactions": transactions}
    except Exception as e:
        print(f"Error in upload_pdf: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
def extract_transactions_from_text(raw_text: str) -> List[Dict[str, Any]]:
    """
    Process raw PDF text and extract transactions.
    Tries to guess fields based on patterns and common table structures.
    """
    transactions = []
    lines = raw_text.splitlines()

    # Simple heuristic to find the header (first line with "Date" or similar)
    header_line = None
    for i, line in enumerate(lines):
        if any(hint in line.lower() for hint in ["date", "credit", "debit", "balance"]):
            header_line = line.lower()
            lines = lines[i + 1 :]  # Skip header
            break

    if not header_line:
        raise ValueError("Unable to detect table header in PDF.")

    # Map header columns to standard fields
    header_map = map_headers(header_line)

    # Process each remaining line as a transaction row
    for line in lines:
        row = line.split()
        if len(row) < len(header_map):  # Skip incomplete rows
            continue

        try:
            transaction = {
                "date": row[header_map["date"]],
                "description": " ".join(row[header_map["description"] : header_map["credit"]]),
                "type": "UNK",  # Optional field for transaction type
                "credit": float(row[header_map["credit"]]) if "credit" in header_map else 0.0,
                "debit": float(row[header_map["debit"]]) if "debit" in header_map else 0.0,
                "balance": float(row[header_map["balance"]]) if "balance" in header_map else 0.0,
            }
            transactions.append(transaction)
        except (ValueError, IndexError):
            # Skip rows that don't match the expected format
            continue

    return transactions


def map_headers(header_line: str) -> Dict[str, int]:
    """
    Maps column names in the header line to standard transaction fields.
    """
    fields = header_line.split()
    header_map = {}
    for idx, field in enumerate(fields):
        field = field.lower()
        if "date" in field:
            header_map["date"] = idx
        elif "desc" in field or "particular" in field:
            header_map["description"] = idx
        elif "credit" in field or "deposit" in field:
            header_map["credit"] = idx
        elif "debit" in field or "withdrawal" in field:
            header_map["debit"] = idx
        elif "balance" in field:
            header_map["balance"] = idx

    # Ensure all required fields are mapped; fallback to safe guesses
    header_map.setdefault("date", 0)
    header_map.setdefault("description", 1)
    header_map.setdefault("credit", 2)
    header_map.setdefault("debit", 3)
    header_map.setdefault("balance", 4)
    return header_map