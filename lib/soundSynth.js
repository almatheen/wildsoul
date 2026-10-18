// Zero-cost Web Audio API Synthesizer with Audio Analyser for Real-Time Oscilloscope Visualizer
let activeAudioContext = null;
let masterGainNode = null;
let analyserNode = null;
let masterVolume = 0.8;
let currentOsc = null;
let currentCb = null;

/** Stop whatever demonstration tone is playing. */
export function stopAnimalSound() {
  const osc = currentOsc;
  const cb = currentCb;
  currentOsc = null;
  currentCb = null;
  if (osc) { try { osc.stop(); } catch (e) { /* already stopped */ } }
  if (cb) cb(false);
}

export function getAudioAnalyser() {
  return analyserNode;
}

export function setMasterVolume(val) {
  masterVolume = Math.max(0, Math.min(1, val));
  if (masterGainNode && activeAudioContext) {
    masterGainNode.gain.setValueAtTime(masterVolume, activeAudioContext.currentTime);
  }
}

export function getMasterVolume() {
  return masterVolume;
}

export function playAnimalSound(synthParams, onPlayStateChange) {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    if (!activeAudioContext || activeAudioContext.state === 'closed') {
      activeAudioContext = new AudioContext();
    }
    if (activeAudioContext.state === 'suspended') {
      activeAudioContext.resume();
    }

    const ctx = activeAudioContext;
    stopAnimalSound();
    const { type, baseFreq = 200, duration = 1.6 } = synthParams || {};

    const osc = ctx.createOscillator();
    const soundGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    if (!masterGainNode) {
      masterGainNode = ctx.createGain();
      masterGainNode.gain.setValueAtTime(masterVolume, ctx.currentTime);
    }

    if (!analyserNode) {
      analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 128;
    }

    // Routing: osc -> filter -> soundGain -> masterGainNode -> analyserNode -> destination
    osc.connect(filter);
    filter.connect(soundGain);
    soundGain.connect(masterGainNode);
    masterGainNode.connect(analyserNode);
    analyserNode.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'roar') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.45, now + duration);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(520, now);
      filter.frequency.linearRampToValueAtTime(140, now + duration);
      soundGain.gain.setValueAtTime(0.01, now);
      soundGain.gain.linearRampToValueAtTime(0.8, now + 0.25);
      soundGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    } else if (type === 'click') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.9, now + 0.12);
      soundGain.gain.setValueAtTime(0.9, now);
      soundGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    } else if (type === 'screech') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.linearRampToValueAtTime(baseFreq * 1.35, now + 0.35);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.65, now + duration);
      soundGain.gain.setValueAtTime(0.05, now);
      soundGain.gain.linearRampToValueAtTime(0.6, now + 0.1);
      soundGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    } else if (type === 'whale' || type === 'boom') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.linearRampToValueAtTime(baseFreq * 0.7, now + duration * 0.5);
      osc.frequency.linearRampToValueAtTime(baseFreq * 0.95, now + duration);
      soundGain.gain.setValueAtTime(0.05, now);
      soundGain.gain.linearRampToValueAtTime(0.7, now + 0.4);
      soundGain.gain.linearRampToValueAtTime(0.001, now + duration);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + duration);
      soundGain.gain.setValueAtTime(0.4, now);
      soundGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    }

    currentOsc = osc;
    currentCb = onPlayStateChange || null;
    osc.onended = () => {
      // Only the active tone reports its own end; a replaced tone stays silent here.
      if (currentOsc === osc) { currentOsc = null; currentCb = null; }
      else if (currentOsc !== null) return;
      if (onPlayStateChange) onPlayStateChange(false);
    };
    if (onPlayStateChange) onPlayStateChange(true);

    osc.start(now);
    osc.stop(now + duration);
  } catch (err) {
    console.error('Web Audio error:', err);
  }
}

// Euphoric Level Win Chime Jingle
export function playWinSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!activeAudioContext || activeAudioContext.state === 'closed') {
      activeAudioContext = new AudioContext();
    }
    const ctx = activeAudioContext;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.4 * masterVolume, now + idx * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.85);
    });
  } catch (err) {
    console.error('Win sound error:', err);
  }
}
