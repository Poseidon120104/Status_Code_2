import os
import json
import uuid
from datetime import datetime, timedelta
from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import re 
from db_utils import save_prescription_to_db, get_prescriptions

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

    import os

    image_size_kb = os.path.getsize(image_path) / 1024
    image_tokens_estimate = int(image_size_kb)  # 1 KB ≈ 1 token
    def estimate_tokens(text: str) -> int:
        return max(1, len(text) // 4)

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


    try:
        def estimate_tokens(text: str) -> int:
            return max(1, len(text) // 4)

        prompt_tokens = estimate_tokens(GEMINI_SYSTEM_PROMPT)
        print("Approx input tokens:", prompt_tokens+ image_tokens_estimate)


    except Exception as e:
        prompt_tokens = "Error calculating tokens: " + str(e)

    print("Input tokens:", prompt_tokens)
    output_tokens = estimate_tokens(resp.text)
    print("Approx total output tokens:", output_tokens)
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

UPLOAD_DIR = "uploads"
DATA_DIR = "data"


@app.route("/api/prescriptions", methods=["POST"])
def upload_and_extract():
    print(request.files)
    if "file" not in request.files:
        return jsonify({"error": "No file part 'file' found"}), 400
    print(request.form)
    f = request.files["file"]
    email = request.form.get("string") 

    if not email:
        return jsonify({"error": "Email is required"}), 400
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

        # Save prescription JSON locally
        out_filename = f"medicines_{uuid.uuid4().hex}.json"
        out_path = os.path.join(DATA_DIR, out_filename)
        with open(out_path, "w", encoding="utf-8") as fp:
            json.dump(data, fp, ensure_ascii=False, indent=2)

        # Save prescription + image in MongoDB
        with open(save_path, "rb") as img_fp:
            image_bytes = img_fp.read()

        from db_utils import save_prescription  # make sure this imports your function
        save_prescription(
            email=email,
            data=data,
            filename=out_filename,
            image_bytes=image_bytes,
            image_name=f.filename
        )

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

@app.route("/api/prescriptions/save", methods=["POST"])
def save_prescription_api():
    try:
        data = request.get_json()

        email = data.get("email")
        name = data.get("name")
        file = data.get("file")
        medicines_data = data.get("data")

        if not email or not name or not file or not medicines_data:
            return jsonify({"error": "Missing required fields"}), 400
        print("working")
        inserted_id = save_prescription_to_db(email=email, name=name, data=medicines_data, filename=file)
        print("working2")
        return jsonify({"message": "Prescription saved successfully", "id": inserted_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# Get prescriptions by email
@app.route("/api/prescriptions/<email>", methods=["GET"])
def get_prescriptions_api(email):
    try:
        prescriptions = get_prescriptions(email)
        if not prescriptions:
            return jsonify({"message": "No prescriptions found"}), 404
        return jsonify({"prescriptions": prescriptions}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Retrieve Images
from flask import send_file, jsonify, request
import io  # standard Python module

from db_utils import get_prescriptions  # use your helper from db_utils
@app.route("/api/prescriptions/images", methods=["POST"])
def get_prescription_images():
    try:
        data = request.get_json()
        if not data or "email" not in data:
            return jsonify({"error": "Email is required in request body"}), 400

        email = data["email"].strip().lower()
        prescriptions_list = get_prescriptions_with_images(email)

        if not prescriptions_list:
            return jsonify({"error": "No prescriptions found for this email"}), 404

        import base64
        images_data = []
        for pres in prescriptions_list:
            if "image_bytes" in pres and "image_name" in pres:
                img_b64 = base64.b64encode(pres["image_bytes"]).decode("utf-8")
                images_data.append({
                    "file": pres["file"],
                    "image_name": pres["image_name"],
                    "image_base64": img_b64,
                    "date": pres.get("date")
                })

        return jsonify({"email": email, "prescriptions": images_data})  

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# calender

from flask import Flask, request, jsonify   
from calendar_utils import authenticate_google, add_medicine_events
from db_utils import save_medicines


@app.route("/add_medicines", methods=["POST"])
def add_medicines():
    """
    API endpoint to save medicines to MongoDB.
    Expected JSON format:
    {
        "email": "user@example.com",
        "medicines": [...]
    }
    """
    data = request.get_json()
    if not data or "email" not in data or "medicines" not in data:
        return jsonify({"error": "Invalid request format"}), 400

    email = data["email"].strip()
    medicines = data["medicines"]
    print(data)
    try:
        save_medicines(email, medicines)
        return jsonify({"message": "Medicines saved successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500




if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
