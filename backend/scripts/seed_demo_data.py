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
    dict(company="Willow & Reed Basketry Collective", position="Senior Basket Weaver", industry="Artisanal Basket Weaving",
         salary_min=42000, salary_max=58000, status=JobStatus.interview,
         days_ago_applied=34, days_ago_updated=3, source="LinkedIn", preferred=True,
         notes="Final round: weave a basket blindfolded. Feeling good about it."),
    dict(company="Bark Avenue VIP Concierge", position="Celebrity Dog Walker", industry="Pet Concierge Services",
         salary_min=65000, salary_max=95000, status=JobStatus.offer,
         days_ago_applied=52, days_ago_updated=6, source="Referral", preferred=True,
         notes="Offer in hand. They need someone who can outpace a chihuahua on espresso."),
    dict(company="The Gnome Home", position="Artisanal Garden Gnome Painter", industry="Lawn Ornament Arts",
         salary_min=38000, salary_max=45000, status=JobStatus.applied,
         days_ago_applied=5, days_ago_updated=5, source="Company website", preferred=False,
         notes=""),
    dict(company="Meltdown Ice Cream Labs", position="Ice Cream Flavor Mad Scientist", industry="Experimental Desserts",
         salary_min=55000, salary_max=70000, status=JobStatus.screening,
         days_ago_applied=12, days_ago_updated=4, source="Indeed", preferred=False,
         notes="Phone screen: asked to describe the taste of nostalgia. Nailed it."),
    dict(company="Whisker Kingdom Cat Cafe", position="Chief Vibes Curator", industry="Feline Hospitality",
         salary_min=40000, salary_max=48000, status=JobStatus.rejected,
         days_ago_applied=40, days_ago_updated=28, source="LinkedIn", preferred=False,
         notes="Said my energy was 'too dog-coded.' Fair, honestly."),
    dict(company="Rubber Duck Debugging LLC", position="Professional Rubber Duck", industry="Software Emotional Support",
         salary_min=60000, salary_max=72000, status=JobStatus.withdrawn,
         days_ago_applied=60, days_ago_updated=45, source="Recruiter outreach", preferred=False,
         notes="Withdrew — realized the job is just sitting on a desk all day. Which, fair."),
    dict(company="Pigeon Post Express", position="Senior Carrier Pigeon Wrangler", industry="Analog Logistics",
         salary_min=48000, salary_max=56000, status=JobStatus.interview,
         days_ago_applied=21, days_ago_updated=2, source="Referral", preferred=True,
         notes="Round two: navigate a pigeon home from across town unassisted."),
    dict(company="Moustache Wax Collective", position="Master Moustache Groomer", industry="Facial Hair Sciences",
         salary_min=44000, salary_max=52000, status=JobStatus.applied,
         days_ago_applied=2, days_ago_updated=2, source="Company website", preferred=False,
         notes=""),
    dict(company="Yodel Academy of the Alps", position="Head Yodeling Instructor", industry="Competitive Yodeling",
         salary_min=50000, salary_max=63000, status=JobStatus.accepted,
         days_ago_applied=75, days_ago_updated=50, source="LinkedIn", preferred=True,
         notes="Accepted! First day includes a mandatory echo test."),
    dict(company="The Sourdough Sanctuary", position="Sourdough Starter Whisperer", industry="Fermentation Arts",
         salary_min=46000, salary_max=54000, status=JobStatus.rejected,
         days_ago_applied=48, days_ago_updated=35, source="Indeed", preferred=False,
         notes="They said my starter, Gerald, didn't 'vibe' with theirs."),
    dict(company="Bigfoot Research Institute", position="Senior Cryptid Field Researcher", industry="Cryptozoology",
         salary_min=58000, salary_max=80000, status=JobStatus.screening,
         days_ago_applied=9, days_ago_updated=1, source="Referral", preferred=True,
         notes="Great first call — they showed me a blurry photo as a screening question."),
    dict(company="Glitter Bomb Inc.", position="Chief Glitter Bomb Technician", industry="Novelty Weaponry",
         salary_min=41000, salary_max=49000, status=JobStatus.applied,
         days_ago_applied=1, days_ago_updated=1, source="LinkedIn", preferred=False,
         notes=""),
    dict(company="Competitive Napping League", position="Professional Napper", industry="Competitive Rest Sports",
         salary_min=39000, salary_max=45000, status=JobStatus.interview,
         days_ago_applied=18, days_ago_updated=16, source="Company website", preferred=False,
         notes="Haven't heard back in a while — hope I didn't nap through the follow-up email."),
    dict(company="Sock Puppet Theatre Co.", position="Senior Sock Puppet Director", industry="Performing Arts (Hand-Based)",
         salary_min=43000, salary_max=51000, status=JobStatus.applied,
         days_ago_applied=25, days_ago_updated=25, source="Indeed", preferred=False,
         notes="Total silence. Possibly a lost-sock situation."),
    dict(company="Cloud Nine Hot Air Balloon Tours", position="Sky Whisperer / Balloon Pilot", industry="Leisure Aviation",
         salary_min=52000, salary_max=68000, status=JobStatus.offer,
         days_ago_applied=44, days_ago_updated=4, source="Referral", preferred=True,
         notes="Offer received — comparing against the dog-walking gig."),
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
