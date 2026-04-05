from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.user import User
from app.models.group import Group, group_members
from app.models.expense import Expense, ExpenseSplit, Balance
from app.schemas.group import GroupCreate, GroupResponse, GroupUpdate, GroupMemberAdd
from app.api.auth import get_current_user

router = APIRouter()

@router.post("", response_model=GroupResponse)
async def create_group(
    group: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_group = Group(
        name=group.name,
        created_by=current_user.id
    )
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    
    db_group.members.append(current_user)
    db.commit()
    db.refresh(db_group)
    
    return db_group

@router.get("", response_model=List[GroupResponse])
async def get_user_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    groups = db.query(Group).filter(Group.members.any(id=current_user.id)).all()
    return groups

@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(
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
            detail="Group not found"
        )
    
    return group

@router.patch("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: int,
    group_update: GroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = db.query(Group).filter(
        Group.id == group_id,
        Group.created_by == current_user.id
    ).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or not authorized"
        )
    
    if group_update.name:
        group.name = group_update.name
    
    db.commit()
    db.refresh(group)
    return group

@router.delete("/{group_id}")
async def delete_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = db.query(Group).filter(
        Group.id == group_id,
        Group.created_by == current_user.id
    ).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or not authorized"
        )

    # Remove related records before deleting the group to avoid FK constraint errors.
    db.execute(group_members.delete().where(group_members.c.group_id == group_id))
    db.query(Balance).filter(Balance.group_id == group_id).delete(synchronize_session=False)
    expense_ids = [row.id for row in db.query(Expense.id).filter(Expense.group_id == group_id).all()]
    if expense_ids:
        db.query(ExpenseSplit).filter(ExpenseSplit.expense_id.in_(expense_ids)).delete(synchronize_session=False)
        db.query(Expense).filter(Expense.id.in_(expense_ids)).delete(synchronize_session=False)

    db.delete(group)
    db.commit()
    return {"message": "Group deleted successfully"}

@router.post("/{group_id}/members", response_model=GroupResponse)
async def add_group_member(
    group_id: int,
    member: GroupMemberAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = db.query(Group).filter(
        Group.id == group_id,
        Group.created_by == current_user.id
    ).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or not authorized"
        )
    
    new_member = db.query(User).filter(User.email == member.email).first()
    if not new_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if len(group.members) >= 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group cannot have more than 4 members"
        )
    
    if new_member in group.members:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this group"
        )
    
    group.members.append(new_member)
    db.commit()
    db.refresh(group)
    return group

@router.delete("/{group_id}/members/{user_id}", response_model=GroupResponse)
async def remove_group_member(
    group_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = db.query(Group).filter(
        Group.id == group_id,
        Group.created_by == current_user.id
    ).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or not authorized"
        )
    
    member_to_remove = db.query(User).filter(User.id == user_id).first()
    if not member_to_remove:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if member_to_remove not in group.members:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a member of this group"
        )
    
    if member_to_remove.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove group creator"
        )
    
    group.members.remove(member_to_remove)
    db.commit()
    db.refresh(group)
    return group
