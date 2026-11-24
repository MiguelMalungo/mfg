import * as THREE from 'three';
import { readingTime, QUESTION, CHOICE } from './texts.js';

/*
 * The words on screen (PLAN.md 10.3). Three places, all plain HTML over the canvas:
 *   say()       a text beside an object in the world; it stays 2 s + 0.35 s a word, or until a click
 *   ask()       the same, ending in the question and the two answers; it stays until one is chosen
 *   line()      the one-line instruction low on the screen
 *   word()      one word in the middle (the strength a shadow gives back)
 *   whisper()   one line in the middle, small (inside a shadow)
 *   tip()       a sentence above the bottom line: how the level is played, shown when it is useful
 * The texts themselves are in texts.js.
 */

const el = (tag, cls, parent) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  (parent || document.body).appendChild(e);
  return e;
};

/** mode: () => 'touch' | 'desk' (which way of pressing to name under the answers). */
export const makeWords = (camera, mode) => {
  const box = el('div', 'say hidden');
  const lineEl = el('div', 'line hidden');
  const wordEl = el('div', 'word hidden');
  const whisperEl = el('div', 'whisper hidden');
  const tipEl = el('div', 'tip hidden');

  let cur = null; // { anchor, until, onDone, choice }
  let now = 0;
  const _v = new THREE.Vector3();

  const close = (how) => {
    if (!cur) return;
    const c = cur;
    cur = null;
    box.classList.add('hidden');
    c.onDone?.(how);
  };

  const fill = (title, lines, question) => {
    box.innerHTML = '';
    if (title) el('div', 'say-title', box).textContent = title;
    for (const l of lines) el('p', '', box).textContent = l;
    if (question) el('p', 'say-q', box).textContent = question;
  };

  /** anchor: () => THREE.Vector3 in world space (the text sits beside it). onDone('time' | 'click').
   * box: false when the text is shown in the world itself (an opened letter): it is timed and closed by a
   * click the same way, a little longer, with no box on screen. */
  const say = ({ title, lines, anchor, onDone, box: inBox = true }) => {
    close('replaced');
    const read = readingTime([title, ...lines].join(' '));
    cur = { anchor: inBox ? anchor : null, until: now + (inBox ? read : read * 1.3 + 2), onDone, shown: now, guard: inBox ? 0.35 : 1.6 };
    if (!inBox) return;
    fill(title, lines);
    box.classList.remove('hidden');
  };

  /** A text that ends in the question. onDone('take' | 'leave'). */
  const ask = ({ title, lines, anchor, onDone }) => {
    close('replaced');
    fill(title, lines, QUESTION);
    const row = el('div', 'say-choice', box);
    for (const k of ['take', 'leave']) {
      const b = el('button', 'say-btn ' + k, row);
      b.innerHTML = `<span>${CHOICE[k]}</span><small>${CHOICE[k + 'Key'][mode()]}</small>`;
      const go = (e) => {
        e.preventDefault();
        e.stopPropagation();
        answer(k);
      };
      b.addEventListener('click', go);
      b.addEventListener('touchend', go);
    }
    cur = { anchor, until: Infinity, onDone, choice: true, shown: now };
    box.classList.remove('hidden');
  };

  /** Answers the open question (keys and clicks come through here too). */
  const answer = (k) => {
    if (!cur?.choice) return false;
    // a moment's guard, so the click that picked the mask cannot also answer for it
    if (now - cur.shown < 0.9) return true;
    close(k);
    return true;
  };

  /** A click or tap: dismisses a plain text. Returns true if it was used. */
  const click = () => {
    if (!cur) return false;
    if (cur.choice) return answer('take');
    if (now - cur.shown < (cur.guard ?? 0.35)) return true; // (an opened letter: not before it has unfolded)
    close('click');
    return true;
  };

  const line = (text) => {
    if (!text) return lineEl.classList.add('hidden');
    if (lineEl.textContent !== text) lineEl.textContent = text;
    lineEl.classList.remove('hidden');
  };
  let wordUntil = 0, whisperUntil = 0;
  const word = (text, sub, seconds = 3.2) => {
    wordEl.innerHTML = '';
    el('div', 'word-main', wordEl).textContent = text;
    if (sub) el('div', 'word-sub', wordEl).textContent = sub;
    wordEl.classList.remove('hidden');
    wordUntil = now + seconds;
  };
  const whisper = (text, seconds = 3) => {
    whisperEl.textContent = text;
    whisperEl.classList.remove('hidden');
    whisperUntil = now + seconds;
  };

  /*
   * Tips wait their turn: one at a time, never over a mask's text, each at most `times` times
   * (and not again within `gap` seconds).
   */
  const tips = { queue: [], until: 0, rest: 0, cur: null, count: {}, last: {} };
  const tip = (text, { id = text, times = 1, gap = 0 } = {}) => {
    if ((tips.count[id] || 0) >= times || tips.cur === id || tips.queue.some((q) => q.id === id)) return false;
    if (gap && now - (tips.last[id] ?? -1e9) < gap) return false;
    tips.count[id] = (tips.count[id] || 0) + 1;
    tips.last[id] = now;
    tips.queue.push({ id, text });
    return true;
  };
  /** Drops what is showing and waiting (the moment has passed). */
  const clearTips = () => {
    tips.queue.length = 0;
    tips.until = 0;
    tips.cur = null;
    tipEl.classList.add('hidden');
  };

  /** Every frame: places the text beside its object and closes it when its time is up. */
  const update = (t) => {
    now = t;
    if (tips.until && t > tips.until) {
      tipEl.classList.add('hidden');
      Object.assign(tips, { until: 0, cur: null, rest: t + 0.9 });
    }
    if (!tips.until && tips.queue.length && t > tips.rest && !cur) {
      const next = tips.queue.shift();
      tipEl.textContent = next.text;
      tipEl.classList.remove('hidden');
      Object.assign(tips, { cur: next.id, until: t + readingTime(next.text) + 1.2 });
    }
    tipEl.classList.toggle('behind', !!cur);
    if (wordUntil && t > wordUntil) (wordEl.classList.add('hidden'), (wordUntil = 0));
    if (whisperUntil && t > whisperUntil) (whisperEl.classList.add('hidden'), (whisperUntil = 0));
    if (!cur) return;
    if (t > cur.until) return close('time');
    const p = cur.anchor?.();
    const narrow = innerWidth < 760 || innerWidth < innerHeight;
    if (p) {
      _v.copy(p).project(camera);
      const x = (_v.x * 0.5 + 0.5) * innerWidth, y = (-_v.y * 0.5 + 0.5) * innerHeight;
      if (narrow) {
        // no room beside it on a phone held upright: under it
        box.style.left = '50%';
        box.style.top = Math.min(innerHeight * 0.62, y + innerHeight * 0.2) + 'px';
        box.style.transform = 'translate(-50%, 0)';
      } else {
        box.style.left = Math.min(innerWidth - 420, x + innerHeight * 0.2) + 'px';
        box.style.top = Math.max(40, Math.min(innerHeight - 260, y)) + 'px';
        box.style.transform = 'translate(0, -50%)';
      }
    }
  };

  return { say, ask, answer, click, line, word, whisper, tip, clearTips, update, close, get open() { return !!cur; }, get asking() { return !!cur?.choice; } };
};
