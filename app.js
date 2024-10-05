const express = require("express");
const http = require("http");
const mqtt = require("mqtt");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// MQTT Client configuration
const mqttHost = "64.226.123.239";
const protocol = "mqtt";
const port = "1883";

let mqttClient;
const topic = "sensor_data/DAQXE01/TICI";
// const topic = "sensor_data/energy_meter/demo_meter1";

// WebSocket to send data to the client
io.on("connection", (socket) => {
  console.log("Client connected to WebSocket");
  
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")));

// Serve the view page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
  res.sendFile(path.join(__dirname, "public/chart.html"));
});

// Connect to the MQTT broker
function connectToBroker() {
  const clientId = "client" + Math.random().toString(36).substring(7);
  const hostURL = `${protocol}://${mqttHost}:${port}`;

  const options = {
    keepalive: 60,
    clientId: clientId,
    protocolId: "MQTT",
    protocolVersion: 4,
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
  };

  mqttClient = mqtt.connect(hostURL, options);

  mqttClient.on("error", (err) => {
    console.log("Error: ", err);
    mqttClient.end();
  });

  mqttClient.on("reconnect", () => {
    console.log("Reconnecting...");
  });

  mqttClient.on("connect", () => {
    console.log("Client connected: " + clientId);
    mqttClient.subscribe(topic, { qos: 0 });
  });

  mqttClient.on("message", (topic, message) => {
    const messageData = message.toString();
    // console.log(`Received Message: ${messageData} on topic: ${topic}`);

    // Broadcast MQTT data to all connected WebSocket clients
    io.emit("mqtt_data", messageData);
  });
}

connectToBroker();

const portServer = 3000;
server.listen(portServer, () => {
  console.log(`Server listening on port ${portServer}`);
});
