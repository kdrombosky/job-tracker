import uuid
from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import models, schemas


def get_job(db: Session, job_id: uuid.UUID) -> Optional[models.Job]:
    return db.query(models.Job).filter(models.Job.id == job_id).first()


def list_jobs(
    db: Session,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    industry: Optional[str] = None,
    preferred_only: bool = False,
    sort: str = "date_last_updated_desc",
):
    query = db.query(models.Job)

    if search:
        like = f"%{search}%"
        query = query.filter(or_(models.Job.company.ilike(like), models.Job.position.ilike(like)))
    if status_filter:
        query = query.filter(models.Job.status == status_filter)
    if industry:
        query = query.filter(models.Job.industry == industry)
    if preferred_only:
        query = query.filter(models.Job.preferred.is_(True))

    sort_map = {
        "date_last_updated_desc": models.Job.date_last_updated.desc(),
        "date_last_updated_asc": models.Job.date_last_updated.asc(),
        "date_applied_desc": models.Job.date_applied.desc(),
        "date_applied_asc": models.Job.date_applied.asc(),
        "company_asc": models.Job.company.asc(),
        "salary_max_desc": models.Job.salary_max.desc(),
    }
    query = query.order_by(sort_map.get(sort, models.Job.date_last_updated.desc()))
    return query.all()


def create_job(db: Session, data: schemas.JobCreate) -> models.Job:
    obj = models.Job(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_job(db: Session, obj: models.Job, data: schemas.JobUpdate) -> models.Job:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_job(db: Session, obj: models.Job) -> None:
    db.delete(obj)
    db.commit()


def bulk_create_from_dicts(db: Session, rows: list[dict]) -> int:
    count = 0
    for row in rows:
        try:
            data = schemas.JobCreate(**row)
        except Exception:
            continue
        db.add(models.Job(**data.model_dump()))
        count += 1
    db.commit()
    return count
