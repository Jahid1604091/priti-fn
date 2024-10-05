const express = require("express");
const http = require("http");
const mqtt = require("mqtt");
const { Server } = require("socket.io");
const path = require("path");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Load environment variables
const mqttHost = process.env.MQTT_HOST;
const mqttProtocol = process.env.MQTT_PROTOCOL || "mqtt";
const mqttPort = process.env.MQTT_PORT || 1883;
const mqttTopic = process.env.MQTT_TOPIC || "sensor_data/energy_meter/demo_meter1";
const webPort = process.env.PORT || 3000;

let mqttClient;

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Serve the index.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// WebSocket communication
io.on("connection", (socket) => {
  console.log("SOCKET Client connected to WebSocket");

  socket.on("disconnect", () => {
    console.log("SOCKET Client disconnected");
  });
});

// MQTT connection logic
function connectToMQTTBroker() {
  const clientId = `client_${Math.random().toString(36).substr(2, 9)}`;
  const mqttURL = `${mqttProtocol}://${mqttHost}:${mqttPort}`;

  const options = {
    clientId,
    keepalive: 60,
    clean: true,
    reconnectPeriod: 1000, // Retry after 1 second
    connectTimeout: 30 * 1000, // 30-second timeout
  };

  mqttClient = mqtt.connect(mqttURL, options);

  mqttClient.on("connect", () => {
    console.log(`MQTT Client connected: ${clientId}`);
    mqttClient.subscribe(mqttTopic, { qos: 0 }, (err) => {
      if (err) {
        console.error(`Failed to subscribe to topic ${mqttTopic}:`, err);
      } else {
        console.log(`Subscribed to topic: ${mqttTopic}`);
      }
    });
  });

  mqttClient.on("message", (topic, message) => {
    try {
      const messageData = message.toString();
      // Broadcast to WebSocket clients
      io.emit("mqtt_data", messageData);
    } catch (error) {
      console.error("Error parsing MQTT message:", error);
    }
  });

  mqttClient.on("reconnect", () => {
    console.log("Reconnecting to MQTT broker...");
  });

  mqttClient.on("error", (err) => {
    console.error("MQTT Error:", err);
    mqttClient.end();
  });

  mqttClient.on("close", () => {
    console.log("MQTT connection closed");
  });
}

// Establish the MQTT connection
connectToMQTTBroker();

// Start the web server
server.listen(webPort, () => {
  console.log(`Server listening on port ${webPort}`);
});

