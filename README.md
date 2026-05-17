# CodeFryDev

Static site for [codefrydev.in](https://codefrydev.in/) — free online tools, games, AI apps, and creative resources. Built with [Hugo](https://gohugo.io/) and Tailwind CSS, deployed to GitHub Pages.

## Features

- **Modern homepage** — category grids, search palette, scroll sections, dark/light theme
- **Browse** — `/browse/` index plus category pages (`creative-assets`, `tools-utilities`, `games-fun`, `site-links`, `containers-packages`)
- **Hubs** — Games, AI, Design Lab, Store, Search
- **CFDDC** — year-by-year “developer conference” pages at `/cfddc/` fed from [`data/history.yaml`](data/history.yaml)
- **History timeline** — `/history/`
- **Ladybug easter egg** — homepage only; click **Beta** in the nav to reveal
- **Press, About us, team profiles**, FAQ, and more

## Tech stack

| Layer | Tools |
|--------|--------|
| Site generator | Hugo Extended **0.160.1** (see [`.github/workflows/hugo.yaml`](.github/workflows/hugo.yaml)) |
| Styling | Tailwind CSS 3 → `static/css/home-tailwind.css` |
| Dark theme | `assets/css/modern-dark-theme.css` (copied to `static/css/` on build) |
| Icons | Phosphor Icons (CDN) |
| Deploy | GitHub Actions → GitHub Pages |

## Prerequisites

- [Hugo Extended](https://gohugo.io/installation/) (0.160+ recommended)
- [Node.js](https://nodejs.org/) 18+ and npm (for CSS build)

## Local development

```bash
# Install JS dependencies (first time)
npm install

# Build Tailwind + dark theme CSS
npm run build:css

# Watch CSS while editing (optional, second terminal)
npm run watch:css

# Run dev server
hugo server
```

Open [http://localhost:1313/](http://localhost:1313/). After changing templates or `assets/css/tailwind-input.css`, run `npm run build:css` (or use `watch:css`).

Production build:

```bash
npm run build:css && hugo --minify
```

Output is written to `public/`.

## Project structure

```text
content/          Page front matter (Markdown/HTML)
data/             YAML data (home categories, history, browse meta, FAQ, …)
layouts/          Hugo templates (home, browse, cfddc, hubs, modern shell)
layouts/partials/ Reusable partials (nav, tool cards, ladybug, …)
static/           CSS, JS, images (served as-is)
assets/css/       Tailwind source + modern-dark-theme source
```

### Main data files

| File | Purpose |
|------|---------|
| [`data/home.yaml`](data/home.yaml) | Homepage tool categories and cards |
| [`data/homepage.yaml`](data/homepage.yaml) | Hero slides, nav mega menu, testimonials, FAQ copy |
| [`data/history.yaml`](data/history.yaml) | Timeline entries (also powers CFDDC year pages) |
| [`data/cfddc.yaml`](data/cfddc.yaml) | Optional per-year CFDDC taglines/dates |
| [`data/store.yaml`](data/store.yaml) | Mobile store listings |
| [`data/games.yaml`](data/games.yaml), [`data/ai.yaml`](data/ai.yaml), etc. | Hub page content |

## Adding a new hub or browse category

**Hub** (e.g. a top-level section like `/games/`):

1. Add `content/<section>/_index.md` with title and description.
2. Add `data/<section>.yaml` with items (`name`, `icon`, `url`, …).
3. Add `layouts/<section>/` template (see existing `games`, `ai`, `store`).
4. Link from [`data/homepage.yaml`](data/homepage.yaml) nav mega menu if needed.

**Browse category** (under `/browse/<slug>/`):

1. Add tools to a category in [`data/home.yaml`](data/home.yaml).
2. Create `content/browse/<slug>/_index.md` with `category_slug` matching the YAML slug.
3. Ensure [`layouts/browse/list.html`](layouts/browse/list.html) routes the category (uses `browse-category` partial).

## Adding a CFDDC year

When [`data/history.yaml`](data/history.yaml) includes dates for a new year:

1. Create `content/cfddc/<year>/_index.md` with `year: "<year>"` in front matter.
2. Optionally add copy under `years.<year>` in [`data/cfddc.yaml`](data/cfddc.yaml).
3. The hub at `/cfddc/` lists years automatically from history dates.

## Homepage ladybug

- Partial: [`layouts/partials/ladybug.html`](layouts/partials/ladybug.html)
- Assets: `static/css/ladybug.css`, `static/js/ladybug.js`
- Included only on [`layouts/index.html`](layouts/index.html)
- **Beta** in the nav (`#ladybug-reveal-beta`) reveals the easter egg on the homepage

## CSS notes

- Edit Tailwind utilities and components in [`assets/css/tailwind-input.css`](assets/css/tailwind-input.css).
- Edit dark-mode overrides in [`assets/css/modern-dark-theme.css`](assets/css/modern-dark-theme.css).
- Always run `npm run build:css` before committing CSS-related changes (CI runs this on deploy).

## Deployment

Pushes to `main` trigger [`.github/workflows/hugo.yaml`](.github/workflows/hugo.yaml): install Hugo → `npm run build:css` → `hugo --minify` → deploy `public/` to GitHub Pages.

## License

Content and branding © CodeFryDev. See repository settings for contribution terms.
