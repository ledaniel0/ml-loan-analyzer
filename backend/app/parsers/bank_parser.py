import re
import json
from typing import Dict, Any, List

def _safe_float(value: str) -> float:
    """Convert a numeric string to float, handling commas or empty strings."""
    if not value or value.strip() == "":
        return 0.0
    return float(value.replace(",", ""))

class BankStatementParser:
    def __init__(self, content: str):
        self.content = content
        self.header = {}
        self.transactions = []

    def parse(self) -> Dict[str, Any]:
        """Parse the bank statement into header and transactions."""
        self._parse_header()
        self._parse_transactions()
        return {
            "header": self.header,
            "transactions": self.transactions
        }

    def _parse_header(self):
        """
        Very simple header extraction. 
        You might expand with more robust logic if statement formats vary.
        """
        lines = [line.strip() for line in self.content.splitlines() if line.strip()]

        self.header = {
            "name": "",
            "address": [],
            "sort_code": "",
            "account_number": "",
            "iban": "",
            "statement_period": "",
            "money_in": 0.0,
            "starting_balance": 0.0,
            "money_out": 0.0,
            "ending_balance": 0.0
        }

        for line in lines:
            # Look for lines with known markers
            line_lower = line.lower()
            if line_lower.startswith("name:"):
                self.header["name"] = line.split(":", 1)[1].strip()
            elif "sort code:" in line_lower:
                self.header["sort_code"] = line.split(":", 1)[1].strip()
            elif "account number:" in line_lower:
                self.header["account_number"] = line.split(":", 1)[1].strip()
            elif "iban:" in line_lower:
                self.header["iban"] = line.split(":", 1)[1].strip()
            elif line_lower.startswith("money in"):
                amt = re.findall(r"Money In:\s*£([\d,\.]+)", line, re.IGNORECASE)
                if amt:
                    self.header["money_in"] = _safe_float(amt[0])
                start_bal = re.findall(r"Balance on .*?: £([\d,\.]+)", line, re.IGNORECASE)
                if start_bal:
                    self.header["starting_balance"] = _safe_float(start_bal[0])
            elif line_lower.startswith("money out"):
                amt = re.findall(r"Money Out:\s*£([\d,\.]+)", line, re.IGNORECASE)
                if amt:
                    self.header["money_out"] = _safe_float(amt[0])
                end_bal = re.findall(r"Balance on .*?:\s*£([\d,\.]+)", line, re.IGNORECASE)
                if end_bal:
                    self.header["ending_balance"] = _safe_float(end_bal[0])
            # etc. for other header fields if needed

            # Address lines as a fallback example
            elif "road" in line_lower or "london" in line_lower:
                self.header["address"].append(line)

    def _parse_transactions(self):
        """
        Extract transactions from the statement based on the known columns:
        Date, Description, Type, In(£), Out(£), Balance(£).

        Example line from PDF text:
          04 Sep19   LNK COOPERATIVE SW CD 4821 08DEC19   CPT   300.00   873.56
          or if there's an Out(£) instead of In(£)
        """
        lines = [line.strip() for line in self.content.splitlines() if line.strip()]

        # We'll turn on parsing after we detect the "Date Description" header line
        start_table = False
        # Regex that:
        #  1) Captures date (e.g. '04 Sep19')
        #  2) Captures description (greedy until we hit two spaces)
        #  3) Captures type (CPT, TFR, DEB, FPI, etc.)
        #  4) Captures 'in' column (optional, may be empty)
        #  5) Captures 'out' column (optional, may be empty)
        #  6) Captures 'balance' column
        transaction_regex = re.compile(
            r'^(\d{1,2}\s\w{3}\d{2})\s{1,}(.+?)\s{2,}([A-Z]{2,4})\s+([\d,\.]*)\s+([\d,\.]*)\s+([\d,\.]+)$'
        )

        for line in lines:
            # Detect the header row "Date   Description ..."
            if line.startswith("Date") and "Description" in line:
                start_table = True
                continue

            if not start_table:
                continue

            match = transaction_regex.match(line)
            if match:
                date_str = match.group(1).strip()
                description = match.group(2).strip()
                txn_type = match.group(3).strip()
                in_amount_str = match.group(4).strip()
                out_amount_str = match.group(5).strip()
                balance_str = match.group(6).strip()

                # Convert to floats safely
                credit_amount = _safe_float(in_amount_str)
                debit_amount = _safe_float(out_amount_str)
                balance = _safe_float(balance_str)

                self.transactions.append({
                    "date": date_str,
                    "description": description,
                    "type": txn_type,
                    "credit": credit_amount,
                    "debit": debit_amount,
                    "balance": balance,
                })

def process_statement(content: str) -> str:
    """Process a bank statement text (extracted from PDF) and return JSON."""
    parser = BankStatementParser(content)
    parsed_data = parser.parse()
    return json.dumps(parsed_data, indent=2)
