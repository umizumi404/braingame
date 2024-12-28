import React, { useState, useEffect } from 'react';
import { MuseService } from './MuseService';
import { MultiDetectionService } from './MultiDetectionService';
// Or if you still use separate Blink/Jaw services, adjust accordingly
import { initWebSocket } from './websocketService';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [museService, setMuseService] = useState(null);

  useEffect(() => {
    // Start the WebSocket connection so we can send events to the server
    initWebSocket();

    // Instantiate MuseService
    const newMuseService = new MuseService();
    setMuseService(newMuseService);
  }, []);

  // Your detection callbacks
  const handleBlink = () => {
    console.log('Eyes blinked!');
    // We'll handle sending the event in the detection service or here (see below)
  };

  const handleJaw = () => {
    console.log('Jaws clenched!');
    // We'll handle sending the event in the detection service or here (see below)
  };

  const handleConnectClick = async () => {
    if (museService) {
      await museService.connect();
      setIsConnected(museService.isConnected);

      if (museService.isConnected) {
        const eegObservable = museService.getEEGObservable();

        // If using the "winner-takes-all" combined detection:
        const detectionService = new MultiDetectionService(
          eegObservable,
          handleBlink,
          handleJaw
        );
        detectionService.start();
      }
    }
  };

  return (
    <div>
      <h1>Muse EEG Data App</h1>
      <button onClick={handleConnectClick} disabled={isConnected}>
        {isConnected ? 'Connected' : 'Connect to Muse Headset'}
      </button>
    </div>
  );
}

export default App;
