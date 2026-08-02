import datetime
import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, computed_field

from app.models import JobStatus, TERMINAL_STATUSES


class JobBase(BaseModel):
    company: str
    position: str
    industry: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    status: JobStatus = JobStatus.applied
    date_applied: Optional[datetime.date] = None
    date_last_updated: Optional[datetime.date] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    preferred: bool = False


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    company: Optional[str] = None
    position: Optional[str] = None
    industry: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    status: Optional[JobStatus] = None
    date_applied: Optional[datetime.date] = None
    date_last_updated: Optional[datetime.date] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    preferred: Optional[bool] = None


class JobOut(JobBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime

    @computed_field
    @property
    def days_since_update(self) -> Optional[int]:
        anchor = self.date_last_updated or self.date_applied
        if not anchor:
            return None
        return (datetime.date.today() - anchor).days

    @computed_field
    @property
    def total_days(self) -> Optional[int]:
        if not self.date_applied:
            return None
        if self.status in TERMINAL_STATUSES:
            end = self.date_last_updated or self.date_applied
        else:
            end = datetime.date.today()
        return (end - self.date_applied).days

    @computed_field
    @property
    def is_stale(self) -> bool:
        if self.status in TERMINAL_STATUSES:
            return False
        days = self.days_since_update
        return days is not None and days >= 14


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    password: str
