from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.group import Group
from app.schemas.balance import BalanceResponse, GroupBalancesResponse, SettlementSuggestion, GroupBalanceSummary
from app.api.auth import get_current_user
from app.services.balance_calculator import calculate_group_balances, get_settlement_suggestions
from app.models.expense import Balance

router = APIRouter()


@router.get("/summary")
async def get_balance_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_groups = db.query(Group).filter(Group.members.any(id=current_user.id)).all()
    
    total_owed = 0.0
    total_owing = 0.0
    
    for group in user_groups:
        balances = db.query(Balance).filter(Balance.group_id == group.id).all()
        total_owed += sum(b.amount for b in balances if b.creditor_id == current_user.id)
        total_owing += sum(b.amount for b in balances if b.debtor_id == current_user.id)
    
    return {
        "total_owed": total_owed,
        "total_owing": total_owing,
        "net_balance": total_owed - total_owing
    }

@router.get("", response_model=list[BalanceResponse])
async def get_all_balances(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_groups = db.query(Group).filter(Group.members.any(id=current_user.id)).all()
    all_balances = []
    for group in user_groups:
        balances = db.query(Balance).filter(Balance.group_id == group.id).all()
        all_balances.extend(balances)
    return all_balances

@router.get("/group/{group_id}", response_model=GroupBalancesResponse)
async def get_group_balances(
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
    
    calculate_group_balances(group_id, db)
    
    from app.models.expense import Balance
    balances = db.query(Balance).filter(Balance.group_id == group_id).all()
    
    settlements = get_settlement_suggestions(group_id, db)
    
    summary = []
    for member in group.members:
        total_owed = sum(b.amount for b in balances if b.creditor_id == member.id)
        total_owing = sum(b.amount for b in balances if b.debtor_id == member.id)
        net_balance = total_owed - total_owing
        
        summary.append(GroupBalanceSummary(
            user_id=member.id,
            total_owed=total_owed,
            total_owing=total_owing,
            net_balance=net_balance
        ))
    
    return GroupBalancesResponse(
        group_id=group_id,
        balances=balances,
        settlements=settlements,
        summary=summary
    )


@router.get("/group/{group_id}/settlements", response_model=list[SettlementSuggestion])
async def get_settlements(
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
    
    calculate_group_balances(group_id, db)
    settlements = get_settlement_suggestions(group_id, db)
    return settlements
