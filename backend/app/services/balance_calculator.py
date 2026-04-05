from sqlalchemy.orm import Session
from app.models.expense import Expense, ExpenseSplit, Balance
from app.schemas.balance import SettlementSuggestion
from typing import Dict, List, Tuple

def calculate_group_balances(group_id: int, db: Session):
    """
    Calculate and update balances for a group.
    This function computes who owes whom and stores the results in the balances table.
    """
    
    # Clear existing balances for this group
    db.query(Balance).filter(Balance.group_id == group_id).delete()
    
    # Get all expenses for the group
    expenses = db.query(Expense).filter(Expense.group_id == group_id).all()
    
    # Calculate net balances per user
    user_balances: Dict[int, float] = {}
    
    for expense in expenses:
        # Get splits for this expense
        splits = db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense.id).all()
        
        # Initialize balances if not present
        if expense.payer_id not in user_balances:
            user_balances[expense.payer_id] = 0.0
        
        # Payer paid the full amount, so they are owed money
        user_balances[expense.payer_id] += expense.amount
        
        # Each participant owes their share
        for split in splits:
            if split.user_id not in user_balances:
                user_balances[split.user_id] = 0.0
            user_balances[split.user_id] -= split.amount
    
    # Convert net balances to who owes whom
    debtors = [(user_id, balance) for user_id, balance in user_balances.items() if balance < 0]
    creditors = [(user_id, balance) for user_id, balance in user_balances.items() if balance > 0]
    
    # Sort by amount (largest first)
    debtors.sort(key=lambda x: x[1])  # Most negative first
    creditors.sort(key=lambda x: x[1], reverse=True)  # Largest positive first
    
    # Create minimal settlements
    i, j = 0, 0
    while i < len(debtors) and j < len(creditors):
        debtor_id, debtor_balance = debtors[i]
        creditor_id, creditor_balance = creditors[j]
        
        # Amount to settle (minimum of what debtor owes and creditor is owed)
        settle_amount = min(-debtor_balance, creditor_balance)
        
        if settle_amount > 0.01:  # Only create balance if amount is significant
            balance = Balance(
                group_id=group_id,
                debtor_id=debtor_id,
                creditor_id=creditor_id,
                amount=round(settle_amount, 2)
            )
            db.add(balance)
        
        # Update balances
        debtors[i] = (debtor_id, debtor_balance + settle_amount)
        creditors[j] = (creditor_id, creditor_balance - settle_amount)
        
        # Move to next debtor or creditor if settled
        if abs(debtors[i][1]) < 0.01:
            i += 1
        if abs(creditors[j][1]) < 0.01:
            j += 1
    
    db.commit()

def get_settlement_suggestions(group_id: int, db: Session) -> List[SettlementSuggestion]:
    """
    Get minimal settlement suggestions for a group.
    This returns the same data as the balances table but in a suggestion format.
    """
    balances = db.query(Balance).filter(Balance.group_id == group_id).all()
    
    suggestions = []
    for balance in balances:
        suggestions.append(SettlementSuggestion(
            debtor_id=balance.debtor_id,
            creditor_id=balance.creditor_id,
            amount=balance.amount
        ))
    
    return suggestions

def get_user_balance_summary(user_id: int, group_id: int, db: Session) -> Dict[str, float]:
    """
    Get balance summary for a specific user in a group.
    Returns total owed, total owing, and net balance.
    """
    balances = db.query(Balance).filter(Balance.group_id == group_id).all()
    
    total_owed = sum(b.amount for b in balances if b.creditor_id == user_id)
    total_owing = sum(b.amount for b in balances if b.debtor_id == user_id)
    net_balance = total_owed - total_owing
    
    return {
        "total_owed": round(total_owed, 2),
        "total_owing": round(total_owing, 2),
        "net_balance": round(net_balance, 2)
    }
