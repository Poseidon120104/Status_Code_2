import { useEffect, useState } from "react";

declare global {
  interface Window {
    google: any;
  }
}

const SCOPES = "https://www.googleapis.com/auth/calendar.events";

interface Medicine {
  name: string;
  start_date: string;
  end_date: string;
  time: string[];
  notes?: string;
}

// Example medicine data
const medicines: Medicine[] = [
  {
    name: "Medicine A",
    start_date: "2025-08-24",
    end_date: "2025-08-30",
    time: ["09:00", "21:00"],
    notes: "Take with water",
  },
];

// Utility to dynamically load Google Identity script once
function loadGoogleScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.google) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    document.body.appendChild(script);
  });
}


async function authorizeAndAddEvents(medicines: Medicine[]) {
    const clientId=process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    // 793575144045-h762hck4jqjdsdt21es7d981ula16d39.apps.googleusercontent.com
  await loadGoogleScript();

  return new Promise<void>((resolve, reject) => {
    if (!window.google) {
      reject(new Error("Google API not loaded"));
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: async (tokenResponse: any) => {
        if (!tokenResponse.access_token) {
          reject(new Error("Failed to get access token"));
          return;
        }
        const accessToken = tokenResponse.access_token;

        try {
          for (const med of medicines) {
            const startDate = new Date(med.start_date);
            const endDate = new Date(med.end_date);

            for (const intakeTime of med.time) {
              const [hour, minute] = intakeTime.split(":").map(Number);
              const startDateTime = new Date(startDate);
              startDateTime.setHours(hour, minute, 0);

              const endDateTime = new Date(startDateTime);
              endDateTime.setMinutes(endDateTime.getMinutes() + 30);

              const event = {
                summary: `Take ${med.name}`,
                description: med.notes || "",
                start: { dateTime: startDateTime.toISOString(), timeZone: "Asia/Kolkata" },
                end: { dateTime: endDateTime.toISOString(), timeZone: "Asia/Kolkata" },
                recurrence: [
                  `RRULE:FREQ=DAILY;UNTIL=${endDate
                    .toISOString()
                    .replace(/[-:]|\.\d{3}/g, "")}Z`,
                ],
                reminders: {
                  useDefault: false,
                  overrides: [
                    { method: "popup", minutes: 10 },
                    { method: "email", minutes: 30 },
                  ],
                },
              };

              const res = await fetch(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(event),
                }
              );

              const data = await res.json();
              console.log("Event created:", data.htmlLink);
            }
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      },
    });

    tokenClient.requestAccessToken();
  });
}

export default function CalendarPage() {
  // Optional: Empty component or UI if you want.
  return null;
}

export { authorizeAndAddEvents };
