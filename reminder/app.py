from dotenv import load_dotenv
load_dotenv()
from flask import Flask, request, jsonify


from twilio.rest import Client
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, date
import os

app = Flask(__name__)

# Twilio credentials (set as env vars for safety)
TWILIO_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP = "whatsapp:+14155238886"  # Twilio sandbox

client = Client(TWILIO_SID, TWILIO_AUTH)

# Scheduler
scheduler = BackgroundScheduler()
scheduler.start()

# Store reminders in memory
reminders = {}

def send_whatsapp_message(to, message):
    client.messages.create(
        from_=TWILIO_WHATSAPP,
        body=message,
        to=f"whatsapp:{to}"
    )

def reminder_job(number, medicine, notes, start_date, end_date):
    """Check if today is within range before sending message."""
    today = date.today()
    if start_date <= today <= end_date:
        msg = f"💊 Reminder: Take {medicine}\nNote: {notes}"
        send_whatsapp_message(number, msg)

@app.route("/set_reminders", methods=["POST"])
def set_reminders():
    """
    Example JSON payload:
    {
      "number": "+919876543210",
      "email": "someone@gmail.com",
      "medicines": [
        {
          "name": "Paracetamol",
          "start_date": "2025-08-23",
          "end_date": "2025-08-30",
          "time": ["09:00", "15:00", "21:00"],
          "notes": "Take after food"
        },
        {
          "name": "Vitamin D3",
          "start_date": "2025-08-23",
          "end_date": "2025-09-23",
          "time": ["07:30"],
          "notes": "Take with water"
        }
      ]
    }
    """
    data = request.json
    number = data["number"]
    email = data.get("email")
    medicines = data["medicines"]

    for med in medicines:
        name = med["name"]
        start_date = datetime.strptime(med["start_date"], "%Y-%m-%d").date()
        end_date = datetime.strptime(med["end_date"], "%Y-%m-%d").date()
        times = med["time"]
        notes = med.get("notes", "")

        for t in times:
            hour, minute = map(int, t.split(":"))
            job_id = f"{number}_{name}_{t}"

            scheduler.add_job(
                reminder_job,
                "cron",
                id=job_id,
                hour=hour,
                minute=minute,
                args=[number, name, notes, start_date, end_date],
                replace_existing=True
            )

            reminders[job_id] = {
                "medicine": name,
                "time": t,
                "start_date": str(start_date),
                "end_date": str(end_date),
                "notes": notes,
                "number": number,
                "email": email
            }

    return jsonify({"status": "Reminders scheduled!", "reminders": reminders})

@app.route("/reminders", methods=["GET"])
def list_reminders():
    return jsonify(reminders)

@app.route("/")
def home():
    return "Flask WhatsApp Reminder App is running ✅"


if __name__ == "__main__":
    app.run(debug=True)
    
    
