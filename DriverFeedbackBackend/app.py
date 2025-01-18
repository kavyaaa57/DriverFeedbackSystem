from flask import Flask, request, jsonify
import joblib
import numpy as np
import json
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load the trained ML model
model = joblib.load('speeding_model.pkl')

# Endpoint to collect data
@app.route('/collect-data', methods=['POST'])
def collect_data():
    try:
        data = request.json
        print("Received Data:", data)

        # Save data to a file
        with open("collected_data.json", "a") as file:
            file.write(json.dumps(data) + "\n")  # Save as valid JSON

        return jsonify({"message": "Data received successfully!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# Endpoint to predict speeding
@app.route('/predict-speeding', methods=['POST'])
def predict_speeding():
    try:
        # Parse incoming data
        data = request.json
        speed = data['speed']
        accel_x = data['accelerometer']['x']
        accel_y = data['accelerometer']['y']
        accel_z = data['accelerometer']['z']

        # Prepare features for prediction
        features = np.array([[speed, accel_x, accel_y, accel_z]])
        prediction = model.predict(features)
        print(f"Prediction: {prediction}")  # Debugging output

        # Return the result
        if prediction[0] == 1:
            return jsonify({"alert": "Speeding detected! Please slow down.", "safe": False})
        else:
            return jsonify({"alert": "Driving safely.", "safe": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
