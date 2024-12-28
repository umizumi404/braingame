import { merge, combineLatest } from 'rxjs';
import { filter, map, bufferTime } from 'rxjs/operators';
import { channelNames } from 'muse-js';

export class MultiDetectionService {
  constructor(eegObservable, onEyeBlink, onJawClench) {
    this.eegObservable = eegObservable;
    this.onEyeBlink = onEyeBlink;
    this.onJawClench = onJawClench;

    // Thresholds (adjust based on your actual amplitude logs)
    this.eyeThreshold = 300;
    this.jawThreshold = 300;

    // How long to ignore after one detection, in ms
    this.cooldownDuration = 1000;
    this.cooldownActive = false;

    // Channels (confirm these indices match your Muse device)
    this.leftEyeChannel = channelNames.indexOf('AF7');
    this.rightEyeChannel = channelNames.indexOf('AF8');
    this.leftJawChannel = channelNames.indexOf('TP9');
    this.rightJawChannel = channelNames.indexOf('TP10');

    // Buffer each channel’s data for 300 ms so we can look for a single max in that window
    this.bufferMs = 300;
  }

  start() {
    console.log('Starting unified detection with winner-takes-all approach.');

    // 1. Eye channels => single stream that emits the max amplitude of AF7/AF8 every 300 ms
    const eyeLeft$ = this.eegObservable.pipe(
      filter((r) => r.electrode === this.leftEyeChannel),
      map((r) => Math.max(...r.samples.map(Math.abs)))
    );
    const eyeRight$ = this.eegObservable.pipe(
      filter((r) => r.electrode === this.rightEyeChannel),
      map((r) => Math.max(...r.samples.map(Math.abs)))
    );

    // Merge the two eye channels, then buffer the merged stream
    const eye$ = merge(eyeLeft$, eyeRight$).pipe(
      bufferTime(this.bufferMs),
      map((values) => (values.length ? Math.max(...values) : 0))
    );

    // 2. Jaw channels => single stream for TP9/TP10
    const jawLeft$ = this.eegObservable.pipe(
      filter((r) => r.electrode === this.leftJawChannel),
      map((r) => Math.max(...r.samples.map(Math.abs)))
    );
    const jawRight$ = this.eegObservable.pipe(
      filter((r) => r.electrode === this.rightJawChannel),
      map((r) => Math.max(...r.samples.map(Math.abs)))
    );

    // Merge the two jaw channels, then buffer
    const jaw$ = merge(jawLeft$, jawRight$).pipe(
      bufferTime(this.bufferMs),
      map((values) => (values.length ? Math.max(...values) : 0))
    );

    // 3. Compare eye vs. jaw each time they emit
    //    combineLatest => we get [eyeAmplitude, jawAmplitude]
    combineLatest([eye$, jaw$]).subscribe(([eyeAmp, jawAmp]) => {
      // If we’re in cooldown, skip
      if (this.cooldownActive) return;

      // Debug logs
      console.log(`[BLINK DEBUG] Eye amplitude: ${eyeAmp}`);
      console.log(`[JAW DEBUG] Jaw amplitude:  ${jawAmp}`);

      // If neither passes its threshold, do nothing
      const eyePassed = eyeAmp > this.eyeThreshold;
      const jawPassed = jawAmp > this.jawThreshold;

      if (!eyePassed && !jawPassed) {
        return;
      }

      // If one passes but not the other, pick that. If both pass, pick whichever is higher
      if (eyePassed && !jawPassed) {
        this.triggerEye();
      } else if (jawPassed && !eyePassed) {
        this.triggerJaw();
      } else {
        // Both passed => pick "winner" by amplitude
        if (eyeAmp > jawAmp) {
          this.triggerEye();
        } else {
          this.triggerJaw();
        }
      }
    });
  }

  triggerEye() {
    console.log('Eyes blinked!');
    this.onEyeBlink?.();
    this.startCooldown();
  }

  triggerJaw() {
    console.log('Jaw clenched!');
    this.onJawClench?.();
    this.startCooldown();
  }

  startCooldown() {
    this.cooldownActive = true;
    setTimeout(() => {
      this.cooldownActive = false;
    }, this.cooldownDuration);
  }
}
