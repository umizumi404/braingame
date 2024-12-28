import { merge } from 'rxjs';
import { filter, map, bufferTime, tap } from 'rxjs/operators';
import { channelNames } from 'muse-js';

export class JawDetectionService {
  constructor(eegObservable, handleJaw) {
    this.eegObservable = eegObservable;
    this.handleJaw = handleJaw;

    // Indices for Muse channels
    this.leftJawChannel = channelNames.indexOf('TP9');
    this.rightJawChannel = channelNames.indexOf('TP10');

    // Try lowering to see if you can detect anything
    this.threshold = 700;      
    this.bufferDuration = 300; 
    this.cooldownActive = false;
    this.cooldownTime = 500;   
  }

  startJawDetection() {
    console.log('Jaw detection started');

    const leftJaw$ = this.eegObservable.pipe(
      filter((reading) => reading.electrode === this.leftJawChannel),
      map((reading) => Math.max(...reading.samples.map(Math.abs)))
    );

    const rightJaw$ = this.eegObservable.pipe(
      filter((reading) => reading.electrode === this.rightJawChannel),
      map((reading) => Math.max(...reading.samples.map(Math.abs)))
    );

    merge(leftJaw$, rightJaw$)
      .pipe(
        bufferTime(this.bufferDuration),
        map((amplitudes) => {
          if (!amplitudes.length) return 0;
          const maxVal = Math.max(...amplitudes);
          // Debug logging
          console.log(`[JAW DEBUG] Max amplitude in buffer: ${maxVal}`);
          return maxVal;
        }),
        tap((maxAmplitude) => {
          if (maxAmplitude > this.threshold && !this.cooldownActive) {
            this.handleJaw();
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
