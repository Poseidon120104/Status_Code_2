import datetime
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow

# Google Calendar scope
SCOPES = ['https://www.googleapis.com/auth/calendar.events']

def authenticate_google(email: str):
    """
    Authenticate and return the calendar service object.
    Currently, it launches OAuth browser flow each time.
    """
    flow = InstalledAppFlow.from_client_secrets_file("credentials.json", SCOPES)
    creds = flow.run_local_server(port=0)
    service = build("calendar", "v3", credentials=creds)
    return service

def add_medicine_events(service, medicines, email):
    """
    Add recurring events for medicines to Google Calendar.
    """
    created_events = []
    for med in medicines:
        start_date = datetime.datetime.strptime(med["start_date"], "%Y-%m-%d").date()
        end_date = datetime.datetime.strptime(med["end_date"], "%Y-%m-%d").date()

        for intake_time in med["time"]:
            start_datetime = datetime.datetime.combine(
                start_date,
                datetime.datetime.strptime(intake_time, "%H:%M").time()
            )
            end_datetime = start_datetime + datetime.timedelta(minutes=30)

            event = {
                "summary": f"Take {med['name']}",
                "description": med.get("notes", ""),
                "start": {"dateTime": start_datetime.isoformat(), "timeZone": "Asia/Kolkata"},
                "end": {"dateTime": end_datetime.isoformat(), "timeZone": "Asia/Kolkata"},
                "recurrence": [
                    f"RRULE:FREQ=DAILY;UNTIL={end_date.strftime('%Y%m%d')}T235959Z"
                ],
                "attendees": [{"email": email}],
                "reminders": {
                    "useDefault": False,
                    "overrides": [
                        {"method": "popup", "minutes": 10},
                        {"method": "email", "minutes": 30}
                    ]
                },
            }

            event_result = service.events().insert(calendarId="primary", body=event).execute()
            created_events.append(event_result.get("htmlLink"))

    return created_events
