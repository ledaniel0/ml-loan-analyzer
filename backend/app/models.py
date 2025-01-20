# Pydantic models for API
from pydantic import BaseModel, ConfigDict

class Transaction(BaseModel):
    date: str
    description: str
    type: str
    credit: float
    debit: float
    balance: float
    model_config = ConfigDict(extra='ignore')