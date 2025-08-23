from pymongo import MongoClient
from datetime import datetime
import os
from pymongo.mongo_client import MongoClient
from dotenv import load_dotenv
import gridfs

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["medicines_db"]
fs = gridfs.GridFS(db)
prescriptions = db["prescriptions"]
medicines_collection = db["medicines"]

def save_prescription(email, data=None, filename=None, image_bytes=None, image_name=None):
    """
    Save a prescription JSON and its image for a user.
    - email: user's email
    - data: extracted medicine data (dict)
    - filename: JSON filename (string)
    - image_bytes: raw image bytes (binary)
    - image_name: original image filename
    """
    record = prescriptions.find_one({"email": email})

    entry = {
        "file": filename if filename else f"medicines_{int(datetime.now().timestamp())}.json",
        "data": data if data else {},
        "image_name": image_name if image_name else "unknown",
        "image_bytes": image_bytes,  # store binary
        "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    if record:
        # Append new prescription
        email = email.strip()
        prescriptions.update_one(
            {"email": email},
            {"$push": {"prescriptions": entry}}
        )
    else:
        # Create new user with first prescription
        prescriptions.insert_one({
            "email": email,
            "prescriptions": [entry]
        })

    return True


def get_prescriptions(email):
    """Fetch all prescriptions for a user (without exposing image bytes directly)."""
    record = prescriptions.find_one({"email": email}, {"_id": 0, "prescriptions.image_bytes": 0})
    if record and "prescriptions" in record:
        return record["prescriptions"]
    return []

def get_prescriptions_with_images(email):
    """Fetch all prescriptions including image bytes."""
    email = email.strip().lower()
    record = prescriptions.find_one({"email": email}, {"_id": 0})
    if record and "prescriptions" in record:
        return record["prescriptions"]
    return []


def save_prescription_to_db(email, name, data, filename=None):
    """
    Save prescription JSON for a user (multiple allowed).
    Returns True if successful, False otherwise.
    """
    try:
        load_dotenv()
        MONGO_URI = os.getenv("MONGO_URI")
        if not MONGO_URI:
            raise ValueError("MONGO_URI environment variable not set")

        client = MongoClient(MONGO_URI)
        db = client["medicines_db"]
        prescriptions = db["prescriptions"]

        # Ensure correct format
        prescription_entry = {
            "file": filename if filename else f"medicines_{int(datetime.now().timestamp())}.json",
            "data": {
                "medicines": data.get("medicines", [])
            },
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        # Check if user record exists
        record = prescriptions.find_one({"email": email})

        if record:
            # Append new prescription
            prescriptions.update_one(
                {"email": email},
                {"$push": {"prescriptions": prescription_entry}}
            )
        else:
            # Create new user with first prescription
            prescriptions.insert_one({
                "email": email,
                "name": name,
                "prescriptions": [prescription_entry]
            })

        return True

    except Exception as e:
        print(f"Error saving prescription: {e}")
        return False

def get_prescriptions(email):
    """Fetch all prescriptions for a user."""
    record = prescriptions.find_one({"email": email}, {"_id": 0})
    if record:
        return record["prescriptions"]
    return []


# ✅ New helper: get latest prescription for a user
def get_latest_prescription(email):
    """Fetch the most recent prescription for a user."""
    record = prescriptions.find_one({"email": email}, {"_id": 0})
    if record and "prescriptions" in record:
        return record["prescriptions"][-1]  # Last added
    return None


# ✅ New helper: delete a prescription by filename
def delete_prescription(email, filename):
    """Delete a specific prescription for a user by filename."""
    result = prescriptions.update_one(
        {"email": email},
        {"$pull": {"prescriptions": {"file": filename}}}
    )
    return result.modified_count > 0
#Add medicines to db
from datetime import datetime

def save_medicines(email: str, medicines: list):
    """
    Save or update medicines for a given email.
    If email exists, append new medicines to the list.
    Adds a 'duration_days' field for each medicine.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Add duration_days for each medicine
    for med in medicines:
        start_date = datetime.strptime(med["start_date"], "%Y-%m-%d")
        end_date = datetime.strptime(med["end_date"], "%Y-%m-%d")
        med["duration_days"] = (end_date - start_date).days + 1  # inclusive of start & end

    # Check if user already exists
    record = medicines_collection.find_one({"email": email})

    if record:
        # Append new medicines
        updated_medicines = record.get("medicines", []) + medicines
        medicines_collection.update_one(
            {"email": email},
            {"$set": {"medicines": updated_medicines, "updated_at": now}}
        )
    else:
        # Insert new record
        medicines_collection.insert_one({
            "email": email,
            "medicines": medicines,
            "created_at": now,
            "updated_at": now
        })
