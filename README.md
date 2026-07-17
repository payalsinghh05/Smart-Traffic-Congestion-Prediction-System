# 🛰️ TrafficIQ — Smart Traffic Congestion Prediction System

A web-based intelligent application that predicts traffic congestion 
levels for user-defined routes using a Machine Learning model and 
presents results through an interactive map interface.

## 🚀 Features

- 🤖 **AI Prediction** — Random Forest Classifier predicts congestion 
  as Low, Medium, or High based on time of day and traffic conditions
- 🗺️ **Interactive Map** — Leaflet.js map with up to 3 colour-coded 
  alternate routes (Street + Satellite view toggle)
- 🧭 **Turn-by-Turn Navigation** — Step-by-step directions for the 
  selected route
- 🔮 **Future Traffic Forecast** — Predict congestion for any future 
  time and day
- 📍 **GPS Location** — Auto-detect current location using browser 
  Geolocation API
- 📊 **Analytics Dashboard** — 4 Chart.js charts showing traffic 
  patterns by hour, day, and congestion distribution
- 🕓 **Search History** — Searchable, filterable log of all past 
  route searches
- ⭐ **Saved Favorites** — Save and reuse frequently travelled routes
- 👤 **User Authentication** — Secure login/register with SHA-256 
  password hashing
- 🔑 **Forgot Password** — OTP-based password reset flow

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, JavaScript (ES6+) |
| Map | Leaflet.js, Esri Tiles |
| Charts | Chart.js |
| Backend | Python, Flask, Flask-CORS |
| ML Model | Scikit-learn (Random Forest) |
| Database | SQLite3 |
| Geocoding | Nominatim (OpenStreetMap) |
| Routing | OSRM (Open Source Routing Machine) |

## 📁 Project Structure
trafficiq/
├── backend/
│   ├── app.py            # Flask REST API (9 endpoints)
│   ├── train_model.py    # ML model training script
│   ├── model.pkl         # Trained Random Forest model
│   └── users.db          # SQLite database
├── data/
│   └── traffic_data.csv  # Training dataset (299 records)
├── index.html            # Login & Register
├── dashboard.html        # Main map + route planner
├── analytics.html        # Traffic charts
├── history.html          # Search history
├── profile.html          # User profile
├── forgot_password.html  # Password reset
├── dashboard.js          # Core JavaScript logic
├── style.css             # Dashboard styles
└── theme.css             # Shared theme

## ⚡ Quick Start

1. Clone the repository
```bash
   git clone https://github.com/yourusername/trafficiq.git
   cd trafficiq
```

2. Install Python dependencies
```bash
   pip install flask flask-cors scikit-learn pandas numpy
```

3. Train the ML model
```bash
   cd backend
   python train_model.py
```

4. Start the Flask server
```bash
   python app.py
```

5. Serve the frontend
```bash
   cd ..
   python -m http.server 8080
```

6. Open your browser and go to `http://localhost:8080`

## 📊 ML Model Performance

| Class | Precision | Recall | F1-Score |
|-------|-----------|--------|----------|
| Low | 0.96 | 0.98 | 0.97 |
| Medium | 0.93 | 0.91 | 0.92 |
| High | 0.97 | 0.95 | 0.96 |
| **Overall Accuracy** | | | **95%** |

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /predict | Current congestion prediction |
| POST | /predict_future | Future time congestion forecast |
| POST | /register | User registration |
| POST | /login | User login |
| POST | /save_favorite | Save a route |
| POST | /change_password | Update password |
| POST | /check_user | Verify username (forgot password) |
| POST | /reset_password | Reset password after OTP |
| GET  | /health | Backend health check |

## 👩‍💻 Developer

**Payal Sanjay Singh**  
B.Sc. Information Technology — Sem VI  
Mulund College of Commerce (Autonomous), Mumbai  
Guide: Ms. Sandhya Pandey  
Academic Year: 2025-26


