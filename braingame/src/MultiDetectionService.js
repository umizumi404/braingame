// MultiDetectionService.js

import { merge, combineLatest } from 'rxjs';
import { filter, map, bufferTime } from 'rxjs/operators';
import { channelNames } from 'muse-js';
import { sendEventToUnity } from './websocketService'; 
// ↑ This should export initWebSocket() and sendEventToUnity(eventType).

export class MultiDetectionService {
  constructor(eegObservable, onEyeBlink, onJawClench) {
    this.eegObservable = eegObservable;
    this.onEyeBlink = onEyeBlink;    // Callback in React (optional)
    this.onJawClench = onJawClench;  // Callback in React (optional)

    // Thresholds for detection (tweak as needed)
    this.eyeThreshold = 300;
    this.jawThreshold = 500;

    // How frequently we buffer EEG amplitude (ms)
    this.bufferDuration = 300;

    // After triggering, ignore further detections for this long (ms)
    this.cooldownDuration = 1000;
    this.cooldownActive = false;

    // Indices for channels (check channelNames matches your device)
    this.leftEyeChannel = channelNames.indexOf('AF7');
    this.rightEyeChannel = channelNames.indexOf('AF8');
    this.leftJawChannel = channelNames.indexOf('TP9');
    this.rightJawChannel = channelNames.indexOf('TP10');
  }

  start() {
    console.log('Starting unified detection (winner-takes-all approach).');

    // ===== EYE STREAM =====
    const eyeLeft$ = this.eegObservable.pipe(
      filter((reading) => reading.electrode === this.leftEyeChannel),
      map((reading) => Math.max(...reading.samples.map(Math.abs)))
    );
    const eyeRight$ = this.eegObservable.pipe(
      filter((reading) => reading.electrode === this.rightEyeChannel),
      map((reading) => Math.max(...reading.samples.map(Math.abs)))
    );

    // Merge left + right eye channels, buffer, extract max amplitude in that window
    const eye$ = merge(eyeLeft$, eyeRight$).pipe(
      bufferTime(this.bufferDuration),
      map((samples) => (samples.length ? Math.max(...samples) : 0))
    );

    // ===== JAW STREAM =====
    const jawLeft$ = this.eegObservable.pipe(
      filter((reading) => reading.electrode === this.leftJawChannel),
      map((reading) => Math.max(...reading.samples.map(Math.abs)))
    );
    const jawRight$ = this.eegObservable.pipe(
      filter((reading) => reading.electrode === this.rightJawChannel),
      map((reading) => Math.max(...reading.samples.map(Math.abs)))
    );

    // Merge left + right jaw channels, buffer, extract max amplitude
    const jaw$ = merge(jawLeft$, jawRight$).pipe(
      bufferTime(this.bufferDuration),
      map((samples) => (samples.length ? Math.max(...samples) : 0))
    );

    // ===== COMBINE EYE AND JAW =====
    combineLatest([eye$, jaw$]).subscribe(([eyeAmp, jawAmp]) => {
      // If in cooldown, skip detection
      if (this.cooldownActive) return;

      console.log(`[BLINK DEBUG] Eye amplitude: ${eyeAmp}`);
      console.log(`[JAW DEBUG]   Jaw amplitude: ${jawAmp}`);

      const eyePassed = eyeAmp > this.eyeThreshold;
      const jawPassed = jawAmp > this.jawThreshold;

      // If neither passes threshold, do nothing
      if (!eyePassed && !jawPassed) return;

      // If only one passes, pick that. If both pass, pick whichever amplitude is higher.
      if (eyePassed && !jawPassed) {
        this.triggerEye();
      } else if (!eyePassed && jawPassed) {
        this.triggerJaw();
      } else {
        // Both pass => "winner-takes-all"
        if (eyeAmp > jawAmp) {
          this.triggerEye();
        } else {
          this.triggerJaw();
        }
      }
    });
  }

  // ===== TRIGGER EYE DETECTION =====
  triggerEye() {
    console.log('Eyes blinked!');
    this.onEyeBlink?.();            // Optional callback in React
    sendEventToUnity('BLINK');      // Send to Node.js => Unity
    this.startCooldown();
  }

  // ===== TRIGGER JAW DETECTION =====
  triggerJaw() {
    console.log('Jaw clenched!');
    this.onJawClench?.();
    sendEventToUnity('JAW');
    this.startCooldown();
  }

  // ===== PREVENT SPAMMING =====
  startCooldown() {
    this.cooldownActive = true;
    setTimeout(() => {
      this.cooldownActive = false;
    }, this.cooldownDuration);
  }
}
