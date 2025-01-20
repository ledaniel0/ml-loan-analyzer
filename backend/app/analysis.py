from collections import defaultdict
from typing import List, Dict, Any

def analyze_transactions(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze the given transactions for insights & produce a loan decision."""

    total_income = 0.0
    total_expenses = 0.0
    recurring = defaultdict(float)

    for txn in transactions:
        total_income += txn["credit"]
        total_expenses += txn["debit"]

        # Group by description to find recurring transactions
        if txn["debit"] > 0:
            recurring[txn["description"]] += txn["debit"]

    # Sort recurring transactions by total amount
    recurring_sorted = sorted(recurring.items(), key=lambda x: x[1], reverse=True)

    # Very naive "ML" or rule-based logic:
    # We'll say if net income is > 0 and monthly ratio is healthy => Approve
    net_flow = total_income - total_expenses
    if net_flow > 500:  # arbitrary threshold
        decision = "Approved"
        reason = "Net positive cash flow indicates ability to repay loan."
    else:
        decision = "Denied"
        reason = "Insufficient net flow to cover loan repayments."

    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "recurring_expenses": recurring_sorted[:5],  # Top 5
        "loan_decision": {
            "decision": decision,
            "reason": reason
        }
    }