from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.user import User
from app.models.group import Group
from app.models.expense import Expense, ExpenseSplit, SplitMode
from app.schemas.expense import (
    ExpenseCreate, ExpenseResponse, ExpenseUpdate,
    NaturalLanguageExpense, ParsedExpense
)
from app.api.auth import get_current_user
from app.services.ai_parser import parse_natural_language_expense
from app.services.balance_calculator import calculate_group_balances

router = APIRouter()
@router.get("", response_model=List[ExpenseResponse])
async def get_user_expenses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    expenses = db.query(Expense).join(Group).filter(
        Group.members.any(id=current_user.id)
    ).all()
    return expenses

@router.post("", response_model=ExpenseResponse)
async def create_expense(
    expense: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = db.query(Group).filter(
        Group.id == expense.group_id,
        Group.members.any(id=current_user.id)
    ).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or not authorized"
        )
    
    db_expense = Expense(
        group_id=expense.group_id,
        payer_id=current_user.id,
        amount=expense.amount,
        description=expense.description,
        split_mode=expense.split_mode,
        date=expense.date
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    
    if expense.split_mode == SplitMode.EQUAL:
        members = group.members
        split_amount = expense.amount / len(members)
        for member in members:
            split = ExpenseSplit(
                expense_id=db_expense.id,
                user_id=member.id,
                amount=split_amount,
                percentage=100 / len(members)
            )
            db.add(split)
    elif expense.splits:
        for split_data in expense.splits:
            split = ExpenseSplit(
                expense_id=db_expense.id,
                user_id=split_data.user_id,
                amount=split_data.amount,
                percentage=split_data.percentage
            )
            db.add(split)
    
    db.commit()
    calculate_group_balances(expense.group_id, db)
    db.refresh(db_expense)
    return db_expense

@router.get("/group/{group_id}", response_model=List[ExpenseResponse])
async def get_group_expenses(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = db.query(Group).filter(
        Group.id == group_id,
        Group.members.any(id=current_user.id)
    ).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or not authorized"
        )
    
    expenses = db.query(Expense).filter(Expense.group_id == group_id).all()
    return expenses

@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    group = db.query(Group).filter(
        Group.id == expense.group_id,
        Group.members.any(id=current_user.id)
    ).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this expense"
        )
    
    return expense

@router.patch("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: int,
    expense_update: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    group = db.query(Group).filter(
        Group.id == expense.group_id,
        Group.members.any(id=current_user.id)
    ).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this expense"
        )
    
    if expense_update.amount:
        expense.amount = expense_update.amount
    if expense_update.description:
        expense.description = expense_update.description
    if expense_update.split_mode:
        expense.split_mode = expense_update.split_mode
    if expense_update.date:
        expense.date = expense_update.date
    
    if expense_update.splits:
        db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense_id).delete()
        for split_data in expense_update.splits:
            split = ExpenseSplit(
                expense_id=expense_id,
                user_id=split_data.user_id,
                amount=split_data.amount,
                percentage=split_data.percentage
            )
            db.add(split)
    
    db.commit()
    calculate_group_balances(expense.group_id, db)
    db.refresh(expense)
    return expense

@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    group = db.query(Group).filter(
        Group.id == expense.group_id,
        Group.members.any(id=current_user.id)
    ).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this expense"
        )
    
    db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense_id).delete()
    db.delete(expense)
    db.commit()
    calculate_group_balances(expense.group_id, db)
    return {"message": "Expense deleted successfully"}

@router.post("/parse-natural-language", response_model=ParsedExpense)
async def parse_expense_text(
    expense_data: NaturalLanguageExpense,
    current_user: User = Depends(get_current_user)
):
    try:
        parsed_expense = await parse_natural_language_expense(expense_data.text)
        return parsed_expense
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse natural language: {str(e)}"
        )
