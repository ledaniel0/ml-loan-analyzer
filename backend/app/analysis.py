from collections import defaultdict
from typing import List, Dict, Any


def analyze_transactions(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze the given transactions for insights."""
    total_income = 0.0
    total_expenses = 0.0
    recurring = defaultdict(float)

    for txn in transactions:
        if txn["credit"] > 0:
            total_income += txn["credit"]
        if txn["debit"] > 0:
            total_expenses += txn["debit"]

        # Group by description to find recurring transactions
        recurring[txn["description"]] += txn["debit"]

    # Sort recurring transactions by total amount
    recurring_sorted = sorted(recurring.items(), key=lambda x: x[1], reverse=True)

    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "recurring_expenses": recurring_sorted[:5],  # Top 5 recurring expenses
    }
