from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.schemas.user import UserResponse

class GroupBase(BaseModel):
    name: str

class GroupCreate(GroupBase):
    pass

class GroupUpdate(BaseModel):
    name: Optional[str] = None

class GroupResponse(GroupBase):
    id: int
    created_by: int
    created_at: datetime
    members: List[UserResponse]

    class Config:
        from_attributes = True

class GroupMemberAdd(BaseModel):
    email: str
