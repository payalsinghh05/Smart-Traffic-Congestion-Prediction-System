import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import pickle
import os

# Get the current directory of this script
base_path = os.path.dirname(__file__)

# Path to the data file (relative to this script)
data_path = os.path.join(base_path, "..", "data", "traffic_data.csv")

# Load dataset
try:
    data = pd.read_csv(data_path)
except FileNotFoundError:
    print(f"Error: Could not find traffic_data.csv at {data_path}")
    exit()

X = data[['hour', 'day', 'vehicle_count', 'avg_speed']]
y = data['congestion']

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train model
model = RandomForestClassifier()
model.fit(X_train, y_train)

# Save model in the same folder as this script
model_save_path = os.path.join(base_path, "model.pkl")
with open(model_save_path, "wb") as f:
    pickle.dump(model, f)

print(f"Success! Model trained and saved to: {model_save_path}")