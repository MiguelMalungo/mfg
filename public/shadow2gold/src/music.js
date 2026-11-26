/*
 * The songs, one for each work (I Nigredo, II Albedo, III Rubedo), each looping. The player may turn them off and
 * hear only the game's own sound; that choice is kept apart from the progress, so "Start again" does not forget it.
 * One <audio> element, streamed: changing level fades the old song out, swaps, and fades the new one in.
 */
const SONGS = ['nigredo', 'albedo', 'rubedo'].map((n) => new URL(`../assets/music/${n}.mp3`, import.meta.url).href);
const VOLUME = 0.28; // under the footsteps and the effects
const KEY = 'st2g.music';

const stored = () => {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
};

export const music = {
  on: stored(),
  el: null,
  gain: null,
  level: 0,
  fade: 0,
  held: false, // the game is paused, or the page is out of sight

  /** Call from inside a tap (a browser only lets sound start from one). */
  start(ctx, level = 0) {
    if (this.el || !ctx) return;
    this.level = level;
    const el = (this.el = new Audio(SONGS[level]));
    el.loop = true;
    el.preload = 'auto';
    // through the audio graph: iOS ignores an element's own volume
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    ctx.createMediaElementSource(el).connect(this.gain);
    this.gain.connect(ctx.destination);
    this._sync();
  },

  _sync() {
    if (!this.el) return;
    if (this.on && !this.held) this.el.play()?.catch(() => {});
    else this.el.pause();
  },

  toggle() {
    this.on = !this.on;
    try {
      localStorage.setItem(KEY, this.on ? 'on' : 'off');
    } catch {}
    this._sync();
    return this.on;
  },

  hold(held) {
    this.held = held;
    this._sync();
  },

  /** Every frame. level 0..2: where you are; hush 0..1: everything but the ringing glass goes quiet. */
  update(level, hush, dt) {
    if (!this.el) return;
    if (level !== this.level) {
      this.fade = Math.max(0, this.fade - dt / 1.5);
      if (this.fade === 0) {
        this.level = level;
        this.el.src = SONGS[level];
        this._sync();
      }
    } else this.fade = Math.min(1, this.fade + dt / 3);
    this.gain.gain.value = VOLUME * this.fade * (1 - hush);
  },
};
