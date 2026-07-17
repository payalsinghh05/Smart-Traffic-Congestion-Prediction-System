"""
TrafficIQ — Flask Backend v4.0
New: phone number in registration, /predict_future endpoint
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle, numpy as np, sqlite3, hashlib, os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        return response

base_path  = os.path.dirname(__file__)
MODEL_PATH = os.path.join(base_path, "model.pkl")
DB_PATH    = os.path.join(base_path, "users.db")

# ── Load Model ──────────────────────────────────────────────
try:
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
    print("✅ Model loaded.")
except FileNotFoundError:
    print("❌ model.pkl not found. Run train_model.py first.")
    model = None

# ── DB Setup ────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute('''CREATE TABLE IF NOT EXISTS users (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone    TEXT DEFAULT ""
    )''')
    # Safely add phone column if upgrading from old DB
    try:
        conn.execute("ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''")
        print("✅ Added phone column to users table.")
    except Exception:
        pass  # Already exists
    conn.execute('''CREATE TABLE IF NOT EXISTS favorites (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL,
        source      TEXT NOT NULL,
        destination TEXT NOT NULL,
        saved_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.commit()
    conn.close()
    print("✅ Database ready.")

init_db()

def hash_pw(p):
    return hashlib.sha256(p.encode()).hexdigest()

# ── Current Prediction ───────────────────────────────────────
@app.route("/predict", methods=["POST"])
def predict():
    if model is None:
        return jsonify({"error": "Model not loaded."}), 503
    data = request.get_json()
    try:
        feat = np.array([[data["hour"], data["day"], data["vehicle_count"], data["avg_speed"]]])
        return jsonify({"congestion": str(model.predict(feat)[0])})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# ── Future Traffic Prediction ────────────────────────────────
@app.route("/predict_future", methods=["POST"])
def predict_future():
    """Predict congestion for a user-chosen future time."""
    if model is None:
        return jsonify({"error": "Model not loaded."}), 503
    data = request.get_json()
    try:
        hour          = int(data["hour"])
        day           = int(data["day"])
        vehicle_count = int(data.get("vehicle_count", 80))
        avg_speed     = int(data.get("avg_speed", 35))
        feat   = np.array([[hour, day, vehicle_count, avg_speed]])
        result = str(model.predict(feat)[0])
        tips   = {
            "High":   "Expect heavy congestion. Leave earlier or take an alternate route.",
            "Medium": "Moderate traffic expected. Plan for some delays.",
            "Low":    "Roads should be clear. Great time to travel!"
        }
        days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
        return jsonify({
            "congestion": result,
            "tip":        tips.get(result, ""),
            "hour":       hour,
            "day_name":   days[day]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# ── Register (with phone) ────────────────────────────────────
@app.route("/register", methods=["POST"])
def register():
    data  = request.get_json()
    u     = data.get("username", "").strip()
    p     = data.get("password", "").strip()
    phone = data.get("phone", "").strip()
    if not u or not p:
        return jsonify({"message": "Username and password are required."}), 400
    if len(p) < 4:
        return jsonify({"message": "Password must be at least 4 characters."}), 400
    if phone and (not phone.isdigit() or len(phone) < 10):
        return jsonify({"message": "Please enter a valid 10-digit phone number."}), 400
    conn = get_db()
    try:
        conn.execute("INSERT INTO users (username, password, phone) VALUES (?,?,?)", (u, hash_pw(p), phone))
        conn.commit()
        return jsonify({"message": "✓ Registered successfully! You can now login."}), 201
    except sqlite3.IntegrityError:
        return jsonify({"message": "Username already taken. Please choose another."}), 409
    finally:
        conn.close()

# ── Login ─────────────────────────────────────────────────────
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    u    = data.get("username", "").strip()
    p    = data.get("password", "").strip()
    if not u or not p:
        return jsonify({"message": "All fields required."}), 400
    conn = get_db()
    user = conn.execute(
        "SELECT id, phone FROM users WHERE username=? AND password=?", (u, hash_pw(p))
    ).fetchone()
    conn.close()
    if user:
        return jsonify({"user_id": user["id"], "phone": user["phone"] or "", "message": "Login successful!"})
    return jsonify({"message": "Invalid username or password."}), 401

# ── Change Password ───────────────────────────────────────────
@app.route("/change_password", methods=["POST"])
def change_password():
    data     = request.get_json()
    user_id  = data.get("user_id")
    old_pass = data.get("old_password", "").strip()
    new_pass = data.get("new_password", "").strip()
    if not all([user_id, old_pass, new_pass]):
        return jsonify({"message": "All fields required."}), 400
    if len(new_pass) < 4:
        return jsonify({"message": "New password too short."}), 400
    conn = get_db()
    user = conn.execute(
        "SELECT id FROM users WHERE id=? AND password=?", (user_id, hash_pw(old_pass))
    ).fetchone()
    if not user:
        conn.close()
        return jsonify({"message": "Current password is incorrect."}), 401
    conn.execute("UPDATE users SET password=? WHERE id=?", (hash_pw(new_pass), user_id))
    conn.commit(); conn.close()
    return jsonify({"message": "✓ Password updated successfully!"})

# ── Check User (forgot password) ──────────────────────────────
@app.route("/check_user", methods=["POST"])
def check_user():
    data = request.get_json()
    u    = data.get("username", "").strip()
    if not u:
        return jsonify({"message": "Username required."}), 400
    conn = get_db()
    user = conn.execute("SELECT id, phone FROM users WHERE username=?", (u,)).fetchone()
    conn.close()
    if user:
        phone  = user["phone"] or ""
        masked = ("*" * max(0, len(phone) - 4) + phone[-4:]) if len(phone) >= 4 else "****"
        return jsonify({"message": "User found.", "user_id": user["id"], "phone_hint": masked})
    return jsonify({"message": "Username not found."}), 404

# ── Reset Password ────────────────────────────────────────────
@app.route("/reset_password", methods=["POST"])
def reset_password():
    data = request.get_json()
    u    = data.get("username", "").strip()
    new  = data.get("new_password", "").strip()
    if not u or not new:
        return jsonify({"message": "All fields required."}), 400
    if len(new) < 4:
        return jsonify({"message": "Password too short."}), 400
    conn = get_db()
    res  = conn.execute("UPDATE users SET password=? WHERE username=?", (hash_pw(new), u))
    conn.commit(); conn.close()
    if res.rowcount:
        return jsonify({"message": "✓ Password reset successfully!"})
    return jsonify({"message": "User not found."}), 404

# ── Save Favorite ─────────────────────────────────────────────
@app.route("/save_favorite", methods=["POST"])
def save_favorite():
    data = request.get_json()
    uid  = data.get("user_id")
    src  = data.get("source", "").strip()
    dest = data.get("destination", "").strip()
    if not uid or not src or not dest:
        return jsonify({"message": "Missing fields."}), 400
    conn = get_db()
    conn.execute("INSERT INTO favorites (user_id, source, destination) VALUES (?,?,?)", (uid, src, dest))
    conn.commit(); conn.close()
    return jsonify({"message": "✓ Favorite saved!"}), 201

# ── Get Favorites ─────────────────────────────────────────────
@app.route("/favorites", methods=["GET"])
def get_favorites():
    uid = request.args.get("user_id")
    if not uid:
        return jsonify({"error": "user_id required"}), 400
    conn = get_db()
    rows = conn.execute(
        "SELECT id, source, destination, saved_at FROM favorites WHERE user_id=? ORDER BY saved_at DESC LIMIT 20",
        (uid,)
    ).fetchall()
    conn.close()
    return jsonify({"favorites": [dict(r) for r in rows]})

# ── Health ────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model_loaded": model is not None})

if __name__ == "__main__":
    print("\n🚀 TrafficIQ Backend v4.0 → http://127.0.0.1:5000")
    print("📡 /predict  /predict_future  /register  /login")
    print("📡 /change_password  /check_user  /reset_password")
    print("📡 /save_favorite  /favorites  /health\n")
    app.run(debug=True, port=5000)