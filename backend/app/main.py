# FastAPI app and routes
from fastapi import FastAPI, UploadFile
from app.utils import process_pdf
from app.analysis import analyze_transactions

app = FastAPI()

@app.post("/upload-statement")
async def upload_statement(file: UploadFile):
    transactions = process_pdf(file)
    analysis = analyze_transactions(transactions)
    return {"transactions": transactions, "analysis": analysis}


@app.get("/")
def read_root():
    return {"message": "Hello, World!"}