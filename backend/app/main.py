from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from app.analysis import analyze_transactions
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Replace with your frontend's URL
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all HTTP headers
)

class Transaction(BaseModel):
    transaction_date: str
    value_date: str
    description: str
    debit: float
    credit: float
    balance: float

@app.post("/analyze-transactions")
async def analyze(transactions: List[Transaction]):
    try:
        # Debug: Log the incoming transactions
        print("Received Transactions:", transactions)

        transactions_data = [txn.dict() for txn in transactions]
        analysis = analyze_transactions(transactions_data)
        return {"transactions": transactions_data, "analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

