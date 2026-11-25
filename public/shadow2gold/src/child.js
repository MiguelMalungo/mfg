import * as THREE from 'three';

/*
 * The child and the long bag (episode 1: how the shadow forms; refs/v06.jpg).
 * A small child, seen only from behind, drags the huge sack down the corridor by a rope, away from
 * you, toward the door that was never there. The child never turns round.
 *
 *   wait   the child stands at the rope, the sack behind it, until you come within sight
 *   drag   it pulls in heaves; the sack lurches after it, scraping
 *   leave  when you come close (or it nears the end), it lets the rope fall where it stands,
 *          and walks on alone into the gap of the narrow door, where it is gone
 *   gone
 *
 * The sack stays wherever it was left, breathing. The rope lies on the floor.
 */

const ROPE = 2.4; // metres from the child's hand to the sack's neck
const NOTICE = 15; // the child starts pulling once you are this close to the sack
const LET_GO = 4.2; // ...and lets go once you are this close to the sack
const LAST_Z = -38.5; // or once the child has come this far
const DOOR = new THREE.Vector3(0.05, 0, -45.6); // the gap of the narrow door

export const buildChild = (scene, people, sack, sound) => {
  const c = people.makeChild();
  scene.add(c.root);
  const at = sack.bag.position;
  c.root.position.set(at.x + 0.2, 0, at.z - 2.25);
  c.root.rotation.y = Math.PI; // facing down the corridor, its back to you
  const st = { phase: 'wait', t: 0, dragSpeed: 0, hold: 1, lean: 0, walkBlend: 0, ropeEnd: new THREE.Vector3(), fade: 0 };
  const _d = new THREE.Vector3();

  const update = (dt, t, player) => {
    st.t += dt;
    const dSack = Math.hypot(player.x - at.x, player.z - at.z);
    let speed = 0;
    if (st.phase === 'wait' && dSack < NOTICE) {
      st.phase = 'drag';
      st.t = 0;
    }
    if (st.phase === 'drag') {
      // heave, rest, heave: the bag is far too heavy for it
      const heave = Math.pow(Math.max(0, Math.sin(st.t * 1.7)), 2);
      speed = 0.42 * heave;
      c.root.position.z -= speed * dt;
      // if you get ahead of it, it waits, its back to you, until you move
      c.root.position.x += (0.25 * Math.sin(c.root.position.z * 0.3) - c.root.position.x) * dt * 0.5;
      if (dSack < LET_GO || c.root.position.z < LAST_Z) {
        st.phase = 'leave';
        st.t = 0;
        st.ropeEnd.copy(c.hand()).setY(0.016);
      }
    }
    if (st.phase === 'leave') {
      // a moment still, then it walks on alone, a little faster, to the door
      const go = st.t > 1.4;
      if (go) {
        _d.copy(DOOR).sub(c.root.position).setY(0);
        const left = _d.length();
        // it never touches you: if you stand in its way it steps aside, toward the wider side
        const px = c.root.position.x - player.x, pz = c.root.position.z - player.z;
        const pd = Math.hypot(px, pz);
        if (pd < 1.8) {
          const side = player.x > 0 ? Math.max(-1.3, player.x - 1.1) : Math.min(1.3, player.x + 1.1);
          _d.normalize().add(new THREE.Vector3((side - c.root.position.x) * 2.5, 0, 0));
        }
        speed = Math.min(0.62, left * 2);
        if (left > 0.05) {
          _d.normalize();
          c.root.position.addScaledVector(_d, speed * dt);
          c.root.rotation.y += (Math.atan2(_d.x, _d.z) - c.root.rotation.y) * dt * 3;
        }
        // and it is never closer than 0.7 m
        {
          const qx = c.root.position.x - player.x, qz = c.root.position.z - player.z;
          const qd = Math.hypot(qx, qz);
          if (qd < 0.7) {
            const k = qd > 1e-3 ? 0.7 / qd : 0;
            c.root.position.x = player.x + (qd > 1e-3 ? qx * k : 0.7);
            c.root.position.z = player.z + qz * k;
          }
          c.root.position.x = Math.max(-1.45, Math.min(1.45, c.root.position.x));
        }
        // through the gap, into the dark beyond
        if (c.root.position.z < DOOR.z + 0.7) st.fade = Math.min(1, st.fade + dt / 1.2);
        if (st.fade >= 1) {
          st.phase = 'gone';
          c.root.visible = false;
        }
      }
    }
    // the sack follows the rope while it is held
    if (st.phase === 'drag' || st.phase === 'wait') {
      const ahead = c.root.position.z + ROPE;
      const before = at.z;
      if (at.z > ahead) at.z = ahead;
      at.x += (c.root.position.x - 0.2 - at.x) * Math.min(1, dt * 0.6);
      st.dragSpeed = (before - at.z) / Math.max(dt, 1e-4);
    } else st.dragSpeed = 0;
    // while the child holds it, the sack only answers the pull (main.js gives it its breath otherwise)
    if (st.phase === 'drag' || st.phase === 'wait') sack.update(t, 0, st.dragSpeed);
    sound.drag?.(Math.min(1, st.dragSpeed * 2.5));

    /* the body: walking when it moves, leaning into the pull, the arm holding the rope */
    st.walkBlend += ((speed > 0.04 ? 1 : 0) - st.walkBlend) * Math.min(1, dt * 5);
    c.walk.weight = st.walkBlend;
    c.idle.weight = 1 - st.walkBlend;
    // a child's short stride: the walk clip covers 1.26 m/s at full size
    c.walk.timeScale = Math.max(0.0001, speed / (1.26 * 0.61));
    c.unbend();
    c.mixer.update(dt);
    const holding = st.phase === 'wait' || st.phase === 'drag';
    st.hold += ((holding ? 1 : 0) - st.hold) * Math.min(1, dt * 4);
    st.lean += ((st.phase === 'drag' ? 0.5 + 0.5 * Math.min(1, speed * 4) : st.phase === 'wait' ? 0.25 : 0) - st.lean) * Math.min(1, dt * 3);
    c.pose(st.lean, st.hold);
    c.u.fade.value = st.fade;
    c.u.time.value = t;

    /* the rope: in the hand while it holds on; on the floor where it fell */
    if (st.hold > 0.5) sack.setRope(c.hand(), true);
    else sack.setRope(st.ropeEnd, false);
  };

  return { child: c, st, update };
};
