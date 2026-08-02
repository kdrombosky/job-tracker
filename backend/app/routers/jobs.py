import csv
import io
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.security import get_current_user

router = APIRouter(
    prefix="/api/jobs",
    tags=["jobs"],
    dependencies=[Depends(get_current_user)],
)

CSV_FIELDS = [
    "company", "position", "industry", "salary_min", "salary_max", "status",
    "date_applied", "date_last_updated", "source", "preferred", "notes",
]


@router.get("", response_model=list[schemas.JobOut])
def list_jobs(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    industry: Optional[str] = None,
    preferred_only: bool = False,
    sort: str = "date_last_updated_desc",
    db: Session = Depends(get_db),
):
    return crud.list_jobs(db, search, status_filter, industry, preferred_only, sort)


@router.post("", response_model=schemas.JobOut, status_code=status.HTTP_201_CREATED)
def create_job(data: schemas.JobCreate, db: Session = Depends(get_db)):
    return crud.create_job(db, data)


@router.get("/export")
def export_csv(db: Session = Depends(get_db)):
    rows = crud.list_jobs(db)
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=CSV_FIELDS)
    writer.writeheader()
    for r in rows:
        writer.writerow({
            "company": r.company, "position": r.position, "industry": r.industry or "",
            "salary_min": r.salary_min if r.salary_min is not None else "",
            "salary_max": r.salary_max if r.salary_max is not None else "",
            "status": r.status.value if hasattr(r.status, "value") else r.status,
            "date_applied": r.date_applied.isoformat() if r.date_applied else "",
            "date_last_updated": r.date_last_updated.isoformat() if r.date_last_updated else "",
            "source": r.source or "", "preferred": r.preferred, "notes": r.notes or "",
        })
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=jobs.csv"},
    )


@router.post("/import")
async def import_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    rows = []
    for row in reader:
        cleaned = {k: (v if v not in (None, "") else None) for k, v in row.items() if k in CSV_FIELDS}
        if cleaned.get("salary_min") is not None:
            try:
                cleaned["salary_min"] = int(float(cleaned["salary_min"]))
            except ValueError:
                cleaned["salary_min"] = None
        if cleaned.get("salary_max") is not None:
            try:
                cleaned["salary_max"] = int(float(cleaned["salary_max"]))
            except ValueError:
                cleaned["salary_max"] = None
        if "preferred" in cleaned and cleaned["preferred"] is not None:
            cleaned["preferred"] = str(cleaned["preferred"]).strip().lower() in ("true", "1", "yes")
        if not cleaned.get("company") and not cleaned.get("position"):
            continue
        rows.append(cleaned)
    created = crud.bulk_create_from_dicts(db, rows)
    return {"imported": created}


@router.get("/{job_id}", response_model=schemas.JobOut)
def get_job(job_id: uuid.UUID, db: Session = Depends(get_db)):
    obj = crud.get_job(db, job_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Job not found")
    return obj


@router.put("/{job_id}", response_model=schemas.JobOut)
def update_job(job_id: uuid.UUID, data: schemas.JobUpdate, db: Session = Depends(get_db)):
    obj = crud.get_job(db, job_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Job not found")
    return crud.update_job(db, obj, data)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(job_id: uuid.UUID, db: Session = Depends(get_db)):
    obj = crud.get_job(db, job_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Job not found")
    crud.delete_job(db, obj)
    return None
