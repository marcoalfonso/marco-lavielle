// Fully synthesized WebAudio: engine, skids, impacts, horn and jingles.
// The context is created lazily on the first user gesture (autoplay rules).

const IMPACT_VOICES = {
  letter: { freq: 320, q: 1.2, tone: 180, decay: 0.22 },
  brick: { freq: 520, q: 1.4, tone: 240, decay: 0.16 },
  pin: { freq: 1900, q: 3, tone: 1250, decay: 0.12 },
  ball: { freq: 260, q: 1, tone: 110, decay: 0.28 },
  domino: { freq: 1400, q: 4, tone: 900, decay: 0.07 },
  crate: { freq: 700, q: 2, tone: 330, decay: 0.12 },
  cone: { freq: 1100, q: 2, tone: 620, decay: 0.09 },
  football: { freq: 240, q: 0.8, tone: 140, decay: 0.2 },
  rain: { freq: 900, q: 3, tone: 700, decay: 0.08 },
  car: { freq: 380, q: 0.9, tone: 90, decay: 0.3 },
};

export const createAudio = () => {
  let ctx = null;
  let master = null;
  let noise = null;
  let engine = null;
  let skid = null;
  let horn = null;
  let muted = false;
  const listener = { x: 0, z: 0 };

  const build = () => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);

    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    // engine: detuned saw + sub square through a lowpass
    const eGain = ctx.createGain();
    eGain.gain.value = 0;
    const eFilter = ctx.createBiquadFilter();
    eFilter.type = "lowpass";
    eFilter.frequency.value = 400;
    eFilter.Q.value = 3;
    const o1 = ctx.createOscillator();
    o1.type = "sawtooth";
    const o2 = ctx.createOscillator();
    o2.type = "square";
    const o3 = ctx.createOscillator();
    o3.type = "sawtooth";
    const o3Gain = ctx.createGain();
    o3Gain.gain.value = 0;
    o1.connect(eFilter);
    o2.connect(eFilter);
    o3.connect(o3Gain).connect(eFilter);
    eFilter.connect(eGain).connect(master);
    [o1, o2, o3].forEach((o) => o.start());
    engine = { gain: eGain, filter: eFilter, o1, o2, o3, o3Gain };

    // skid: looping filtered noise
    const sSrc = ctx.createBufferSource();
    sSrc.buffer = noise;
    sSrc.loop = true;
    const sFilter = ctx.createBiquadFilter();
    sFilter.type = "bandpass";
    sFilter.frequency.value = 1300;
    sFilter.Q.value = 0.9;
    const sGain = ctx.createGain();
    sGain.gain.value = 0;
    sSrc.connect(sFilter).connect(sGain).connect(master);
    sSrc.start();
    skid = { gain: sGain };
    return true;
  };

  const unlock = () => {
    if (!ctx && !build()) return;
    if (ctx.state === "suspended") ctx.resume();
  };

  const setMuted = (value) => {
    muted = value;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.55, ctx.currentTime, 0.05);
  };

  const setListener = (x, z) => {
    listener.x = x;
    listener.z = z;
  };

  const updateEngine = ({ speedRatio, throttle, boost, airborne }) => {
    if (!engine) return;
    const t = ctx.currentTime;
    const rev = Math.min(1.3, speedRatio + (airborne && throttle ? 0.35 : 0));
    const base = 42 + rev * 95 + Math.abs(throttle) * 10;
    engine.o1.frequency.setTargetAtTime(base, t, 0.08);
    engine.o2.frequency.setTargetAtTime(base * 0.5, t, 0.08);
    engine.o3.frequency.setTargetAtTime(base * 2.02, t, 0.08);
    engine.o3Gain.gain.setTargetAtTime(boost ? 0.5 : 0, t, 0.1);
    engine.filter.frequency.setTargetAtTime(320 + rev * 900 + (throttle ? 250 : 0), t, 0.1);
    engine.gain.gain.setTargetAtTime(0.05 + Math.abs(throttle) * 0.05 + rev * 0.03, t, 0.1);
  };

  const setSkid = (amount) => {
    if (!skid) return;
    skid.gain.gain.setTargetAtTime(Math.min(amount, 1) * 0.1, ctx.currentTime, 0.05);
  };

  const distanceGain = (pos) => {
    if (!pos) return 1;
    const d = Math.hypot(pos.x - listener.x, pos.z - listener.z);
    return 1 / (1 + d / 18);
  };

  const impact = (kind, strength, pos) => {
    if (!ctx || muted) return;
    const v = IMPACT_VOICES[kind] || IMPACT_VOICES.brick;
    const vol = strength * distanceGain(pos) * 0.9;
    if (vol < 0.02) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = v.freq * (0.85 + Math.random() * 0.3);
    f.Q.value = v.q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + v.decay);
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random() * 0.5, v.decay + 0.05);

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(v.tone * (0.9 + Math.random() * 0.2), t);
    osc.frequency.exponentialRampToValueAtTime(v.tone * 0.6, t + v.decay);
    const og = ctx.createGain();
    og.gain.setValueAtTime(vol * 0.5, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + v.decay);
    osc.connect(og).connect(master);
    osc.start(t);
    osc.stop(t + v.decay + 0.05);
  };

  const hornStart = () => {
    if (!ctx || horn) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.03);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1700;
    const oscs = [392, 494].map((freq) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = freq;
      o.connect(f);
      o.start(t);
      return o;
    });
    f.connect(g).connect(master);
    horn = { g, oscs };
  };

  const hornStop = () => {
    if (!horn) return;
    const t = ctx.currentTime;
    horn.g.gain.setTargetAtTime(0, t, 0.03);
    horn.oscs.forEach((o) => o.stop(t + 0.2));
    horn = null;
  };

  const notes = (freqs, { step = 0.08, type = "triangle", vol = 0.18, decay = 0.35 } = {}) => {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    freqs.forEach((freq, i) => {
      const t = t0 + i * step;
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + decay);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + decay + 0.05);
    });
  };

  const chime = (n = 0) => {
    const base = 660 * Math.pow(2, (n % 8) / 12);
    notes([base, base * 1.26, base * 1.5, base * 2], { step: 0.06, type: "sine", vol: 0.2 });
  };
  const fanfare = () =>
    notes([523, 659, 784, 1047, 784, 1047], { step: 0.11, type: "square", vol: 0.07, decay: 0.3 });
  const whoosh = () => {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 1.5;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(2400, t + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    src.connect(f).connect(g).connect(master);
    src.start(t, 0, 0.5);
  };

  const dispose = () => {
    if (ctx) ctx.close();
    ctx = null;
  };

  return {
    unlock,
    setMuted,
    setListener,
    updateEngine,
    setSkid,
    impact,
    hornStart,
    hornStop,
    chime,
    fanfare,
    whoosh,
    dispose,
  };
};
