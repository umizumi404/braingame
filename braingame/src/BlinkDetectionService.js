import { merge } from 'rxjs';
import { filter, map, bufferTime, tap } from 'rxjs/operators';
import { channelNames } from 'muse-js';

export class BlinkDetectionService {
  constructor(eegObservable, handleBlink) {
    this.eegObservable = eegObservable;
    this.handleBlink = handleBlink;

    // Indices for Muse channels:
    this.leftEyeChannel = channelNames.indexOf('AF7');
    this.rightEyeChannel = channelNames.indexOf('AF8');

    // Try increasing threshold to reduce false positives
    this.threshold = 950;      
    this.bufferDuration = 300; 
    this.cooldownActive = false;
    this.cooldownTime = 500;   
  }

  startBlinkDetection() {
    console.log('Blink detection started');

    const leftEye$ = this.eegObservable.pipe(
      filter((reading) => reading.electrode === this.leftEyeChannel),
      map((reading) => Math.max(...reading.samples.map(Math.abs)))
    );

    const rightEye$ = this.eegObservable.pipe(
      filter((reading) => reading.electrode === this.rightEyeChannel),
      map((reading) => Math.max(...reading.samples.map(Math.abs)))
    );

    merge(leftEye$, rightEye$)
      .pipe(
        bufferTime(this.bufferDuration),
        map((amplitudes) => {
          if (!amplitudes.length) return 0;
          const maxVal = Math.max(...amplitudes);
          // Debug logging
          console.log(`[BLINK DEBUG] Max amplitude in buffer: ${maxVal}`);
          return maxVal;
        }),
        tap((maxAmplitude) => {
          if (maxAmplitude > this.threshold && !this.cooldownActive) {
            this.handleBlink();
            this.triggerCooldown();
          }
        })
      )
      .subscribe();
  }

  triggerCooldown() {
    this.cooldownActive = true;
    setTimeout(() => {
      this.cooldownActive = false;
    }, this.cooldownTime);
  }
}
