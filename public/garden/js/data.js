/* ════════════════════════════════════════════════════════
   THE GARDEN — content
   Baked from content/garden/*.md (main site). Wiki-links
   become <a class="wl" data-note="slug">; external links
   keep target=_blank. Media paths are relative (assets/).
   ════════════════════════════════════════════════════════ */

window.GARDEN = {
  stages: {
    seedling: { label: "Seedling", hint: "just planted" },
    budding: { label: "Budding", hint: "growing now" },
    evergreen: { label: "Evergreen", hint: "mature, alive" },
  },

  glyphs: {
    seedling:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 21v-8"/><path d="M12 13c0-4-2.5-6-6-6 0 4 2.5 6 6 6Z"/></svg>',
    budding:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 21V10"/><circle cx="12" cy="6.5" r="3"/><path d="M12 15c-3 0-5-1.5-5.5-4 3.2 0 5 1.4 5.5 4Z"/></svg>',
    evergreen:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21v-3"/><path d="M6 18h12L13.5 9.8h2L12 3 8.5 9.8h2L6 18Z"/></svg>',
  },

  notes: [
    {
      slug: "life-on-the-road",
      cover: "/garden/assets/cover-life-on-the-road.webp",
      title: "Life on the Road",
      stage: "budding",
      topics: ["Travel", "Life"],
      desc: "Converting a truck into a home on wheels — the moving project.",
      planted: "2026",
      tended: "2026",
      order: 1,
      body: `
        <p>The current chapter: I'm converting a truck into a home on wheels. Bed, kitchen, a place to work from, water and electricity that behave. The plan is to live in it for a while, move slowly, and let the road decide the rest.</p>
        <p>This isn't the first time — the <a class="wl" data-note="bus">bus</a> came before, and I lived in it. That one is done; this one is in motion.</p>
        <h2>What's in this plot</h2>
        <ul>
          <li>The truck build — sketches, decisions, the bits that broke, the bits that worked</li>
          <li>Routes and places — added as they happen</li>
          <li>What I'm learning about living small, again</li>
        </ul>
        <p>I'll update this as the build progresses. Frame and insulation first.</p>
        <h2>From the road</h2>
        <div class="tiktoks">
          <iframe class="tiktok-player" src="https://www.tiktok.com/player/v1/7647083445293763862?autoplay=0&music_info=1&description=1" allow="fullscreen" title="TikTok — @1gato100vidas"></iframe>
          <iframe class="tiktok-player" src="https://www.tiktok.com/player/v1/7649322248792198422?autoplay=0&music_info=1&description=1" allow="fullscreen" title="TikTok — @1gato100vidas"></iframe>
        </div>`,
    },
    {
      slug: "blend",
      cover: "/garden/assets/cover-blend.webp",
      title: "BLEND by KaleidoKonscious",
      shortTitle: "BLEND",
      stage: "budding",
      topics: ["Words", "AI"],
      desc: "An interactive book of poems with AI-generated art and media. A book that listens back.",
      tended: "2024",
      order: 2,
      href: "https://miguelmalungo.github.io/kept/",
      hrefLabel: "Open the book",
      body: `
        <p>An interactive book of poems with AI-generated art and media. A book that listens back.</p>
        <p>BLEND sits in the same neighbourhood as <a class="wl" data-note="blocks">BLOCKS</a> — small typographic worlds you can move through. It's the most direct piece I've made about using AI as a co-author rather than a tool.</p>
        <p>Still tending. Pages still get rewritten when I find a new one I like.</p>`,
    },
    {
      slug: "blocks",
      cover: "/garden/assets/cover-blocks.webp",
      title: "BLOCKS",
      stage: "evergreen",
      topics: ["Words", "Code"],
      desc: "An interactive poetry book — small typographic worlds you can move through.",
      tended: "2024",
      href: "https://6945a2ad1ceae80c24d7e1cf--lovely-pegasus-e9f6e6.netlify.app/",
      hrefLabel: "Open BLOCKS",
      body: `
        <p>An interactive poetry book — small typographic worlds you can move through. Each block is a fragment; the navigation is part of the poem.</p>
        <p>Made in the same season as <a class="wl" data-note="blend">BLEND</a>, with a more mechanical, code-first attitude. Type as architecture.</p>`,
    },
    {
      slug: "bus",
      cover: "/garden/assets/bus10.webp",
      title: "The Bus",
      stage: "evergreen",
      topics: ["Travel", "Life"],
      desc: "The first home on wheels — converted, lived in, finished.",
      tended: "2024",
      media: ["/garden/assets/bus9.webp", "/garden/assets/bus14.webp"],
      gallery: [
        "/garden/assets/bus1.webp", "/garden/assets/bus2.webp", "/garden/assets/bus3.webp",
        "/garden/assets/bus4.webp", "/garden/assets/bus5.webp", "/garden/assets/bus6.webp",
        "/garden/assets/bus7.webp", "/garden/assets/bus8.webp", "/garden/assets/bus9.webp",
        "/garden/assets/bus10.webp", "/garden/assets/bus11.webp", "/garden/assets/bus12.webp",
        "/garden/assets/bus13.webp", "/garden/assets/bus14.webp", "/garden/assets/bus15.webp",
      ],
      body: `
        <p>Before the truck there was a bus. I converted it and lived in it for a stretch. It's where the taste for this came from — the discovery that a small, well-made space is more than enough, and that the view changing is a kind of furniture.</p>
        <p>The bus is done. The next chapter is <a class="wl" data-note="life-on-the-road">the truck</a>.</p>
        <h2>What lived here</h2>
        <ul>
          <li>The build — from empty shell to home</li>
          <li>Routes the bus took</li>
          <li>What I learned, what I'd do differently</li>
        </ul>
        <p>This page will fill in slowly as I sort the archive.</p>`,
    },
    {
      slug: "digisol",
      cover: "/garden/assets/cover-digisol.webp",
      title: "DigiSol",
      stage: "evergreen",
      topics: ["Code", "AI"],
      desc: "My web work — sites and apps I build.",
      tended: "2026",
      href: "https://www.digisol.pt",
      hrefLabel: "digisol.pt",
      body: `
        <p>My web work — sites and apps I build for other people. If you need something on the web that feels considered, this is the door.</p>
        <p>The companion to the more experimental things like <a class="wl" data-note="blocks">BLOCKS</a> and <a class="wl" data-note="blend">BLEND</a>: this one is craft for clients, those ones are craft for themselves.</p>
        <h2>Selected work</h2>
        <p><a class="ext" href="https://sotkis.com/" target="_blank" rel="noopener noreferrer">Sotkis ↗</a> — the website, mobile app and management platform for an intelligent waste system: underground containers with fill-level sensors and Pay-As-You-Throw access, all reporting to one dashboard.</p>
        <figure><img src="/garden/assets/sotkis.webp" alt="The Sotkis website" loading="lazy" /></figure>`,
    },
    {
      slug: "nfts-ai",
      cover: "/garden/assets/cover-nfts-ai.webp",
      title: "NFTs & Digital Art Leveraged by AI",
      shortTitle: "NFT Museum",
      stage: "evergreen",
      topics: ["Art", "AI"],
      desc: "An interactive, gamified museum app to display digital art and NFTs.",
      tended: "2024",
      href: "https://influc.my.canva.site/mfg",
      hrefLabel: "Open the museum",
      body: `
        <p>An interactive, gamified museum app to display digital art and NFTs. The idea: collectors and artists should be able to walk through their own work, not scroll past it.</p>
        <p>I built this alongside <a class="wl" data-note="blend">BLEND</a> — both came out of the same period of playing with AI as a collaborator rather than as a tool.</p>
        <p>If you'd like your own version of this — your collection, your space — get in touch.</p>`,
    },
    {
      slug: "capoeira",
      cover: "/garden/assets/cover-capoeira.webp",
      title: "Capoeira",
      stage: "budding",
      topics: ["Movement", "Practice"],
      desc: "Used to be the job. Now the practice — ginga, rhythm, the long memory of the body.",
      tended: "2026",
      body: `
        <p>Used to be the job. Now it's the practice — ginga, rhythm, the long memory of the body.</p>
        <p>It's the same kind of attention I bring to <a class="wl" data-note="surfing">surfing</a>: listening, responding, not forcing. Both teach the same lesson in different weather.</p>
        <p>When I have photos of rodas worth showing, they'll land in <a class="wl" data-note="photography">photography</a>.</p>`,
    },
    {
      slug: "films",
      cover: "/garden/assets/cover-films.webp",
      title: "Films",
      stage: "budding",
      topics: ["Film"],
      desc: "Shorts I've made and I'm making. My small theater.",
      planted: "2026",
      body: `
        <p>Shorts I've made and I'm making. My small theater.</p>
        <p>The one in motion right now is Plato's Cat — an AI-assisted film, still being built. The older work lives on my YouTube channel.</p>
        <h2>From the channel</h2>
        <p><a class="ext" href="https://www.youtube.com/@dreampiecefool/videos" target="_blank" rel="noopener noreferrer">@dreampiecefool on YouTube ↗</a></p>
        <h2>In the making</h2>
        <p><strong>Plato's Cat</strong> — an AI-assisted short film. I'm building it the way you build a cave painting: slowly, with what is at hand. The most recent piece of working with AI as a co-author; updates will land here as the cuts come together.</p>
        <p>This is also where I think out loud about working with AI in moving image.</p>`,
    },
    {
      slug: "photography",
      cover: "/garden/assets/cover-photography.webp",
      title: "Photography",
      stage: "budding",
      topics: ["Photography"],
      desc: "Frames I haven't yet sorted. A gallery, slowly being tended.",
      tended: "2026",
      body: `
        <p>Frames I haven't yet sorted. A gallery is being tended — for now, this plot is the placeholder.</p>
        <p>A lot of these come from the road, so expect overlap with <a class="wl" data-note="life-on-the-road">the truck</a> and <a class="wl" data-note="bus">the bus</a>. Some are from <a class="wl" data-note="capoeira">capoeira</a> rodas. The rest are just things that caught the eye.</p>
        <p>This page will grow once I pick the first set.</p>`,
    },
    {
      slug: "surfing",
      cover: "/garden/assets/cover-surfing.webp",
      title: "Surfing",
      stage: "budding",
      topics: ["Movement", "Practice"],
      desc: "Listening to the ocean and being humbled, often. A practice in patience.",
      tended: "2026",
      body: `
        <p>Listening to the ocean and being humbled, often. A practice in patience.</p>
        <p>The same listening I bring to <a class="wl" data-note="capoeira">capoeira</a> — the body knows before the mind catches up.</p>
        <p>Living closer to water is part of why <a class="wl" data-note="life-on-the-road">the truck</a> matters: it puts the practice within walking distance of wherever I am.</p>`,
    },
  ],

  // Horizontal shelves at the foot of the garden. Each item:
  //   { title, by, note?, img? }   img → /garden/assets/<file>.webp (poster, ~2:3)
  // Items without an img show a placeholder poster.
  shelves: [
    {
      title: "Films of my Life <em>(so far)</em>",
      kind: "film",
      items: [
        { title: "2001: A Space Odyssey", by: "Stanley Kubrick · 1968", img: "/garden/assets/film-2001.webp" },
        { title: "A Clockwork Orange", by: "Stanley Kubrick · 1971", img: "/garden/assets/film-clockwork-orange.webp" },
        { title: "Mulholland Drive", by: "David Lynch · 2001", img: "/garden/assets/film-mulholland-drive.webp" },
        { title: "Lost Highway", by: "David Lynch · 1997", img: "/garden/assets/film-lost-highway.webp" },
        { title: "Pulp Fiction", by: "Quentin Tarantino · 1994", img: "/garden/assets/film-pulp-fiction.webp" },
        { title: "Stalker", by: "Andrei Tarkovsky · 1979", img: "/garden/assets/film-stalker.webp" },
        { title: "Blade Runner", by: "Ridley Scott · 1982", img: "/garden/assets/film-blade-runner.webp" },
        { title: "Eternal Sunshine of the Spotless Mind", by: "Michel Gondry · 2004", img: "/garden/assets/film-eternal-sunshine.webp" },
        { title: "Brazil", by: "Terry Gilliam · 1985", img: "/garden/assets/film-brazil.webp" },
        { title: "The Matrix", by: "The Wachowskis · 1999", img: "/garden/assets/film-matrix.webp" },
      ],
    },
    {
      title: "Books of my Life <em>(so far)</em>",
      kind: "book",
      items: [
        { title: "The Brothers Karamazov", by: "Fyodor Dostoevsky", img: "/garden/assets/book-karamazov.webp" },
        { title: "The Idiot", by: "Fyodor Dostoevsky", img: "/garden/assets/book-idiot.webp" },
        { title: "War and Peace", by: "Leo Tolstoy", img: "/garden/assets/book-war-and-peace.webp" },
        { title: "The Grapes of Wrath", by: "John Steinbeck", img: "/garden/assets/book-grapes-of-wrath.webp" },
        { title: "East of Eden", by: "John Steinbeck", img: "/garden/assets/book-east-of-eden.webp" },
        { title: "Man's Search for Meaning", by: "Viktor E. Frankl", img: "/garden/assets/book-mans-search.webp" },
        { title: "Brave New World", by: "Aldous Huxley", img: "/garden/assets/book-brave-new-world.webp" },
        { title: "1984", by: "George Orwell", img: "/garden/assets/book-1984.webp" },
        { title: "Animal Farm", by: "George Orwell", img: "/garden/assets/book-animal-farm.webp" },
        { title: "One Hundred Years of Solitude", by: "Gabriel García Márquez", img: "/garden/assets/book-solitude.webp" },
      ],
    },
  ],
};
