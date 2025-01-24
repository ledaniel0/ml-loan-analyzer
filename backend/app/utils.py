import PyPDF2
from io import BytesIO
from app.parsers.bank_parser import BankStatementParser
from botocore.exceptions import ClientError
import json
import time
import logging
import boto3
from fastapi import HTTPException


def process_pdf(file):
    """Extract and parse the bank statement PDF."""
    try:
        pdf_reader = PyPDF2.PdfReader(BytesIO(file.file.read()))
        content = ""
        for page in pdf_reader.pages:
            text = page.extract_text()
            if text:
                content += text + "\n"

        # Parse with your custom parser
        parser = BankStatementParser(content)
        parsed_data = parser.parse()
        return parsed_data
    except Exception as e:
        print(f"Error processing PDF: {e}")
        raise e
    
def extract_text_from_pdf(pdf_bytes: bytes) -> str:
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

        max_retries = 5
        backoff_factor = 1  # in seconds

        for attempt in range(max_retries):
            try:
                response = bedrock.invoke_model(
                    modelId="arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0",
                    contentType="application/json",
                    accept="application/json",
                    body=json.dumps(payload),
                )
                # Process response as before
                raw_body = response["body"].read()
                response_body = json.loads(raw_body)
                analysis = response_body

                if (
                    isinstance(analysis, dict)
                    and "content" in analysis
                    and isinstance(analysis["content"], list)
                    and len(analysis["content"]) > 0
                    and analysis["content"][0].get("type") == "text"
                ):
                    content_text = analysis["content"][0]["text"]
                    try:
                        parsed_content = json.loads(content_text)
                        analysis = parsed_content
                    except json.JSONDecodeError:
                        logging.warning(f"Could not parse text content as JSON: {content_text}")
                else:
                    logging.warning("Response does not contain expected content structure.")

                return analysis

            except ClientError as e:
                error_code = e.response['Error']['Code']
                if error_code == 'ThrottlingException':
                    wait_time = backoff_factor * (2 ** attempt)
                    logging.warning(f"ThrottlingException encountered. Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    logging.error(f"Unexpected ClientError: {e}")
                    raise
        
        # If all retries fail
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later."
        )

    except Exception as e:
        logging.error(f"Error invoking Bedrock model: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing statement: {str(e)}")