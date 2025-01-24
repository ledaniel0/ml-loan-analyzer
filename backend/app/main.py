from typing import Dict, Any
import boto3
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import PyPDF2
from io import BytesIO
import logging
from app.utils import extract_text_from_pdf
from app.utils import analyze_statement_with_bedrock


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.DEBUG)

def get_bedrock_client():
    logging.debug("Initializing Bedrock client...")
    return boto3.client(
        service_name='bedrock-runtime',
        region_name='us-east-1'
    )

@app.post("/analyze-statement")
async def analyze_statement(file: UploadFile = File(...)) -> Dict[str, Any]:
    try:
        logging.info(f"Received file: {file.filename}")
        
        pdf_bytes = await file.read()
        text = extract_text_from_pdf(pdf_bytes)
        logging.info(f"Extracted text length: {len(text)}")
        
        logging.info("Sending text to Bedrock for analysis...")
        analysis = analyze_statement_with_bedrock(text)
        logging.info(f"Received analysis: {analysis}")
        
        return {
            "status": "success",
            "analysis": analysis
        }
        
    except HTTPException as he:
        logging.error(f"HTTP Exception: {str(he)}")
        raise he
    except Exception as e:
        logging.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
