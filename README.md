# 🧪 Prescription Management System  

[![Python](https://img.shields.io/badge/Python-3.9%2B-blue)](https://www.python.org/)  
[![Flask](https://img.shields.io/badge/Flask-Framework-black)](https://flask.palletsprojects.com/)  
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-green)](https://www.mongodb.com/)  
[![Google Calendar API](https://img.shields.io/badge/API-Google%20Calendar-red)](https://developers.google.com/calendar)  
[![Twilio WhatsApp](https://img.shields.io/badge/API-Twilio%20WhatsApp-lightgrey)](https://www.twilio.com/whatsapp)  

---

## 📌 Project Overview  

**Prescription Management System** is a smart healthcare assistant that:  
- Takes a **doctor’s prescription as input** (image or text).  
- Extracts and processes **medicine information**.  
- Stores prescription data securely in **MongoDB**.  
- Verifies extracted medicines with the **user** before confirming.  
- Adds **reminders in Google Calendar** for medicine intake.  
- Sends **WhatsApp reminders** via Twilio.  
- Keeps a digital **record of all prescriptions**.  

This project was built during a hackathon by **Team A.I. Alchemists** from **IIIT Kalyani**.  

---

## 👨‍💻 Team Members  

- **Aditya Paul**  
- **Adrish Roy**  
- **Anindya Bhaumik**  
- **Anik Barury**  
- **Ankit Ojha**  

**Team Name**: 🧙‍♂️ *A.I. Alchemists*  
**Institute**: IIIT Kalyani  

---

## ⚙️ Tech Stack  

- **Backend**: Flask (Python)  
- **Database**: MongoDB with GridFS for image storage  
- **APIs**:  
  - Google Calendar API (medicine reminders)  
  - Twilio WhatsApp API (notification system)  
- **Other Tools**:  
  - `pytesseract` (for OCR on prescription images)  
  - `dotenv` (for environment variables)  
  - `tiktoken / Gemini` (for language processing)  

---

## 🚀 Features  

✅ Upload prescription images (doctor’s handwriting supported)  
✅ Extract medicine details using GEMINI trained models  
✅ Store verified prescriptions in MongoDB  
✅ Add calendar reminders for medicines  
✅ Send WhatsApp reminders for each dose  
✅ Retrieve past prescriptions anytime  

---

## 🛠️ Installation  

1. Clone the repository:  
   ```bash
   git clone https://github.com/<your-repo>.git
   cd prescription-management
   
2. Create a virtual environment & activate it:
    python -m venv venv
    source venv/bin/activate   # Linux/Mac
    venv\Scripts\activate      # Windows


3. Install dependencies:
      pip install -r requirements.txt

4. Setup environment variables in .env:
     MONGO_URI=<your_mongo_connection>
     GOOGLE_CLIENT_SECRET=<your_google_client_secret.json>
     TWILIO_SID=<your_twilio_sid>
     TWILIO_AUTH_TOKEN=<your_twilio_auth_token>

5. Run the Flask app:
       flask run


📂 Project Structure
├── app.py                 # Main Flask app
├── requirements.txt       # Dependencies
├── db_utils.py            # MongoDB utilities
├── calendar_utils.py      # Google Calendar API integration
├── prescriptions.py       # Prescription processing logic
├── auth.py                # Authentication & OAuth
├── static/                # Static files
├── templates/             # HTML templates (if any)
├── README.md              # Documentation
└── .env                   # Environment variables



📅 Future Enhancements

🔹 AI-powered prescription validation against standard medicine databases.

🔹 Integration with pharmacy APIs for automatic ordering.

🔹 Multi-user family prescription management.

🔹 Support for wearable device notifications.


🏆 Hackathon

This project was developed for a hackathon by Team A.I. Alchemists (IIIT Kalyani).
