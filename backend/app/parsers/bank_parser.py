import re
import json
from typing import Dict, List, Any


class BankStatementParser:
    def __init__(self, content: str):
        self.content = content
        self.header = {}
        self.transactions = []

    def parse(self) -> Dict[str, Any]:
        """Parse the bank statement into header and transactions."""
        print("Full Extracted Lines:")
        for i, line in enumerate(self.content.splitlines()):
            print(f"{i + 1}: {line}")

        self._parse_header()
        self._parse_transactions()
        return {
            "header": self.header,
            "transactions": self.transactions
        }

    def _parse_header(self):
        """Extract the header information."""
        lines = [line.strip() for line in self.content.splitlines() if line.strip()]

        # Initialize header fields
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
            if line.startswith("Date") and "Description" in line:
                break
            if line.lower().startswith("name:"):
                self.header["name"] = line.split(":", 1)[1].strip()
            elif line.lower().startswith("address:"):
                self.header["address"].append(line.split(":", 1)[1].strip())
            elif "address" not in line.lower() and "road" in line.lower():
                self.header["address"].append(line)
            elif line.lower().startswith("sort code:"):
                self.header["sort_code"] = line.split(":", 1)[1].strip()
            elif "account number:" in line.lower():
                self.header["account_number"] = line.split(":", 1)[1].strip()
            elif line.lower().startswith("iban:"):
                self.header["iban"] = line.split(":", 1)[1].strip()
            elif line.lower().startswith("statement period:"):
                self.header["statement_period"] = line.split(":", 1)[1].strip()
            elif line.startswith("Money In:"):
                amt = re.findall(r"Money In:\s*£([\d,\.]+)", line)
                if amt:
                    self.header["money_in"] = float(amt[0].replace(",", ""))
                start_bal = re.findall(r"Balance on .*?: £([\d,\.]+)", line)
                if start_bal:
                    self.header["starting_balance"] = float(start_bal[0].replace(",", ""))
            elif line.startswith("Money Out:"):
                amt = re.findall(r"Money Out:\s*£([\d,\.]+)", line)
                if amt:
                    self.header["money_out"] = float(amt[0].replace(",", ""))
                end_bal = re.findall(r"Balance on .*?:\s*£([\d,\.]+)", line)
                if end_bal:
                    self.header["ending_balance"] = float(end_bal[0].replace(",", ""))

    def _parse_transactions(self):
        """Extract transactions from the statement."""
        lines = [line.strip() for line in self.content.splitlines() if line.strip()]
        start_table = False

        transaction_regex = re.compile(
            r'^(\d{1,2}\s\w{3}\d{2})\s+(.+?)\s+([A-Z]{3}|[A-Z]{2,3})\s+'
            r'(?:([\d\.]+)\s+)?(?:([\d\.]+)\s+)?([\d\.]+)$'
        )

        for line in lines:
            if line.startswith("Date") and "Description" in line:
                start_table = True
                continue
            if not start_table:
                continue

            match = transaction_regex.match(line)
            if match:
                date_str = match.group(1)
                description = match.group(2).strip()
                txn_type = match.group(3)
                in_amount_str = match.group(4)
                out_amount_str = match.group(5)
                balance_str = match.group(6)

                in_amount = float(in_amount_str) if in_amount_str else 0.0
                out_amount = float(out_amount_str) if out_amount_str else 0.0
                balance = float(balance_str)

                self.transactions.append({
                    "date": date_str,
                    "description": description,
                    "type": txn_type,
                    "in": in_amount,
                    "out": out_amount,
                    "balance": balance,
                })


def process_statement(content: str) -> str:
    """Process a bank statement and return JSON."""
    parser = BankStatementParser(content)
    parsed_data = parser.parse()
    return json.dumps(parsed_data, indent=2)
