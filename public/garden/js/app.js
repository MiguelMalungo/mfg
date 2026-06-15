/* ════════════════════════════════════════════════════════
   THE GARDEN — interactions
   loader · cursor · hero · manifesto · field grid · filters
   note overlay · gallery drag · micro-everything
   ════════════════════════════════════════════════════════ */

(() => {
  const { notes, stages, glyphs, shelves } = window.GARDEN;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasHover = window.matchMedia("(hover: hover)").matches;

  gsap.registerPlugin(ScrollTrigger, Flip);
  if (reduced) document.documentElement.classList.add("no-motion");

  /* ─── sort: explicit order first, then stage rank ─────── */
  const STAGE_RANK = { evergreen: 0, budding: 1, seedling: 2 };
  const sorted = [...notes].sort((a, b) => {
    const ao = a.order ?? Infinity;
    const bo = b.order ?? Infinity;
    if (ao !== bo) return ao - bo;
    return STAGE_RANK[a.stage] - STAGE_RANK[b.stage];
  });

  /* ─── backlinks from body wiki-links ──────────────────── */
  const backlinks = {}; // slug -> [slugs that reference it]
  sorted.forEach((n) => {
    const out = [...n.body.matchAll(/data-note="([^"]+)"/g)].map((m) => m[1]);
    new Set(out).forEach((target) => {
      (backlinks[target] = backlinks[target] || []).push(n.slug);
    });
  });
  const bySlug = Object.fromEntries(sorted.map((n) => [n.slug, n]));

  /* ─── custom cursor ───────────────────────────────────── */
  const cursor = document.getElementById("cursor");
  const cursorLabel = document.getElementById("cursorLabel");
  if (hasHover && !reduced) {
    const dot = cursor.querySelector(".cursor__dot");
    const ring = cursor.querySelector(".cursor__ring");
    const dx = gsap.quickTo(dot, "left", { duration: 0.08, ease: "power2" });
    const dy = gsap.quickTo(dot, "top", { duration: 0.08, ease: "power2" });
    const rx = gsap.quickTo(ring, "left", { duration: 0.35, ease: "power3" });
    const ry = gsap.quickTo(ring, "top", { duration: 0.35, ease: "power3" });
    window.addEventListener("pointermove", (e) => {
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    }, { passive: true });

    document.addEventListener("pointerover", (e) => {
      const t = e.target.closest("[data-cursor], .plot, a, button, .gal__track");
      if (!t) { cursor.classList.remove("cursor--active"); return; }
      let label = t.dataset.cursor ?? "";
      if (t.classList.contains("plot")) label = "OPEN";
      if (t.classList.contains("gal__track")) label = "DRAG";
      cursorLabel.textContent = label;
      cursor.classList.add("cursor--active");
    });
    document.addEventListener("pointerout", (e) => {
      if (!e.relatedTarget) cursor.classList.remove("cursor--active");
    });
  } else {
    cursor.style.display = "none";
  }

  /* ─── text scramble ───────────────────────────────────── */
  const SCRAMBLE = "!<>-_\\/[]{}—=+*^?#";
  document.querySelectorAll("[data-scramble]").forEach((el) => {
    const original = el.textContent;
    let frame = null;
    el.addEventListener("mouseenter", () => {
      if (reduced) return;
      let i = 0;
      clearInterval(frame);
      frame = setInterval(() => {
        el.textContent = original
          .split("")
          .map((ch, idx) => {
            if (ch === " " || ch === "↗") return ch;
            if (idx < i) return original[idx];
            return SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];
          })
          .join("");
        i += original.length / 10;
        if (i >= original.length) {
          clearInterval(frame);
          el.textContent = original;
        }
      }, 35);
    });
  });

  /* ─── magnetic ────────────────────────────────────────── */
  if (hasHover && !reduced) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, {
          x: (e.clientX - r.left - r.width / 2) * 0.3,
          y: (e.clientY - r.top - r.height / 2) * 0.3,
          duration: 0.4, ease: "power3.out",
        });
      });
      el.addEventListener("mouseleave", () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" });
      });
    });
  }

  /* ─── hero split chars ────────────────────────────────── */
  document.querySelectorAll("[data-split]").forEach((el) => {
    el.innerHTML = el.textContent
      .split("")
      .map((ch) => `<span class="ch">${ch === " " ? "&nbsp;" : ch}</span>`)
      .join("");
  });

  /* ─── marquees ────────────────────────────────────────── */
  const topics = [...new Set(sorted.flatMap((n) => n.topics))];
  const chunk = topics.map((t) => `${t} <i>✦</i>`).join(" ");
  document.getElementById("marqueeTrack").innerHTML =
    `<span>${chunk}</span><span>${chunk}</span>`;

  /* ─── manifesto words ─────────────────────────────────── */
  const manifesto = document.getElementById("manifesto");
  const HL = ["mature,", "sprouting,", "seeds.", "watering."];
  manifesto.innerHTML = manifesto.textContent
    .split(" ")
    .map((w) => `<span class="w${HL.includes(w) ? " w--hl" : ""}">${w}</span>`)
    .join(" ");

  /* ─── build the field grid ────────────────────────────── */
  const grid = document.getElementById("grid");
  const SPANS = [7, 5, 4, 8, 6, 6, 5, 7, 4, 8, 7, 5];
  sorted.forEach((n, i) => {
    const el = document.createElement("article");
    el.className = "plot" + (i === 0 ? " plot--tall" : "");
    el.dataset.span = SPANS[i % SPANS.length];
    el.dataset.slug = n.slug;
    el.dataset.stage = n.stage;
    el.dataset.topics = n.topics.join(",");
    if (n.cover) {
      el.classList.add("plot--cover");
      el.style.setProperty("--cover", `url("${n.cover}")`);
    }
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", `Open note: ${n.title}`);
    el.innerHTML = `
      <div class="plot__top">
        <span class="plot__idx">PLOT ${String(i + 1).padStart(2, "0")} / ${stages[n.stage].label.toUpperCase()}</span>
        <span class="plot__glyph">${glyphs[n.stage]}</span>
      </div>
      <div class="plot__mid">
        <h3 class="plot__title">${n.shortTitle || n.title}</h3>
        <p class="plot__desc">${n.desc}</p>
      </div>
      <div class="plot__bot">
        <span class="plot__topics">${n.topics.join(" · ")}</span>
        <span class="plot__year">'${(n.tended || n.planted || "").slice(2)}</span>
      </div>
      <span class="plot__open">OPEN →</span>`;
    el.addEventListener("click", () => openNote(n.slug));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openNote(n.slug); }
    });
    grid.appendChild(el);
  });

  document.getElementById("fieldCount").textContent = `(${sorted.length})`;

  /* legend */
  document.getElementById("legend").innerHTML = Object.entries(stages)
    .map(([k, s]) => `<span>${glyphs[k]}<em>${s.label} — ${s.hint}</em></span>`)
    .join("");

  /* ─── filters ─────────────────────────────────────────── */
  const filters = document.getElementById("filters");
  let activeStage = "all";
  let activeTopic = "all";

  function chipRow() {
    const stageChips = ["all", ...Object.keys(stages)]
      .map((s) => `<button class="filter${s === activeStage ? " filter--on" : ""}" data-kind="stage" data-val="${s}">${s === "all" ? "All stages" : stages[s].label}</button>`)
      .join("");
    const topicChips = ["all", ...topics]
      .map((t) => `<button class="filter${t === activeTopic ? " filter--on" : ""}" data-kind="topic" data-val="${t}">${t === "all" ? "All topics" : t}</button>`)
      .join("");
    filters.innerHTML = stageChips + `<span class="filter filter--sep">/</span>` + topicChips;
  }
  chipRow();

  filters.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter[data-kind]");
    if (!btn) return;
    if (btn.dataset.kind === "stage") activeStage = btn.dataset.val;
    else activeTopic = btn.dataset.val;
    chipRow();

    const cards = gsap.utils.toArray(".plot");
    const state = Flip.getState(cards);
    cards.forEach((c) => {
      const okStage = activeStage === "all" || c.dataset.stage === activeStage;
      const okTopic = activeTopic === "all" || c.dataset.topics.split(",").includes(activeTopic);
      c.classList.toggle("plot--hidden", !(okStage && okTopic));
    });
    Flip.from(state, {
      duration: reduced ? 0 : 0.65,
      ease: "power3.inOut",
      stagger: 0.015,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5 }),
      onLeave: (els) => gsap.set(els, { opacity: 0 }),
    });
  });

  /* ─── shelves (films / books of my life) ──────────────── */
  const POSTER_GLYPH = {
    film: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M7 5v14M17 5v14M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z"/><path d="M5 18a2 2 0 0 1 2-2h11"/></svg>',
    album: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/></svg>',
  };

  function mediaCard(item, kind) {
    const poster = item.img
      ? `<div class="mcard__poster" style="background-image:url('${item.img}')"></div>`
      : `<div class="mcard__poster mcard__poster--empty">${POSTER_GLYPH[kind] || ""}</div>`;
    return `<article class="mcard mcard--${kind}">
      ${poster}
      <h3 class="mcard__title">${item.title || "Untitled"}</h3>
      <p class="mcard__by">${item.by || (kind === "film" ? "Director" : "Author")}</p>
    </article>`;
  }

  const shelvesEl = document.getElementById("shelves");
  if (shelvesEl && Array.isArray(shelves)) {
    shelvesEl.innerHTML = shelves
      .map(
        (sh) => `<section class="shelf">
          <h2 class="shelf__title">${sh.title}</h2>
          <div class="shelf__track">${sh.items.map((it) => mediaCard(it, sh.kind)).join("")}</div>
          <div class="shelf__rail" aria-hidden="true"><div class="shelf__thumb"></div></div>
        </section>`
      )
      .join("");
    shelvesEl.querySelectorAll(".shelf").forEach(setupShelf);
  }

  // Per shelf: native touch scrolling everywhere, click-drag only on
  // pointer (desktop), plus a progress line that mirrors scroll position.
  function setupShelf(shelf) {
    const track = shelf.querySelector(".shelf__track");
    const rail = shelf.querySelector(".shelf__rail");
    const thumb = shelf.querySelector(".shelf__thumb");
    if (hasHover) setupDragX(track); // desktop only — avoids fighting touch scroll
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      if (max <= 1) { rail.style.opacity = "0"; return; }
      rail.style.opacity = "1";
      thumb.style.width = (track.clientWidth / track.scrollWidth) * 100 + "%";
      thumb.style.left = (track.scrollLeft / track.scrollWidth) * 100 + "%";
    };
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    setTimeout(update, 400); // re-measure once covers have laid out
  }

  // Simple horizontal click-drag scroller (desktop pointer only).
  function setupDragX(track) {
    let down = false, startX = 0, startScroll = 0, lastX = 0, lastT = 0, vel = 0, moved = false;
    track.addEventListener("pointerdown", (e) => {
      down = true; moved = false;
      startX = e.clientX; startScroll = track.scrollLeft;
      lastX = e.clientX; lastT = performance.now(); vel = 0;
      track.setPointerCapture(e.pointerId);
      gsap.killTweensOf(track);
    });
    track.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 3) { moved = true; track.classList.add("dragging"); }
      track.scrollLeft = startScroll - dx;
      const now = performance.now();
      vel = (e.clientX - lastX) / Math.max(now - lastT, 1);
      lastX = e.clientX; lastT = now;
    });
    const release = () => {
      if (!down) return;
      down = false;
      track.classList.remove("dragging");
      if (moved && !reduced && Math.abs(vel) > 0.1) {
        gsap.to(track, { scrollLeft: track.scrollLeft - vel * 260, duration: 0.9, ease: "power3.out" });
      }
    };
    track.addEventListener("pointerup", release);
    track.addEventListener("pointercancel", release);
  }

  /* ─── floating peek image ─────────────────────────────── */
  const peek = document.getElementById("peek");
  const peekImg = document.getElementById("peekImg");
  if (hasHover && !reduced) {
    const px = gsap.quickTo(peek, "left", { duration: 0.45, ease: "power3" });
    const py = gsap.quickTo(peek, "top", { duration: 0.45, ease: "power3" });
    let cycle = null;

    // Preload every peek image up front so the first one shown on hover is
    // already decoded — otherwise it loads on-demand and flashes in last.
    sorted.forEach((n) => (n.media || []).forEach((src) => { new Image().src = src; }));

    grid.addEventListener("pointermove", (e) => { px(e.clientX); py(e.clientY); }, { passive: true });
    grid.addEventListener("pointerover", (e) => {
      const card = e.target.closest(".plot");
      const media = card && bySlug[card.dataset.slug]?.media;
      clearInterval(cycle);
      if (!media) { peek.classList.remove("peek--on"); return; }
      let i = 0;
      peekImg.src = media[0];
      peek.classList.add("peek--on");
      if (media.length > 1) {
        cycle = setInterval(() => { i = (i + 1) % media.length; peekImg.src = media[i]; }, 900);
      }
    });
    grid.addEventListener("pointerleave", () => {
      clearInterval(cycle);
      peek.classList.remove("peek--on");
    });
  }

  /* ─── scroll animations ───────────────────────────────── */
  if (!reduced) {
    gsap.set(".plot", { opacity: 0, y: 44 });
    ScrollTrigger.batch(".plot", {
      start: "top 88%",
      onEnter: (batch) =>
        gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, ease: "expo.out", stagger: 0.09 }),
      once: true,
    });

    gsap.to("#manifesto .w", {
      opacity: 1,
      stagger: 0.06,
      ease: "none",
      scrollTrigger: {
        trigger: ".manifesto",
        start: "top 75%",
        end: "bottom 55%",
        scrub: 0.4,
      },
    });
  } else {
    gsap.set(".plot", { opacity: 1 });
    gsap.set("#manifesto .w", { opacity: 1 });
  }

  /* ─── loader → hero intro ─────────────────────────────── */
  const loader = document.getElementById("loader");
  const pctEl = document.getElementById("loaderPct");

  function heroIntro() {
    if (reduced) {
      gsap.set("[data-reveal]", { opacity: 1, y: 0 });
      gsap.set(".hero__swipe", { scaleX: 1 });
      return;
    }
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.fromTo(".hero .ch",
      { yPercent: 115, rotate: 4 },
      { yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.035 })
      .to(".hero__swipe", { scaleX: 1, duration: 0.7, ease: "power4.inOut" }, "-=0.7")
      .to(".hero__kicker", { opacity: 1, y: 0, duration: 0.7 }, "-=0.6")
      .to(".hero__sub", { opacity: 1, y: 0, duration: 0.7 }, "-=0.55")
      .to(".hero__cta", { opacity: 1, y: 0, duration: 0.7 }, "-=0.5");
  }

  if (reduced) {
    loader.remove();
    heroIntro();
    openFromHash();
  } else {
    const counter = { v: 0 };
    gsap.set(".hero .ch", { yPercent: 115 });
    gsap.to(counter, {
      v: 100,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => (pctEl.textContent = `${Math.round(counter.v)}%`),
      onComplete: () => {
        gsap.to(loader, {
          clipPath: "inset(0 0 100% 0)",
          duration: 0.85,
          ease: "expo.inOut",
          onComplete: () => { loader.remove(); openFromHash(); },
        });
        heroIntro();
      },
    });
  }

  /* ─── note overlay ────────────────────────────────────── */
  const note = document.getElementById("note");
  const article = document.getElementById("noteArticle");
  const pager = document.getElementById("notePager");
  const noteScroll = document.getElementById("noteScroll");
  let current = null;
  let overlayOpen = false;

  function noteHTML(n) {
    const dates = [
      n.planted ? `Planted ${n.planted}` : null,
      n.tended && n.tended !== n.planted ? `Tended ${n.tended}` : null,
    ].filter(Boolean).join(" · ");

    const gallery = n.gallery
      ? `<div class="gal">
           <div class="gal__head"><span>THE ARCHIVE — ${n.gallery.length} FRAMES</span><span>DRAG →</span></div>
           <div class="gal__track" id="galTrack">
             ${n.gallery.map((src, i) =>
               `<figure class="gal__item"><img src="${src}" alt="${n.title} — photograph ${i + 1}" loading="lazy" draggable="false" /><span>${String(i + 1).padStart(2, "0")}/${n.gallery.length}</span></figure>`
             ).join("")}
           </div>
         </div>`
      : "";

    const backs = (backlinks[n.slug] || [])
      .map((s) => bySlug[s])
      .map((b) => `<a data-note="${b.slug}"><strong>${b.shortTitle || b.title}</strong><span>— ${b.desc}</span></a>`)
      .join("");

    return `
      <div class="note__meta" data-in>
        ${glyphs[n.stage]}<span>${stages[n.stage].label}</span>
        <span class="dim">· ${n.topics.join(" · ")}</span>
        ${dates ? `<span class="dim">· ${dates}</span>` : ""}
      </div>
      <h1 class="note__title" data-in>${n.shortTitle || n.title}</h1>
      <p class="note__lead" data-in>${n.desc}</p>
      ${n.href ? `<a class="note__visit" data-in href="${n.href}" target="_blank" rel="noopener noreferrer" data-magnetic data-cursor="">${n.hrefLabel || "Visit site"} ↗</a>` : ""}
      <div class="note__body" data-in>${n.body}${gallery}</div>
      ${backs ? `<div class="note__backs" data-in><div class="note__backs-label">Referenced by</div>${backs}</div>` : ""}`;
  }

  function renderPager(n) {
    const i = sorted.indexOf(n);
    const prev = sorted[(i - 1 + sorted.length) % sorted.length];
    const next = sorted[(i + 1) % sorted.length];
    pager.innerHTML = `
      <button data-note="${prev.slug}"><span class="mono">← PREVIOUS PLOT</span><strong>${prev.shortTitle || prev.title}</strong></button>
      <button data-note="${next.slug}"><span class="mono">NEXT PLOT →</span><strong>${next.shortTitle || next.title}</strong></button>`;
  }

  function setupGalleryDrag() {
    const track = document.getElementById("galTrack");
    if (!track) return;

    // Tag any frame whose image is taller than the window (portraits): the
    // image fills the width and overflows, so it can be panned up/down.
    const measure = (item) => {
      const img = item.querySelector("img");
      const overflow = img.offsetHeight - item.clientHeight;
      if (overflow > 2) {
        item.classList.add("gal__item--tall");
        item._panMax = overflow;
        item._panY = Math.max(-overflow, Math.min(0, item._panY || 0));
        img.style.transform = `translateY(${item._panY}px)`;
      } else {
        item.classList.remove("gal__item--tall");
        item._panMax = 0; item._panY = 0;
        img.style.transform = "";
      }
    };
    track.querySelectorAll(".gal__item").forEach((item) => {
      const img = item.querySelector("img");
      if (img.complete && img.naturalHeight) measure(item);
      else img.addEventListener("load", () => measure(item), { once: true });
    });
    const onResize = () => {
      if (!track.isConnected) return window.removeEventListener("resize", onResize);
      track.querySelectorAll(".gal__item").forEach(measure);
    };
    window.addEventListener("resize", onResize);

    let down = false, axis = null;
    let startX = 0, startY = 0, startScroll = 0;
    let lastX = 0, lastT = 0, vel = 0;
    let panItem = null, startPanY = 0;

    track.addEventListener("pointerdown", (e) => {
      down = true; axis = null;
      startX = e.clientX; startY = e.clientY;
      startScroll = track.scrollLeft;
      lastX = e.clientX; lastT = performance.now(); vel = 0;
      panItem = e.target.closest(".gal__item--tall");
      startPanY = panItem ? panItem._panY : 0;
      track.setPointerCapture(e.pointerId);
      gsap.killTweensOf(track);
    });

    track.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!axis) {
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return; // wait for intent
        // vertical pan only when starting on a portrait frame and the
        // gesture is mostly vertical; otherwise scroll the strip
        axis = panItem && Math.abs(dy) > Math.abs(dx) ? "y" : "x";
        track.classList.add("dragging");
        if (axis === "y") panItem.classList.add("panning");
      }
      if (axis === "x") {
        track.scrollLeft = startScroll - dx;
        const now = performance.now();
        vel = (e.clientX - lastX) / Math.max(now - lastT, 1);
        lastX = e.clientX; lastT = now;
      } else {
        const y = Math.max(-panItem._panMax, Math.min(0, startPanY + dy));
        panItem._panY = y;
        panItem.querySelector("img").style.transform = `translateY(${y}px)`;
      }
    });

    const release = () => {
      if (!down) return;
      down = false;
      track.classList.remove("dragging");
      if (panItem) panItem.classList.remove("panning");
      if (axis === "x" && !reduced && Math.abs(vel) > 0.1) {
        gsap.to(track, {
          scrollLeft: track.scrollLeft - vel * 260,
          duration: 0.9,
          ease: "power3.out",
        });
      }
      axis = null; panItem = null;
    };
    track.addEventListener("pointerup", release);
    track.addEventListener("pointercancel", release);
  }

  function fillNote(n) {
    current = n;
    note.classList.toggle("note--cover", !!n.cover); // noir backdrop when a cover exists
    if (n.cover) note.style.setProperty("--cover", `url("${n.cover}")`);
    article.innerHTML = noteHTML(n);
    renderPager(n);
    setupGalleryDrag();
    noteScroll.scrollTop = 0;
  }

  function openNote(slug, push = true) {
    const n = bySlug[slug];
    if (!n) return;
    if (push) history.pushState({ note: slug }, "", `#${slug}`);

    if (overlayOpen) {
      // swap in place
      if (reduced) { fillNote(n); return; }
      gsap.to(article, {
        opacity: 0, y: 14, duration: 0.22, ease: "power2.in",
        onComplete: () => {
          fillNote(n);
          gsap.fromTo(article, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: "expo.out" });
        },
      });
      return;
    }

    fillNote(n);
    overlayOpen = true;
    note.classList.add("note--open");
    note.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    if (reduced) {
      gsap.set(note, { clipPath: "inset(0% 0 0 0)" });
      return;
    }
    const tl = gsap.timeline();
    tl.fromTo(note,
      { clipPath: "inset(100% 0 0 0)" },
      { clipPath: "inset(0% 0 0 0)", duration: 0.75, ease: "expo.inOut" })
      .fromTo(article.querySelectorAll("[data-in]"),
        { opacity: 0, y: 46 },
        { opacity: 1, y: 0, duration: 0.7, ease: "expo.out", stagger: 0.07 },
        "-=0.25");
  }

  function closeNote(push = true) {
    if (!overlayOpen) return;
    overlayOpen = false;
    if (push && location.hash) history.pushState({}, "", location.pathname);
    const done = () => {
      note.classList.remove("note--open");
      note.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      gsap.set(note, { clipPath: "inset(100% 0 0 0)" });
    };
    if (reduced) { done(); return; }
    gsap.to(note, {
      clipPath: "inset(0 0 100% 0)",
      duration: 0.55,
      ease: "expo.inOut",
      onComplete: done,
    });
  }

  function openFromHash() {
    const slug = location.hash.slice(1);
    if (slug && bySlug[slug]) openNote(slug, false);
  }

  document.getElementById("noteClose").addEventListener("click", () => closeNote());
  document.getElementById("noteBack").addEventListener("click", () => closeNote());

  note.addEventListener("click", (e) => {
    const link = e.target.closest("[data-note]");
    if (link) { e.preventDefault(); openNote(link.dataset.note); }
  });

  document.addEventListener("keydown", (e) => {
    if (!overlayOpen) return;
    if (e.key === "Escape") closeNote();
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const i = sorted.indexOf(current);
      const d = e.key === "ArrowRight" ? 1 : -1;
      openNote(sorted[(i + d + sorted.length) % sorted.length].slug);
    }
  });

  window.addEventListener("popstate", () => {
    const slug = location.hash.slice(1);
    if (slug && bySlug[slug]) openNote(slug, false);
    else closeNote(false);
  });

  /* ─── footer time ─────────────────────────────────────── */
  const h = new Date().getHours();
  const phase =
    h < 6 ? ["night", "asleep. The notes grow anyway"] :
    h < 12 ? ["morning", "watering"] :
    h < 18 ? ["afternoon", "building the truck"] :
    ["evening", "surfing the last light"];
  document.getElementById("footTime").textContent =
    `IT IS ${phase[0].toUpperCase()} IN THE GARDEN. THE GARDENER IS PROBABLY ${phase[1].toUpperCase()}.`;
})();
