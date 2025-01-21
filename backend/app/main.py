from typing import Dict, Any
import boto3
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import PyPDF2
from io import BytesIO
import json
import logging

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.DEBUG)

def get_bedrock_client():
    logging.debug("Initializing Bedrock client...")
    return boto3.client(
        service_name='bedrock-runtime',
        region_name='us-east-1'  # Update if needed
    )

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text content from PDF"""
    try:
        reader = PyPDF2.PdfReader(BytesIO(pdf_bytes))
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

def analyze_statement_with_bedrock(text: str) -> dict:
    """Analyze bank statement using the Anthropic Claude model in AWS Bedrock."""
    try:
        bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")

        payload = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "You are a loan officer analyzing bank statements. "
                                "Please analyze the following text and return ONLY valid JSON with the following structure:\n"
                                "{\n"
                                '  "income_analysis": {\n'
                                '    "total_income": number,\n'
                                '    "income_stability": string\n'
                                "  },\n"
                                '  "expense_analysis": {\n'
                                '    "total_expenses": number\n'
                                "  },\n"
                                '  "key_metrics": {\n'
                                '    "net_flow": number\n'
                                "  },\n"
                                '  "decision": string,\n'
                                '  "confidence_score": number\n'
                                "}\n\n"
                                f"Bank statement: {text}"
                            )
                        }
                    ]
                }
            ]
        }

        response = bedrock.invoke_model(
            modelId="arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0",
            contentType="application/json",
            accept="application/json",
            body=json.dumps(payload),
        )

        raw_body = response["body"].read()
        logging.debug(f"Raw response body bytes: {raw_body}")
        response_body = json.loads(raw_body)
        logging.debug(f"Parsed response body: {response_body}")

        # Fallback if "completion" key isn't present
        analysis = response_body

        # Check if content exists and is a list with at least one item of type text
        if (
            isinstance(analysis, dict)
            and "content" in analysis
            and isinstance(analysis["content"], list)
            and len(analysis["content"]) > 0
            and analysis["content"][0].get("type") == "text"
        ):
            content_text = analysis["content"][0]["text"]
            try:
                # Parse the JSON inside the text field
                parsed_content = json.loads(content_text)
                analysis = parsed_content
            except json.JSONDecodeError:
                logging.warning(f"Could not parse text content as JSON: {content_text}")
                # If parsing fails, keep the original analysis with raw content
        else:
            logging.warning("Response does not contain expected content structure.")

        logging.debug(f"Final parsed analysis: {analysis}")
        return analysis

    except Exception as e:
        logging.error(f"Error invoking Bedrock model: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing statement: {str(e)}")

@app.post("/analyze-statement")
async def analyze_statement(file: UploadFile = File(...)) -> Dict[str, Any]:
    try:
        logging.info(f"Received file: {file.filename}")
        
        # Read and extract text from PDF
        pdf_bytes = await file.read()
        text = extract_text_from_pdf(pdf_bytes)
        logging.info(f"Extracted text length: {len(text)}")
        
        # Get analysis from Bedrock
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
    """Health check endpoint"""
    return {"status": "healthy"}
