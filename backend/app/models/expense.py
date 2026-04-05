from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class SplitMode(enum.Enum):
    EQUAL = "equal"
    CUSTOM = "custom"
    PERCENTAGE = "percentage"

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    payer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    split_mode = Column(Enum(SplitMode), nullable=False, default=SplitMode.EQUAL)
    date = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    group = relationship("Group", backref="expenses")
    payer = relationship("User", foreign_keys=[payer_id])
    splits = relationship(
        "ExpenseSplit",
        back_populates="expense",
        cascade="all, delete-orphan"
    )

    @property
    def group_name(self) -> str:
        return self.group.name if self.group else ''

    @property
    def paid_by_name(self) -> str:
        return self.payer.name if self.payer else ''

class ExpenseSplit(Base):
    __tablename__ = "expense_splits"

    id = Column(Integer, primary_key=True, index=True)
    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    percentage = Column(Float, nullable=True)

    expense = relationship("Expense", back_populates="splits")
    user = relationship("User", backref="expense_splits")

class Balance(Base):
    __tablename__ = "balances"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    debtor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    creditor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    group = relationship("Group", backref="balances")
    debtor = relationship("User", foreign_keys=[debtor_id])
    creditor = relationship("User", foreign_keys=[creditor_id])

    @property
    def user_name(self) -> str:
        return self.debtor.name if self.debtor else ''

    @property
    def owes_to_name(self) -> str:
        return self.creditor.name if self.creditor else ''
