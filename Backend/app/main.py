import datetime
import json
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow

# Scope for Google Calendar
SCOPES = ['https://www.googleapis.com/auth/calendar.events']

def authenticate_google():
    """Authenticate and return the calendar service object."""
    flow = InstalledAppFlow.from_client_secrets_file("credentials.json", SCOPES)
    creds = flow.run_local_server(port=0)
    service = build("calendar", "v3", credentials=creds)
    return service

def load_medicine_data(file_path):
    """Load medicine intake details from JSON file."""
    with open(file_path, "r") as f:
        data = json.load(f)
    return data["medicines"]

def add_medicine_events(service, medicines):
    """Add recurring events for each medicine."""
    for med in medicines:
        start_date = datetime.datetime.strptime(med["start_date"], "%Y-%m-%d").date()
        end_date = datetime.datetime.strptime(med["end_date"], "%Y-%m-%d").date()

        for intake_time in med["time"]:
            start_datetime = datetime.datetime.combine(start_date, datetime.datetime.strptime(intake_time, "%H:%M").time())
            end_datetime = start_datetime + datetime.timedelta(minutes=30)  # event duration

            event = {
                "summary": f"Take {med['name']}",
                "description": med.get("notes", ""),
                "start": {"dateTime": start_datetime.isoformat(), "timeZone": "Asia/Kolkata"},
                "end": {"dateTime": end_datetime.isoformat(), "timeZone": "Asia/Kolkata"},
                "recurrence": [
                    f"RRULE:FREQ=DAILY;UNTIL={end_date.strftime('%Y%m%d')}T235959Z"
                ],
                "reminders": {
                    "useDefault": False,
                    "overrides": [
                        {"method": "popup", "minutes": 10},  # reminder before 10 min
                        {"method": "email", "minutes": 30}   # email reminder 30 min before
                    ]
                },
            }

            event_result = service.events().insert(calendarId="primary", body=event).execute()
            print(f"✅ Event created: {event_result.get('htmlLink')}")

if __name__ == "__main__":
    service = authenticate_google()
    medicines = load_medicine_data("medicines.json")
    add_medicine_events(service, medicines)
