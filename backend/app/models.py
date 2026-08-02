import enum
import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, Enum, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class JobStatus(str, enum.Enum):
    applied = "Applied"
    screening = "Screening"
    interview = "Interview"
    offer = "Offer"
    accepted = "Accepted"
    rejected = "Rejected"
    withdrawn = "Withdrawn"


TERMINAL_STATUSES = {JobStatus.accepted, JobStatus.rejected, JobStatus.withdrawn}


class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company = Column(String(255), nullable=False)
    position = Column(String(255), nullable=False)
    industry = Column(String(255), nullable=True)
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    status = Column(
        Enum(
            JobStatus,
            native_enum=False,
            length=32,
            # Without this, SQLAlchemy stores enum MEMBER NAMES ("applied"),
            # not the string values ("Applied") the rest of the app uses
            # (CSV export/import, ?status_filter= query params, JSON bodies).
            # That mismatch would make status filtering silently return
            # nothing, since "Applied" != "applied" in a SQL comparison.
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
            # native_enum=False defaults to NOT adding a CHECK constraint.
            # Turn it on so Postgres itself rejects invalid status values,
            # not just the Pydantic layer.
            create_constraint=True,
            name="ck_jobs_status_valid",
        ),
        nullable=False,
        default=JobStatus.applied,
    )
    date_applied = Column(Date, nullable=True)
    date_last_updated = Column(Date, nullable=True)
    source = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    preferred = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
