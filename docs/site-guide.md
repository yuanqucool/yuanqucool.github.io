# Site maintenance guide

How the plugin portal at **<https://yuanqucool.github.io/>** is built and how to extend it.

`README.md` at the repository root is the marketing page shown on GitHub. This file is the
developer-facing counterpart: structure, conventions, media rules and deployment.

## Layout

```
index.html                      Landing page: hero + plugin grid
404.html                        Branded not-found page
document.html                   Legacy URL, redirects to the Poly Skeleton Mesh docs
css/site.css                    The whole design system (landing + docs)
js/plugins.js                   Plugin registry — the single source of truth
js/site.js                      Progressive enhancement (cards, TOC, code, video, pager)
plugins/<slug>/index.html       Plugin documentation page
plugins/<slug>/images/          Media that belongs to that plugin only
images/                         Shared brand assets (logo, favicon)
robots.txt, sitemap.xml         Crawling metadata
docs/site-guide.md              This guide
```

There is no build step and no runtime dependency: plain HTML, one CSS file and two small
scripts. What is in the repository is what ships.

## Adding a plugin

1. Create `plugins/<slug>/index.html` by copying an existing documentation page, then change
   `<body class="page-doc accent--coral" data-plugin="<slug>">` (use the new slug and a palette).
2. Put that plugin's media in `plugins/<slug>/images/` and keep paths relative to the page.
3. Add an entry to `window.YQC.plugins` in `js/plugins.js`:

```js
{
    slug: "my-plugin",                 // must match the folder and data-plugin
    name: "My Plugin",
    tagline: "One line shown under the title.",
    summary: "Two or three sentences for the card body.",
    highlights: ["Feature", "Feature", "Feature"],
    kind: "Editor tool · Runtime API",
    engine: "Unity 6+",
    accent: "coral",                   // .accent--* class in css/site.css
    cover: "plugins/my-plugin/images/cover.jpg",   // 16:10, ~960x600
    coverAlt: "Description of the cover image.",
    flag: "New",                       // optional badge on the cover
    docs: "plugins/my-plugin/",
    store: "https://assetstore.unity.com/packages/slug/000000", // or null
    storeLive: true,                   // false = listing still in review
    order: 3
}
```

Paths in the registry (`docs`, `cover`) are written **relative to the site root**. Pages live one
or two directories deep, so any link rendered by `js/site.js` must go through its
`fromSiteRoot()` helper — it resolves against `js/site.js` itself and stays correct on a
sub-path. A bare `plugin.docs` in an `href` would 404 from inside `plugins/<slug>/`; that is
the one bug class to watch for when adding generated links.

That is all. The landing page cards, the plugin count and the "next plugin" pager on every
documentation page are derived from this list. Also update the `<noscript>` fallback list in
`index.html`, add a `<url>` entry to `sitemap.xml`, and — if the plugin deserves it — a section
in the marketing `README.md`.

### Store links while a listing is in review

`store` always holds the canonical Asset Store URL. `storeLive: false` means the package is not
public yet, so:

- the card renders `Asset Store · soon` (a plain label with a tooltip) instead of a link,
- the documentation hero button is swapped for a muted `Asset Store · soon` placeholder.

The hero is authored as a normal link so the site keeps working without JavaScript:

```html
<a class="btn btn--primary" data-store-button
   href="https://assetstore.unity.com/packages/slug/000000" target="_blank" rel="noopener">Asset Store ↗</a>
```

`js/site.js` then syncs its `href` from the registry (and downgrades it when `storeLive` is
false), so the URL only lives in one place and the two pages stay consistent.

New palettes go into `css/site.css` next to `.accent--coral` / `.accent--blue`:

```css
.accent--mint {
    --accent: #10b981;
    --accent-ink: #047857;
    --accent-soft: rgba(16, 185, 129, 0.12);
}
```

## Writing documentation

- The page is hand-written HTML inside `<div class="prose">`. Every top-level `<h2>` needs an
  `id`; the sidebar "On this page" navigation is generated from those headings, so keep the ids
  stable (they are used for deep links from the README and from the Asset Store listing).
- Code uses `<pre data-lang="C#"><code>…</code></pre>`. `js/site.js` wraps it in a dark code
  block with a language label, a copy button and lightweight C# highlighting. Escape `<`, `>`
  and `&` inside code (`GetComponent&lt;SkeletonMesh&gt;()`); use `data-lang="Folder"` for
  non-code listings.
- Tables use `<div class="table-wrap"><table>…</table></div>` so they scroll on narrow screens.
- Media follows one pattern:

```html
<figure class="media">
    <video data-autoplay muted loop playsinline preload="none"
           width="1400" height="678" poster="images/clip-poster.jpg">
        <source src="images/clip.mp4" type="video/mp4">
    </video>
    <figcaption>What the clip shows.</figcaption>
</figure>
```

  `data-autoplay` videos only play while they are on screen, and `js/site.js` pins their aspect
  ratio from `width`/`height` so the page does not jump while they load. Always keep the poster
  and the explicit dimensions. Two figures side by side go in `<div class="media-grid">`.
- The documentation hero carries the Asset Store call to action: a `data-store-button` link
  next to "Start reading". Its `href` is synced from the registry, and `storeLive: false`
  downgrades it to the muted `btn--soon` placeholder at runtime.

## Media pipeline

The plugin projects keep their own documentation sources; the site keeps an optimised copy:

- **Poly Skeleton Mesh** — `Assets/PolySkeletonMesh/Documentation/README.md` and
  `Documentation/Images` in the Unity project.
- **Auto UV** — `Assets/AutoUV/README.md` and `Marketing/images` in the Unity project.

Guidelines for `plugins/<slug>/images/`:

- Screenshots: JPEG or WebP, max 1400 px wide.
- Animations: H.264 MP4 (`-crf 26`, 15 fps, 1400 px wide, no audio) plus a poster frame.
  The original GIFs are 1–26 MB each; the MP4 versions are 70–900 KB.
- Every image below the fold gets `loading="lazy" decoding="async"`.
- GitHub's README renderer is picky: use PNG or JPEG there (the README uses `cover.jpg`,
  `*-poster.jpg` and the two `*.jpg` layout previews for that reason).

Example conversion:

```bash
ffmpeg -i input.gif -vf "fps=15,scale=1400:-2:flags=lanczos" \
       -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart -an output.mp4
ffmpeg -i input.gif -vf "scale=1400:-2:flags=lanczos" -frames:v 1 -q:v 4 output-poster.jpg
```

## Local preview

```bash
python -m http.server 8123
# http://127.0.0.1:8123/
```

A plain `file://` open works for the landing page, but directory links (`plugins/auto-uv/`)
need a server.

## Deployment

Push to `main`; GitHub Pages serves the repository root. Nothing is generated, minified or
copied at deploy time.
