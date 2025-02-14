import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import * as Location from "expo-location";
import { Accelerometer } from "expo-sensors";
import axios from "axios";

const SPEED_UPDATE_INTERVAL = 120000; // 2 minutes
const DATA_COLLECTION_INTERVAL = 2000; // 2 seconds
const WEATHER_UPDATE_INTERVAL = 600000; // 10 minutes
const WEATHER_API_KEY = "ecf544c55813315f92af2e113cd97d2d";

export default function App() {
  const [location, setLocation] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });
  const [weather, setWeather] = useState(null);

  // Refs for latest values
  const locationRef = useRef(null);
  const speedRef = useRef(0);
  const accelRef = useRef({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access is required for this app to function.");
        return;
      }

      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 1,
        },
        (locationData) => {
          setLocation(locationData.coords);
          locationRef.current = locationData.coords;
        }
      );
    })();

    Accelerometer.setUpdateInterval(1000);
    const accSub = Accelerometer.addListener((data) => {
      setAccelerometerData(data);
      accelRef.current = data;
    });

    const dataCollectionInterval = setInterval(() => {
      sendDataToBackend();
    }, DATA_COLLECTION_INTERVAL);

    const speedUpdateInterval = setInterval(() => {
      updateSpeedAndCheck();
    }, SPEED_UPDATE_INTERVAL);

    const weatherUpdateInterval = setInterval(() => {
      fetchWeather();
    }, WEATHER_UPDATE_INTERVAL);

    return () => {
      accSub && accSub.remove();
      clearInterval(dataCollectionInterval);
      clearInterval(speedUpdateInterval);
      clearInterval(weatherUpdateInterval);
    };
  }, []);

  const sendDataToBackend = async () => {
    if (!locationRef.current) return;

    try {
      await axios.post("http://192.168.127.141:5000/collect-data", {
        speed: speedRef.current,
        accelerometer: accelRef.current,
        location: {
          latitude: locationRef.current.latitude,
          longitude: locationRef.current.longitude,
        },
      });
    } catch (error) {
      console.error("Error sending data to backend:", error);
    }
  };

  const updateSpeedAndCheck = async () => {
    if (!locationRef.current) return;

    try {
      const latestLocation = locationRef.current;
      const newSpeed = (latestLocation.speed || 0) * 3.6; // Convert m/s to km/h
      setSpeed(newSpeed);
      speedRef.current = newSpeed;

      const speedingResponse = await axios.post("http://192.168.127.141:5000/predict-speeding", {
        speed: newSpeed,
        accelerometer: accelRef.current,
      });

      if (speedingResponse.data.alert) {
        Alert.alert(speedingResponse.data.alert);
      }
    } catch (error) {
      console.error("Error in speed update and check:", error);
    }
  };

  const fetchWeather = async () => {
    if (!locationRef.current) return;

    try {
      const { latitude, longitude } = locationRef.current;
      const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
        params: {
          lat: latitude,
          lon: longitude,
          appid: WEATHER_API_KEY,
          units: "metric",
        },
      });

      if (response.status === 200) {
        const data = response.data;
        setWeather({
          city: data.name,
          temperature: `${data.main.temp} °C`,
          feelsLike: `${data.main.feels_like} °C`,
          description: data.weather[0].description,
          humidity: `${data.main.humidity}%`,
          windSpeed: `${data.wind.speed} m/s`,
        });
      }
    } catch (error) {
      console.error("Error fetching weather data:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Speed & Climate Monitor</Text>
      <Text style={styles.text}>Speed: {speed.toFixed(2)} km/h</Text>
      <Text style={styles.text}>Accelerometer X: {accelerometerData.x.toFixed(2)}</Text>
      <Text style={styles.text}>Accelerometer Y: {accelerometerData.y.toFixed(2)}</Text>
      <Text style={styles.text}>Accelerometer Z: {accelerometerData.z.toFixed(2)}</Text>
      <Text style={styles.text}>
        Location: {location ? `${location.latitude}, ${location.longitude}` : "Fetching..."}
      </Text>

      {weather ? (
        <View style={styles.weatherContainer}>
          <Text style={styles.weatherTitle}>Weather</Text>
          <Text style={styles.text}>City: {weather.city}</Text>
          <Text style={styles.text}>Temperature: {weather.temperature}</Text>
          <Text style={styles.text}>Feels Like: {weather.feelsLike}</Text>
          <Text style={styles.text}>Description: {weather.description}</Text>
          <Text style={styles.text}>Humidity: {weather.humidity}</Text>
          <Text style={styles.text}>Wind Speed: {weather.windSpeed}</Text>
        </View>
      ) : (
        <Text style={styles.text}>Fetching Weather...</Text>
      )}
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
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  text: {
    fontSize: 18,
    marginVertical: 4,
  },
  weatherContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#d9f3ff",
    borderRadius: 8,
    alignItems: "center",
  },
  weatherTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
});

