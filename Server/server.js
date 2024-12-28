const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('A client connected');

  // Listen for messages from the client
  ws.on('message', (data) => {
    console.log('Message from client:', data);
    // Broadcast to all connected clients (including Unity)
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

app.get('/', (req, res) => {
  res.send('WebSocket server is running!');
});

const port = 3000;
server.listen(port, () => {
  console.log("Server is listening on http://localhost:${port}");
});