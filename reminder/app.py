from flask import Flask
from pymongo import MongoClient
from apscheduler.schedulers.background import BackgroundScheduler
from twilio.rest import Client
from datetime import datetime, date, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(_name_)

# Twilio credentials
TWILIO_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP = "whatsapp:+14155238886"  # Twilio sandbox number
client = Client(TWILIO_SID, TWILIO_AUTH)

# MongoDB setup
MONGO_URI = os.getenv("MONGO_URI")
mongo_client = MongoClient(MONGO_URI)
db = mongo_client["medicines_db"]
users_collection = db["medicines"]

# Scheduler
scheduler = BackgroundScheduler()
scheduler.start()

# Track last scheduled state per user
last_user_state = {}


def medicine_reminder(to_number, name, notes, scheduled_time):
    """Send WhatsApp reminder."""
    try:
        message = client.messages.create(
            from_=TWILIO_WHATSAPP,
            body=f"💊 Reminder: At {scheduled_time}, you need to take {name}.\nNotes: {notes}",
            to=to_number
        )
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ✅ Reminder sent for {name} to {to_number} (scheduled for {scheduled_time})")
    except Exception as e:
        print(f"❌ Failed to send reminder for {name} to {to_number}: {e}")


def schedule_all_reminders():
    """Schedule reminders for all users and clean up expired medicines and empty users."""
    global last_user_state
    today = datetime.now().date()
    now = datetime.now()
    users = list(users_collection.find({}))

    for user in users:
        user_id = str(user["_id"])
        current_medicines = user.get("medicines", [])

        # Remove expired medicines
        updated_medicines = []
        for med in current_medicines:
            med_name = med["name"]
            start_date = datetime.strptime(med["start_date"], "%Y-%m-%d").date()
            end_date = datetime.strptime(med["end_date"], "%Y-%m-%d").date()

            if today > end_date:
                print(f"🗑 Removing expired medicine {med_name} for {user.get('email')}")
                users_collection.update_one(
                    {"_id": user["_id"]},
                    {"$pull": {"medicines": {"name": med_name}}}
                )
            else:
                updated_medicines.append(med)

        # Update the medicines list in DB
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"medicines": updated_medicines}}
        )

        # If medicines list is empty, remove the user document
        if not updated_medicines:
            print(f"🗑 Removing user {user.get('email')} because medicines list is empty")
            users_collection.delete_one({"_id": user["_id"]})
            # Remove scheduled jobs for this user
            if user_id in last_user_state:
                for med in last_user_state[user_id]:
                    med_name = med["name"]
                    for t in med.get("time", []):
                        job_id = f"{user_id}{med_name}{t}"
                        try:
                            scheduler.remove_job(job_id)
                        except:
                            pass
                del last_user_state[user_id]
            continue

        # Skip if medicines have not changed
        if user_id in last_user_state and last_user_state[user_id] == updated_medicines:
            continue

        # Remove previously scheduled jobs for this user
        if user_id in last_user_state:
            for med in last_user_state[user_id]:
                med_name = med["name"]
                for t in med.get("time", []):
                    job_id = f"{user_id}{med_name}{t}"
                    try:
                        scheduler.remove_job(job_id)
                    except:
                        pass

        # Schedule reminders for future medicine times
        for med in updated_medicines:
            med_name = med["name"]
            notes = med.get("notes", "")
            times = med.get("time", [])
            start_date = datetime.strptime(med["start_date"], "%Y-%m-%d").date()
            end_date = datetime.strptime(med["end_date"], "%Y-%m-%d").date()

            if start_date <= today <= end_date:
                for t in times:
                    hour, minute = map(int, t.split(":"))
                    reminder_datetime = datetime.combine(today, datetime.min.time()) + timedelta(hours=hour, minutes=minute)
                    reminder_datetime -= timedelta(minutes=1)  # 1 min before scheduled time

                    # Only schedule future reminders
                    if reminder_datetime < now:
                        continue

                    job_id = f"{user_id}{med_name}{t}"
                    scheduler.add_job(
                        medicine_reminder,
                        "cron",
                        hour=reminder_datetime.hour,
                        minute=reminder_datetime.minute,
                        args=[f"whatsapp:{user.get('number')}", med_name, notes, t],
                        id=job_id,
                        replace_existing=True
                    )
                    print(f"⏰ Scheduled {med_name} for {user.get('email')} at {reminder_datetime.time()} (1 min before {t})")

        # Update last scheduled state
        last_user_state[user_id] = updated_medicines


# Initial scheduling
schedule_all_reminders()

# Poll DB every 1 minute to pick up changes
scheduler.add_job(schedule_all_reminders, "interval", minutes=1)

print("✅ WhatsApp medicine reminders scheduler is running (polling every 1 minute)...")

# Flask endpoints
@app.route("/")
def home():
    return "Flask WhatsApp Reminder App is running ✅"


@app.route("/reminders")
def reminders_status():
    return "Scheduler is active and sending reminders."


if _name_ == "_main_":
    app.run(debug=True)
