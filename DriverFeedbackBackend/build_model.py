import pandas as pd
import numpy as np
import json
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib

# Step 1: Load dataset from the fixed JSON file
data = []
with open("collected_data.json", "r") as file:
    for line in file:
        data.append(json.loads(line.strip()))  # Parse each JSON line

# Convert to DataFrame
df = pd.DataFrame(data)

# Step 2: Preprocess the data
# Extract accelerometer data into separate columns
df['accel_x'] = df['accelerometer'].apply(lambda x: x['x'])
df['accel_y'] = df['accelerometer'].apply(lambda x: x['y'])
df['accel_z'] = df['accelerometer'].apply(lambda x: x['z'])

# Drop unnecessary columns
df = df.drop(columns=['accelerometer', 'location'])

# Filter out rows where speed is very low (e.g., less than 0.5 km/h, noise)
df = df[df['speed'] > 0.5]

# Define a speed limit (example: 60 km/h)
speed_limit = 60

# Create the target column: 1 for speeding, 0 for safe driving
df['speeding'] = (df['speed'] > speed_limit).astype(int)

# Step 3: Prepare features and target
X = df[['speed', 'accel_x', 'accel_y', 'accel_z']]  # Features
y = df['speeding']  # Target

# Step 4: Split the dataset into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

# Step 5: Train the Random Forest model
model = RandomForestClassifier(random_state=42)
model.fit(X_train, y_train)

# Step 6: Evaluate the model
y_pred = model.predict(X_test)
print("Model Accuracy:", accuracy_score(y_test, y_pred))
print("\nClassification Report:\n", classification_report(y_test, y_pred))

# Step 7: Save the trained model
joblib.dump(model, 'speeding_model.pkl')
print("Model saved as 'speeding_model.pkl'")
