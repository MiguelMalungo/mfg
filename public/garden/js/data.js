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
          <blockquote class="tiktok-embed" cite="https://www.tiktok.com/@1gato100vidas/video/7649322248792198422" data-video-id="7649322248792198422" style="max-width:325px;min-width:325px;"><section><a target="_blank" title="@1gato100vidas" href="https://www.tiktok.com/@1gato100vidas?refer=embed">@1gato100vidas</a></section></blockquote>
          <blockquote class="tiktok-embed" cite="https://www.tiktok.com/@1gato100vidas/video/7647083445293763862" data-video-id="7647083445293763862" style="max-width:325px;min-width:325px;"><section><a target="_blank" title="@1gato100vidas" href="https://www.tiktok.com/@1gato100vidas?refer=embed">@1gato100vidas</a></section></blockquote>
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
        <p>Recent client work: <a class="wl" data-note="sotkis">Sotkis</a> — the website, mobile app and management platform for an intelligent waste system.</p>
        <p>The companion to the more experimental things like <a class="wl" data-note="blocks">BLOCKS</a> and <a class="wl" data-note="blend">BLEND</a>: this one is craft for clients, those ones are craft for themselves.</p>`,
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
      slug: "sotkis",
      cover: "/garden/assets/cover-sotkis.webp",
      title: "Sotkis",
      stage: "evergreen",
      topics: ["Code", "Design"],
      desc: "Website, mobile app and management platform for an intelligent waste system.",
      tended: "2026",
      href: "https://sotkis.com/",
      hrefLabel: "sotkis.com",
      media: ["/garden/assets/sotkis.webp"],
      body: `
        <p>Sotkis is an intelligent waste-management system — underground containers with sensors that track fill levels and access, so collections run on data instead of guesswork.</p>
        <p>I built their <a class="ext" href="https://sotkis.com/" target="_blank" rel="noopener noreferrer">website</a> and designed the mobile app and the management platform: the place operators monitor containers, plan routes and read the numbers coming off the sensors.</p>
        <figure><img src="/garden/assets/sotkis.webp" alt="The Sotkis website" loading="lazy" /></figure>
        <p>This is <a class="wl" data-note="digisol">DigiSol</a> work — craft for a client, the considered kind.</p>`,
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
        <p>The one in motion right now is <a class="wl" data-note="platos-cat">Plato's Cat</a> — an AI-assisted film, still being built. The older work lives on my YouTube channel.</p>
        <h2>From the channel</h2>
        <p><a class="ext" href="https://www.youtube.com/@dreampiecefool/videos" target="_blank" rel="noopener noreferrer">@dreampiecefool on YouTube ↗</a></p>
        <h2>In the making</h2>
        <ul>
          <li><a class="wl" data-note="platos-cat">Plato's Cat</a> — an AI-assisted film, seedling stage</li>
        </ul>
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
    {
      slug: "platos-cat",
      cover: "/garden/assets/cover-platos-cat.webp",
      title: "Plato's Cat",
      stage: "seedling",
      topics: ["Film", "AI"],
      desc: "An AI-assisted short film, in the making.",
      planted: "2026",
      body: `
        <p>An AI-assisted short film, in the making. I'm building it the way you build a cave painting — slowly, with what is at hand.</p>
        <p>It belongs to the <a class="wl" data-note="films">films</a> plot, and is the most recent piece of working with AI as a co-author.</p>
        <p>Updates will appear here as the cuts come together.</p>`,
    },
  ],
};
