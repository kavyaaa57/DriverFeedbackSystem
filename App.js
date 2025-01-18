import React, { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet, Alert } from "react-native";
import * as Location from "expo-location";
import { Accelerometer } from "expo-sensors";
import axios from "axios";

export default function App() {
  const [location, setLocation] = useState(null); // GPS location data
  const [speed, setSpeed] = useState(0); // Speed in km/h
  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 }); // Accelerometer data

  // Request permissions for location and accelerometer
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access is required for this app to function.");
        return;
      }
    })();

    // Set accelerometer update interval to 1 second
    Accelerometer.setUpdateInterval(1000);
  }, []);

  // Start collecting GPS and accelerometer data
  const startDataCollection = () => {
    // Start watching location updates
    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000, // Update every second
        distanceInterval: 1, // Update if moved 1 meter
      },
      (locationData) => {
        setLocation(locationData.coords);
        setSpeed((locationData.coords.speed || 0) * 3.6); // Convert speed from m/s to km/h
      }
    );

    // Start listening to accelerometer updates
    Accelerometer.addListener((data) => {
      setAccelerometerData(data);
    });
  };

  // Send collected data to the Flask backend
  const sendDataToBackend = async () => {
    if (!location) {
      Alert.alert("Data Missing", "GPS data is not available yet.");
      return;
    }

    try {
      const response = await axios.post("http://192.168.223.123:5000/collect-data", {
        speed,
        accelerometer: accelerometerData,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
      });

      Alert.alert("Success", response.data.message);

      // Call the predict-speeding endpoint after collecting data
      const speedingResponse = await axios.post("http://192.168.223.123:5000/predict-speeding", {
        speed,
        accelerometer: accelerometerData,
      });

      if (speedingResponse.data.alert) {
        Alert.alert(speedingResponse.data.alert); // Show the alert message
      }
    } catch (error) {
      console.error("Error sending data to backend:", error);
      Alert.alert("Error", "Failed to send data to the backend. Check your connection.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Speed: {speed.toFixed(2)} km/h</Text>
      <Text style={styles.text}>Accelerometer X: {accelerometerData.x.toFixed(2)}</Text>
      <Text style={styles.text}>Accelerometer Y: {accelerometerData.y.toFixed(2)}</Text>
      <Text style={styles.text}>Accelerometer Z: {accelerometerData.z.toFixed(2)}</Text>
      <Text style={styles.text}>
        Location: {location ? `${location.latitude}, ${location.longitude}` : "Fetching..."}
      </Text>
      <View style={styles.button}>
        <Button title="Start Data Collection" onPress={startDataCollection} />
      </View>
      <View style={styles.button}>
        <Button title="Send Data to Backend" onPress={sendDataToBackend} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  text: {
    fontSize: 18,
    marginVertical: 8,
  },
  button: {
    marginVertical: 10,
    width: "80%",
  },
});
