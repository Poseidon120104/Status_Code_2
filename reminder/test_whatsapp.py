from apscheduler.schedulers.background import BackgroundScheduler
from twilio.rest import Client
import time
from datetime import datetime, timedelta

# Twilio credentials (replace with your actual values or load from .env)
account_sid = "AC8691a23a38d002f90f50168606b19352"
auth_token = "5c113171bb228429ef9c668283586e37"
twilio_number = "whatsapp:+14155238886"   # Twilio sandbox WhatsApp number
to_number = "whatsapp:+919051330530"      # Replace with your WhatsApp number

client = Client(account_sid, auth_token)

# Example medicines list
medicines = [
    {
        "name": "Paracetamol",
        "time": ["23:18", "23:19", "23:20"],  # medicine times
        "notes": "Take after food"
    },
    {
        "name": "Vitamin D3",
        "time": ["22:17"],
        "notes": "Take with water"
    }
]

def medicine_reminder(medicine_name, notes, med_time):
    message = client.messages.create(
        from_=twilio_number,
        body=f"💊 Reminder: At {med_time}, you need to take *{medicine_name}*.\nNotes: {notes}",
        to=to_number
    )
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Reminder sent for {medicine_name} (scheduled for {med_time})")

# Scheduler setup
scheduler = BackgroundScheduler()

for med in medicines:
    for t in med["time"]:
        hour, minute = map(int, t.split(":"))

        # Shift reminder 15 minutes earlier
        reminder_time = (datetime(2025, 1, 1, hour, minute) - timedelta(minutes=1)).time()
        reminder_hour = reminder_time.hour
        reminder_minute = reminder_time.minute

        scheduler.add_job(
            medicine_reminder,
            "cron",
            hour=reminder_hour,
            minute=reminder_minute,
            args=[med["name"], med["notes"], t]  # send actual med time in message
        )
        print(f"⏰ Scheduled {med['name']} at {reminder_hour:02d}:{reminder_minute:02d} "
              f"(1 min before {t})")

scheduler.start()

print("✅ WhatsApp medicine reminders are scheduled...")

# Keep the script running
try:
    while True:
        time.sleep(2)
except (KeyboardInterrupt, SystemExit):
    scheduler.shutdown()
