/*
 * Progress, kept in the browser (PLAN.md 10.3): the man/woman choice, the level, the black masks
 * faced and the white masks read. Nothing else is saved: you always wake at the start of the
 * corridor, with what you have done still done.
 */

const KEY = 'st2g.save.v1';
const blank = () => ({ gender: null, level: 1, faced: [], read: [] });

const read = () => {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!d || typeof d !== 'object') return blank();
    return { ...blank(), ...d, faced: Array.isArray(d.faced) ? d.faced : [], read: Array.isArray(d.read) ? d.read : [] };
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
  /** Start again: keeps the man/woman choice, forgets the rest. */
  reset() {
    this.data = { ...blank(), gender: this.data.gender };
    this.write();
  },
  get hasProgress() {
    return this.data.faced.length > 0 || this.data.read.length > 0;
  },
};
