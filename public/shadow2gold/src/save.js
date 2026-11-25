/*
 * Progress, kept in the browser (PLAN.md 10.3): the man/woman choice, the level, the black masks
 * faced and the white masks read. Nothing else is saved: you always wake at the start of the
 * corridor, with what you have done still done.
 * `round` is the distillation you are in (texts.js, DISTIL), `faced0` how many of `faced` were faced in earlier
 * rounds, `turned` that every mask has been met and they have all been hung again.
 */

// ?test keeps test runs out of the real progress (it has its own slot)
const KEY = new URLSearchParams(location.search).has('test') ? 'st2g.test.v1' : 'st2g.save.v1';
const blank = () => ({ gender: null, level: 1, faced: [], read: [], letters: [], gold: false, round: 1, faced0: 0, turned: false });

const read = () => {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!d || typeof d !== 'object') return blank();
    return { ...blank(), ...d, round: Math.max(1, d.round | 0), faced0: Math.max(0, Math.min(d.faced0 | 0, Array.isArray(d.faced) ? d.faced.length : 0)), faced: Array.isArray(d.faced) ? d.faced : [], read: Array.isArray(d.read) ? d.read : [], letters: Array.isArray(d.letters) ? d.letters : [] };
  } catch {
    return blank(); // private windows, blocked storage: play without saving
  }
};

export const save = {
  data: read(),
  write() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {}
  },
  set(patch) {
    Object.assign(this.data, patch);
    this.write();
  },
  /** Adds an id to one of the lists once. */
  add(list, id) {
    if (!this.data[list].includes(id)) {
      this.data[list].push(id);
      this.write();
    }
  },
  /** Masks faced in this round (the door opens at three). */
  get facedNow() {
    return this.data.faced.length - this.data.faced0;
  },
  /** The next distillation: the masks faced stay sealed, unless fewer than three of `total` are left: then all
   * are hung again. The letters and the gold are to be found anew. */
  nextRound(total) {
    const d = this.data, turned = total - d.faced.length < 3;
    const faced = turned ? [] : d.faced;
    Object.assign(d, { round: d.round + 1, faced, faced0: faced.length, letters: [], gold: false, turned: d.turned || turned });
    this.write();
  },
  /** Start again: keeps the man/woman choice, forgets the rest. */
  reset() {
    this.data = { ...blank(), gender: this.data.gender };
    this.write();
  },
  get hasProgress() {
    return this.data.faced.length > 0 || this.data.read.length > 0;
  },
};
