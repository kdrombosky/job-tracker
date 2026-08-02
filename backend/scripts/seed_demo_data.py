"""
Seed the currently-configured database with realistic, clearly-fake job
application data — meant for the Neon `dev` branch, so there's something
worth demoing (e.g. in an interview) without exposing your real job search.

Usage (from backend/, with DATABASE_URL in your environment/.env already
pointed at the dev branch):

    python -m scripts.seed_demo_data

Wipes the `jobs` table first, so it's safe to re-run to reset demo state.
Prints exactly which database it's about to touch and requires you to type
its name back to confirm, since pointing this at the wrong DATABASE_URL
would delete real data.
"""
import argparse
import datetime
import sys
from urllib.parse import urlparse

from app.config import get_settings
from app.database import SessionLocal
from app.models import Job, JobStatus

DEMO_JOBS = [
    dict(company="Nimbus Analytics", position="Senior Backend Engineer", industry="Fintech",
         salary_min=155000, salary_max=185000, status=JobStatus.interview,
         days_ago_applied=34, days_ago_updated=3, source="LinkedIn", preferred=True,
         notes="Onsite loop scheduled for next week. Really like the team."),
    dict(company="Vertex Robotics", position="Staff Software Engineer", industry="Robotics",
         salary_min=190000, salary_max=225000, status=JobStatus.offer,
         days_ago_applied=52, days_ago_updated=6, source="Referral", preferred=True,
         notes="Offer in hand, negotiating comp."),
    dict(company="BrightPath Health", position="Backend Engineer", industry="Healthcare",
         salary_min=140000, salary_max=165000, status=JobStatus.applied,
         days_ago_applied=5, days_ago_updated=5, source="Company website", preferred=False,
         notes=""),
    dict(company="Ledgerline", position="Platform Engineer", industry="Fintech",
         salary_min=150000, salary_max=175000, status=JobStatus.screening,
         days_ago_applied=12, days_ago_updated=4, source="Indeed", preferred=False,
         notes="Recruiter call went well, waiting on tech screen."),
    dict(company="Solstice Games", position="Gameplay Systems Engineer", industry="Gaming",
         salary_min=130000, salary_max=155000, status=JobStatus.rejected,
         days_ago_applied=40, days_ago_updated=28, source="LinkedIn", preferred=False,
         notes="Went with an internal candidate."),
    dict(company="Cascade Climate", position="Software Engineer, Data Platform", industry="Climate Tech",
         salary_min=145000, salary_max=170000, status=JobStatus.withdrawn,
         days_ago_applied=60, days_ago_updated=45, source="Recruiter outreach", preferred=False,
         notes="Withdrew — timeline didn't line up."),
    dict(company="Ironclad Security", position="Security Engineer", industry="Cybersecurity",
         salary_min=160000, salary_max=190000, status=JobStatus.interview,
         days_ago_applied=21, days_ago_updated=2, source="Referral", preferred=True,
         notes="Second round next Tuesday."),
    dict(company="Harborlight EdTech", position="Full Stack Engineer", industry="Education",
         salary_min=125000, salary_max=150000, status=JobStatus.applied,
         days_ago_applied=2, days_ago_updated=2, source="Company website", preferred=False,
         notes=""),
    dict(company="Quarry Data Systems", position="Senior Data Engineer", industry="Data Infrastructure",
         salary_min=165000, salary_max=195000, status=JobStatus.accepted,
         days_ago_applied=75, days_ago_updated=50, source="LinkedIn", preferred=True,
         notes="Accepted! Starting next month."),
    dict(company="Fieldstone Logistics", position="Backend Engineer", industry="Logistics",
         salary_min=135000, salary_max=160000, status=JobStatus.rejected,
         days_ago_applied=48, days_ago_updated=35, source="Indeed", preferred=False,
         notes="No feedback given."),
    dict(company="Aurora AI", position="ML Platform Engineer", industry="AI / ML",
         salary_min=175000, salary_max=210000, status=JobStatus.screening,
         days_ago_applied=9, days_ago_updated=1, source="Referral", preferred=True,
         notes="Great first call, take-home next."),
    dict(company="Northgate Commerce", position="Software Engineer", industry="E-commerce",
         salary_min=130000, salary_max=150000, status=JobStatus.applied,
         days_ago_applied=1, days_ago_updated=1, source="LinkedIn", preferred=False,
         notes=""),
    dict(company="Meridian Insurance Tech", position="Backend Engineer", industry="Insurtech",
         salary_min=140000, salary_max=165000, status=JobStatus.interview,
         days_ago_applied=18, days_ago_updated=16, source="Company website", preferred=False,
         notes="Waiting to hear back on next steps — a bit overdue."),
    dict(company="Pinecrest Analytics", position="Senior Software Engineer", industry="SaaS",
         salary_min=150000, salary_max=180000, status=JobStatus.applied,
         days_ago_applied=25, days_ago_updated=25, source="Indeed", preferred=False,
         notes="Haven't heard anything — likely a dead end."),
    dict(company="Redshift Biotech", position="Research Software Engineer", industry="Biotech",
         salary_min=145000, salary_max=170000, status=JobStatus.offer,
         days_ago_applied=44, days_ago_updated=4, source="Referral", preferred=True,
         notes="Offer received, comparing against Vertex."),
]


def build_rows() -> list[Job]:
    today = datetime.date.today()
    rows = []
    for j in DEMO_JOBS:
        rows.append(Job(
            company=j["company"],
            position=j["position"],
            industry=j["industry"],
            salary_min=j["salary_min"],
            salary_max=j["salary_max"],
            status=j["status"],
            date_applied=today - datetime.timedelta(days=j["days_ago_applied"]),
            date_last_updated=today - datetime.timedelta(days=j["days_ago_updated"]),
            source=j["source"],
            preferred=j["preferred"],
            notes=j["notes"],
        ))
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--yes", action="store_true", help="Skip the confirmation prompt.")
    args = parser.parse_args()

    settings = get_settings()
    parsed = urlparse(settings.sqlalchemy_database_url)
    db_name = parsed.path.lstrip("/")
    target = f"{parsed.hostname}/{db_name}"

    print(f"This will DELETE all rows in `jobs` and insert {len(DEMO_JOBS)} fake ones.")
    print(f"Target database: {target}")

    if not args.yes:
        confirm = input(f"Type the database name ({db_name}) to continue: ")
        if confirm != db_name:
            print("Aborted — input didn't match.")
            sys.exit(1)

    db = SessionLocal()
    try:
        db.query(Job).delete()
        db.add_all(build_rows())
        db.commit()
    finally:
        db.close()

    print(f"Seeded {len(DEMO_JOBS)} demo jobs into {target}.")


if __name__ == "__main__":
    main()
