from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.models.expense import SplitMode

class ExpenseSplitBase(BaseModel):
    user_id: int
    amount: float
    percentage: Optional[float] = None

class ExpenseSplitCreate(ExpenseSplitBase):
    pass

class ExpenseSplitResponse(ExpenseSplitBase):
    id: int
    expense_id: int

    class Config:
        from_attributes = True

class ExpenseBase(BaseModel):
    amount: float
    description: str
    split_mode: SplitMode = SplitMode.EQUAL
    date: Optional[datetime] = None

class ExpenseCreate(ExpenseBase):
    group_id: int
    splits: Optional[List[ExpenseSplitCreate]] = None

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    split_mode: Optional[SplitMode] = None
    date: Optional[datetime] = None
    splits: Optional[List[ExpenseSplitCreate]] = None

class ExpenseResponse(ExpenseBase):
    id: int
    group_id: int
    payer_id: int
    group_name: str
    paid_by_name: str
    created_at: datetime
    splits: List[ExpenseSplitResponse]

    class Config:
        from_attributes = True

class NaturalLanguageExpense(BaseModel):
    text: str

class ParsedExpense(BaseModel):
    amount: float
    description: str
    participants: List[int]
    split_mode: SplitMode = SplitMode.EQUAL
