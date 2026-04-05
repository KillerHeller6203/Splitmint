from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

group_members = Table(
    'group_members',
    Base.metadata,
    Column('id', Integer, primary_key=True, index=True),
    Column('group_id', Integer, ForeignKey('groups.id'), nullable=False),
    Column('user_id', Integer, ForeignKey('users.id'), nullable=False),
    Column('joined_at', DateTime(timezone=True), server_default=func.now())
)

class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    members = relationship("User", secondary=group_members, backref="groups")
    creator = relationship("User", foreign_keys=[created_by])
