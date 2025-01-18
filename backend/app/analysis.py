# Core logic for transaction analysis
def analyze_transactions(transactions):
    # Initialize totals
    total_income = 0
    total_expenses = 0
    recurring_expenses = {}

    for txn in transactions:
        if txn["amount"] > 0:
            total_income += txn["amount"]
        else:
            total_expenses += abs(txn["amount"])

        # Identify recurring transactions
        description = txn["description"]
        if description in recurring_expenses:
            recurring_expenses[description] += abs(txn["amount"])
        else:
            recurring_expenses[description] = abs(txn["amount"])

    # Sort recurring expenses by total amount
    sorted_recurring = sorted(recurring_expenses.items(), key=lambda x: x[1], reverse=True)

    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "recurring_expenses": sorted_recurring[:5]  # Top 5 recurring expenses
    }
