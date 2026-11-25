/*
 * The long hold at the furnace (PLAN.md 10.6.2): press, keep pressing, and keep the flask in the middle.
 * Only the rules are here, no pictures; rubedo.js shows them and main.js sends the input.
 *
 *   `lean` is where you are, -1 (the dark, left) to +1 (the white, right): the pull plus your own hand.
 *   The pull wanders; your hand is an offset you hold against it (a finger moved aside and kept there).
 *   Heat rises while you press with |lean| < ZONE. Let go, or lean too far, and it sinks at a quarter of the
 *   speed, never below the last third reached. That is all that can go wrong.
 *   It helps quietly: each strength in the fire takes 15 % off the pull, each 10 s outside the middle another 20 %.
 *   Three quick taps in a row make the press a switch, for a hand that cannot keep pressing.
 */
export const ZONE = 0.4;
const STILL = 8; // the last seconds of the third heating: both pulls meet and cancel
const ss = (a, b, x) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

export const makeHold = () => {
  const h = {
    on: false, // a heating waits for your hand, or is under way
    down: false, begun: false, latch: false, taps: 0, pressedAt: 0,
    kind: 'dark', T: 25, heat: 0, floor: 0, lean: 0, pull: 0, hand: 0, t: 0, out: 0, helps: 0, strengths: 1, slow: 1,
    side: 1, nextSwap: 0, gust: 0, finger: null, x0: 0, hand0: 0,
    onThird: null, onDone: null, onLatch: null,
  };
  /** kind: 'dark' (pulls left), 'white' (right), 'both'. */
  h.begin = ({ kind, T, strengths = 1, slow = 1, onThird, onDone, onLatch }) =>
    Object.assign(h, { on: true, down: false, begun: false, kind, T, heat: 0, floor: 0, lean: 0, pull: 0, hand: 0, t: 0, out: 0, helps: 0, strengths, slow, side: Math.random() < 0.5 ? -1 : 1, nextSwap: 5.5, finger: null, onThird, onDone, onLatch });
  h.press = (now) => {
    if (!h.on) return false;
    if (h.latch) h.down = !h.down;
    else h.down = true;
    h.pressedAt = now;
    if (h.down) h.begun = true;
    return true;
  };
  h.release = (now) => {
    if (!h.on || h.latch) return;
    if (h.down) {
      h.taps = now - h.pressedAt < 0.3 ? h.taps + 1 : 0;
      if (h.taps >= 3) {
        h.latch = true;
        h.onLatch?.();
      }
    }
    h.down = false;
  };
  /** Everything let go of at once (pause, the window lost). */
  h.drop = () => ((h.down = false), (h.finger = null), (h.taps = 0));
  /** Your hand moved by this much (1 = from the middle to a side). */
  h.move = (d) => h.on && (h.hand = Math.max(-1.5, Math.min(1.5, h.hand + d)));
  h.fingerDown = (id, x, now) => {
    if (!h.on || h.finger !== null) return;
    h.finger = id;
    h.x0 = x;
    h.hand0 = h.latch ? h.hand : 0;
    h.hand = h.hand0;
    h.press(now);
  };
  h.fingerMove = (id, x, width) => {
    if (id !== h.finger) return;
    h.hand = Math.max(-1.5, Math.min(1.5, h.hand0 + (x - h.x0) / (Math.min(width, 520) * 0.3)));
  };
  h.fingerUp = (id, now) => {
    if (id !== h.finger) return;
    h.finger = null;
    h.release(now);
  };
  /** 0..1: how far into the stillness at the end of the third heating. */
  h.still = () => (h.kind === 'both' ? ss(1 - STILL / h.T, 1 - (STILL - 2) / h.T, h.heat) : 0);
  h.inside = () => Math.abs(h.lean) < ZONE;
  h.update = (dt) => {
    if (!h.on || dt <= 0) return;
    if (h.down) h.t += dt;
    // the pull: a slow wander with a gust in it, never the same twice
    const t = h.t * h.slow;
    const w = 0.5 + 0.28 * Math.sin(t * 0.62 + 1.1) + 0.22 * Math.sin(t * 1.37 + 0.4);
    const soft = Math.max(0.35, 1 - 0.15 * h.strengths) * Math.pow(0.8, h.helps) * ss(0, 4, h.t);
    let want;
    if (h.kind === 'dark') want = -(0.45 + 0.75 * w);
    else if (h.kind === 'white') want = 0.45 + 0.75 * w;
    else {
      if (h.t > h.nextSwap) {
        h.side = -h.side;
        h.nextSwap = h.t + (5 + 2 * Math.abs(Math.sin(h.t * 3.7))) / h.slow;
        h.gust = Math.min(1, h.gust + 0.14); // each a little stronger than the last
      }
      want = h.side * (0.6 + 0.35 * w + 0.35 * h.gust) * (1 - h.still());
    }
    want *= soft;
    h.pull += (want - h.pull) * (1 - Math.exp(-dt * 1.1 * h.slow));
    // not held: your hand is out of it, and the flask comes back to the middle by itself
    if (!h.down) {
      if (!h.latch) h.hand += (0 - h.hand) * (1 - Math.exp(-dt * 3));
      h.pull += (0 - h.pull) * (1 - Math.exp(-dt * 2));
    }
    h.lean += (Math.max(-1, Math.min(1, h.pull + h.hand)) - h.lean) * (1 - Math.exp(-dt * 5));
    const third0 = Math.floor(h.heat * 3 + 1e-6);
    if (h.down && h.inside()) h.heat = Math.min(1, h.heat + dt / h.T);
    else if (h.begun) {
      h.heat = Math.max(h.floor, h.heat - (0.25 * dt) / h.T);
      if (h.down && (h.out += dt) > 10) ((h.out = 0), (h.helps += 1));
    }
    const third = Math.floor(h.heat * 3 + 1e-6);
    if (third > third0) {
      h.floor = Math.max(h.floor, third / 3);
      h.onThird?.(third);
    }
    if (h.heat >= 1) {
      h.on = h.down = false;
      h.finger = null;
      h.onDone?.();
    }
  };
  return h;
};
