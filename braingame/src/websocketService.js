// websocketService.js
let socket;

export function initWebSocket() {
  // Connect to your Node.js server running on localhost:3000
  socket = new WebSocket('ws://localhost:3000');

  socket.onopen = () => {
    console.log('WebSocket to Node.js server connected');
  };

  socket.onmessage = (msg) => {
    console.log('Message from server:', msg.data);
  };

  socket.onclose = () => {
    console.log('WebSocket connection closed');
  };

  socket.onerror = (err) => {
    console.error('WebSocket error:', err);
  };
}

/**
 * Sends a small JSON packet to the Node.js server.
 * E.g. sendEventToUnity('BLINK') => {type: 'BLINK'}
 */
export function sendEventToUnity(eventType) {
  if (!socket) return;
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: eventType }));
  }
}
