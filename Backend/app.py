import os
import json
import uuid
from datetime import datetime, timedelta
from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import re 

# Optional Gemini
load_dotenv()
USE_GEMINI = False
try:
    import google.generativeai as genai
    if os.getenv("GEMINI_API_KEY"):
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        USE_GEMINI = True
except Exception:
    USE_GEMINI = False

app = Flask(__name__)
CORS(app)

# Persistent storage for JSON outputs
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)

# Temporary dir for uploads
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ---------- Helpers ----------
def normalize_time(t):
    t = t.strip().lower().replace('.', '')
    if re.match(r'^\d{1,2}\s*(am|pm)?$', t):
        t = t.replace(' ', '')
        if t.endswith('am') or t.endswith('pm'):
            in_dt = datetime.strptime(t, "%I%p")
        else:
            in_dt = datetime.strptime(t, "%H")
        return in_dt.strftime("%H:00")
    try:
        if 'am' in t or 'pm' in t:
            in_dt = datetime.strptime(t.replace(' ', ''), "%I:%M%p")
        else:
            in_dt = datetime.strptime(t, "%H:%M")
        return in_dt.strftime("%H:%M")
    except Exception:
        return "08:00"

def default_dates(days=7):
    tz_today = datetime.now().date()
    start = tz_today.strftime("%Y-%m-%d")
    end = (tz_today + timedelta(days=days-1)).strftime("%Y-%m-%d")
    return start, end

def to_target_schema(items):
    out = {"medicines": []}
    for it in items:
        name = it.get("name", "").strip()
        times = [normalize_time(x) for x in it.get("time", []) if str(x).strip()]
        start_date = it.get("start_date")
        end_date = it.get("end_date")
        notes = it.get("notes", "").strip()
        if not start_date or not end_date:
            s, e = default_dates()
            start_date = start_date or s
            end_date = end_date or e
        out["medicines"].append({
            "name": name or "Unknown",
            "time": times or ["08:00"],
            "start_date": start_date,
            "end_date": end_date,
            "notes": notes
        })
    return out

# ---------- Gemini path ----------
GEMINI_SYSTEM_PROMPT = """
You read prescriptions (photo or scanned) and output ONLY valid JSON in this schema:

{
  "medicines": [
    {
      "name": "string",
      "time": ["HH:MM", "..."],           // 24h
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "notes": "string"
    }
  ]
}

Rules:
- If dates are missing, assume a 7-day course starting today. Use ISO dates.
- Convert any times to 24-hour HH:MM (e.g., 8am -> "08:00", 8:30 pm -> "20:30").
- Include brief instructions in notes (e.g., "after food", "1 tab").
- Output ONLY JSON. No commentary.
"""

def extract_with_gemini(image_path):
    model = genai.GenerativeModel("gemini-1.5-flash")
    with open(image_path, "rb") as f:
        img_bytes = f.read()

    resp = model.generate_content(
        [
            {"text": GEMINI_SYSTEM_PROMPT.strip()},
            {"inline_data": {"mime_type": "image/jpeg", "data": img_bytes}}
        ],
        safety_settings={
            "HARASSMENT": "block_none",
            "HATE_SPEECH": "block_none",
            "SEXUAL": "block_none",
            "DANGEROUS": "block_none"
        }
    )

    import re
    txt = resp.text.strip()
    m = re.search(r'\{[\s\S]*\}', txt)
    if not m:
        raise ValueError("Gemini did not return JSON.")
    data = json.loads(m.group(0))
    if isinstance(data, dict):
        items = data.get("medicines") or data.get("data") or []
    elif isinstance(data, list):
        items = data
    else:
        items = []
    return to_target_schema(items)

# ---------- API ----------
@app.route("/api/prescriptions", methods=["POST"])
def upload_and_extract():
    if "file" not in request.files:
        return jsonify({"error": "No file part 'file' found"}), 400

    f = request.files["file"]
    if f.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    ext = os.path.splitext(f.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png"]:
        return jsonify({"error": "Only .jpg, .jpeg, .png supported"}), 400

    save_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}{ext}")
    f.save(save_path)

    try:
        if USE_GEMINI:
            data = extract_with_gemini(save_path)
        else:
            return jsonify({"error": "Gemini API not configured"}), 500

        out_filename = f"medicines_{uuid.uuid4().hex}.json"
        out_path = os.path.join(DATA_DIR, out_filename)
        with open(out_path, "w", encoding="utf-8") as fp:
            json.dump(data, fp, ensure_ascii=False, indent=2)

        return jsonify({"ok": True, "data": data, "file": out_filename})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/api/medicines/<filename>", methods=["GET"])
def get_medicines(filename):
    return send_from_directory(DATA_DIR, filename, as_attachment=True)

@app.route("/api/medicines/latest", methods=["GET"])
def get_latest_medicines():
    files = [f for f in os.listdir(DATA_DIR) if f.endswith(".json")]
    if not files:
        return jsonify({"error": "No medicines stored yet"}), 404
    latest = max(files, key=lambda f: os.path.getctime(os.path.join(DATA_DIR, f)))
    with open(os.path.join(DATA_DIR, latest), "r", encoding="utf-8") as fp:
        data = json.load(fp)
    return jsonify({"file": latest, "data": data})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=True)
