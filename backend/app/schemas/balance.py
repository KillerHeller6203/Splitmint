from pydantic import BaseModel
from typing import List
from datetime import datetime

class BalanceResponse(BaseModel):
    id: int
    group_id: int
    debtor_id: int
    creditor_id: int
    user_name: str
    owes_to_name: str
    amount: float
    created_at: datetime

    class Config:
        from_attributes = True

class SettlementSuggestion(BaseModel):
    debtor_id: int
    creditor_id: int
    amount: float

class GroupBalanceSummary(BaseModel):
    user_id: int
    total_owed: float
    total_owing: float
    net_balance: float

class GroupBalancesResponse(BaseModel):
    group_id: int
    balances: List[BalanceResponse]
    settlements: List[SettlementSuggestion]
    summary: List[GroupBalanceSummary]
