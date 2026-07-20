window.angular
  .module('audioGraphConcept', [])
  .model('synthModel', () => ({
    frequency: 440,
    volume: 0.1,
    playing: false,
  }))
  .controller(
    'DemoCtrl',
    class {
      static $inject = ['synthModel'];

      constructor(synthModel) {
        this.synth = synthModel;
        this.audio = null;
        this.oscillator = null;
        this.gain = null;
      }

      toggle() {
        if (this.synth.playing) {
          this.stop();
        } else {
          this.start();
        }
      }

      start() {
        this.audio = this.audio || new AudioContext();
        this.oscillator = this.audio.createOscillator();
        this.gain = this.audio.createGain();

        this.oscillator.connect(this.gain);
        this.gain.connect(this.audio.destination);
        this.oscillator.start();
        this.synth.playing = true;
        this.sync();
      }

      stop() {
        this.oscillator?.stop();
        this.oscillator = null;
        this.gain = null;
        this.synth.playing = false;
      }

      sync() {
        if (!this.oscillator || !this.gain) return;

        this.oscillator.frequency.value = Number(this.synth.frequency);
        this.gain.gain.value = Number(this.synth.volume);
        requestAnimationFrame(() => this.sync());
      }
    },
  );

