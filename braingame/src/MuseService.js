import { MuseClient } from 'muse-js';
import { Subject } from 'rxjs';

export class MuseService {
  constructor() {
    this.client = new MuseClient();
    this.isConnected = false;
    this.eegReadings = new Subject(); // Subject to emit EEG readings
  }

  async connect() {
    try {
      await this.client.connect();
      await this.client.start();
      this.setupSubscriptions();
      this.isConnected = true;
      console.log('Connected to Muse EEG headset');
    } catch (error) {
      console.error('Failed to connect:', error);
      this.isConnected = false;
    }
  }

  setupSubscriptions() {
    // Subscribe to EEG readings and forward them through the Subject
    this.client.eegReadings.subscribe((reading) => {
      // If needed: reading => console.log('Raw reading: ', reading);
      this.eegReadings.next(reading);
    });
  }

  getEEGObservable() {
    return this.eegReadings.asObservable();
  }
}
