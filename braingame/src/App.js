import React, { useState, useEffect } from 'react';
import { MuseService } from './MuseService';
import { MultiDetectionService } from './MultiDetectionService';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [museService, setMuseService] = useState(null);

  useEffect(() => {
    // Initialize the MuseService once
    const newMuseService = new MuseService();
    setMuseService(newMuseService);
  }, []);

  // Example callbacks
  const handleEyeBlink = () => {
    console.log('App-level: Eyes blinked callback triggered');
  };

  const handleJawClench = () => {
    console.log('App-level: Jaw clenched callback triggered');
  };

  const handleConnectClick = async () => {
    if (!museService) return;
    await museService.connect();
    setIsConnected(museService.isConnected);

    if (museService.isConnected) {
      const eegObservable = museService.getEEGObservable();

      // Create the multi-detection service
      const detectionService = new MultiDetectionService(
        eegObservable,
        handleEyeBlink,
        handleJawClench
      );
      // Start the detection pipeline
      detectionService.start();
    }
  };

  return (
    <div>
      <h1>Muse EEG Data App</h1>
      <button onClick={handleConnectClick} disabled={isConnected}>
        {isConnected ? 'Connected' : 'Connect to Muse'}
      </button>
    </div>
  );
}

export default App;
