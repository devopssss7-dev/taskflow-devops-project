from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TaskCreate(BaseModel):
    title: str
    description: str = ""
    priority: str = "MEDIUM"


class TaskUpdate(BaseModel):
    status: str | None = None
    title: str | None = None
    description: str | None = None
    priority: str | None = None


class TaskResponse(BaseModel):
    id: int
    title: str
    description: str
    status: str
    priority: str
    model_config = ConfigDict(from_attributes=True)


class ActivityResponse(BaseModel):
    id: int
    task_id: int | None
    action: str
    message: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
