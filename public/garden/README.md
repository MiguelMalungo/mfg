# The Garden — standalone experience

An interactive, self-contained version of the digital garden from
miguelfguedes.pt. Cream paper, ink, lime. A three.js spore field drifts
behind everything; GSAP drives the loader, the hero, the filters, the
note overlay and every micro-interaction.

## Run it

It's a fully static site — no build step, no install.

```
npx serve .
```

…or drop the folder on Netlify / Vercel / GitHub Pages / any static host.
Opening `index.html` directly in a browser also works (dependencies load
from CDN, fonts from Google Fonts — it needs an internet connection).

## Structure

```
index.html        markup: loader, hero, marquee, manifesto, field, overlay
css/style.css     all styling (CSS variables at the top)
js/data.js        the 12 notes, baked from the main site's markdown
js/scene.js       three.js spore field (ES module)
js/app.js         GSAP interactions, filters, overlay, gallery drag
assets/           optimized webp media (bus archive + sotkis screenshot)
```

## Updating content

Edit `js/data.js`. Each note has `slug`, `title`, `stage`
(seedling / budding / evergreen), `topics`, `desc`, dates, optional
`href` (external link button), optional `media` (hover peek images),
optional `gallery` (drag strip), and `body` (HTML; use
`<a class="wl" data-note="slug">` for internal wiki-links — backlinks
are computed automatically).

## Notes

- Respects `prefers-reduced-motion` (static scene, no animations).
- Deep links work: `#bus`, `#sotkis`, etc. open the note directly.
- Keyboard: `Esc` closes a note, `←`/`→` move between notes.
