# JSON Diff Tool

A fast, client-side JSON diff tool with surgical character-level highlights, split view, and structural change list.

**Live:** [johnsondiff.vercel.app](https://johnsondiff.vercel.app)

**Version:** 0.0.1

## Features

- **Split-view diff** — line-level alignment with gutter markers (+, -, ~)
- **Character-level highlights** — exact changed text highlighted inside modified lines
- **Change list view** — structural breakdown of added, removed, and edited fields
- **Syntax highlighting** — color-coded keys, strings, numbers, booleans, and nulls
- **Format / Clear / Copy** — quick actions on each input panel
- **Keyboard shortcut** — `Ctrl + Enter` to compare
- **URL params** — pass `?left=...&right=...` to auto-load payloads
- **Fully client-side** — both views run entirely in the browser; no data is sent to any server (deep-diff is vendored into the page)

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Vanilla HTML, CSS, JS |
| Backend | Express.js (static hosting + optional diff API) |
| Structural diff | [deep-diff](https://github.com/flitbit/diff) — vendored into `public/vendor/`, runs client-side |
| Fonts | Inter + JetBrains Mono |
| Deployment | Vercel |

## Getting Started

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
jsondiff-web/
├── public/
│   ├── index.html          # Homepage: tool + content (examples, edge cases, FAQ)
│   ├── style.css           # Dark theme (design tokens + tool styles)
│   ├── content.css         # Site-wide layout: nav, articles, code blocks
│   ├── app.js              # Client-side diff engine + UI
│   ├── vendor/
│   │   └── deep-diff.min.js  # Structural diff library, bundled client-side
│   ├── guides/
│   │   ├── index.html          # Guides hub
│   │   ├── diff-json-api-responses.html
│   │   ├── json-diff-in-cicd.html
│   │   ├── json-vs-yaml.html
│   │   ├── json-diff-mistakes.html
│   │   ├── json-arrays-ordering.html
│   │   ├── json-patch-vs-json-diff.html
│   │   ├── compare-package-lock-json.html
│   │   ├── diff-openapi-json-schemas.html
│   │   ├── diff-nested-json-objects.html
│   │   └── json-diff-for-webhooks.html
│   ├── about.html          # What / why / who
│   ├── privacy.html        # Client-side privacy statement
│   ├── contact.html        # Support and project contact details
│   ├── robots.txt          # Crawler directives
│   ├── sitemap.xml         # Sitemap listing all indexable pages
│   └── google*.html        # Google Search Console verification
├── server.js           # Express server (static hosting + optional /api/diff)
├── package.json
├── vercel.json         # Vercel routing config
├── .gitignore
└── README.md
```

## How It Works

1. **Parse & format** — both inputs are parsed as JSON and pretty-printed with 2-space indentation
2. **Line diff (LCS)** — a dynamic-programming LCS algorithm aligns lines by content, using normalized keys (stripped whitespace and trailing commas) for better matching
3. **Similarity merge** — nearby delete/insert pairs are scored for similarity; pairs above 0.72 are merged into "modified" lines so they appear side-by-side instead of staggered
4. **Character diff (LCS)** — each modified pair runs a character-level LCS to find exactly which characters changed, producing inline red/green highlights
5. **Render** — the split view uses a two-column table with synchronized line numbers; the change list view runs the same structural comparison in the browser using the vendored `deep-diff` bundle

## SEO

- `robots.txt` — crawler directives with sitemap reference
- `sitemap.xml` — lists the homepage, guides hub, all articles, about, privacy, and contact
- Meta tags — unique title, description, canonical, Open Graph, and Twitter Card per page
- Structured data — JSON-LD `WebApplication` + `FAQPage` on the homepage; `Article` on each guide
- Google Search Console — verified via HTML file
- Internal linking — every page links the tool, guides, about, privacy, and contact from a shared nav and footer

## Content pages

The site is a content site around the tool. Static pages live in `public/` and are served as-is:

- Homepage — the tool stays at the top; below it are four worked examples, an edge-cases explainer, and an FAQ
- `/guides/` — hub page linking articles on API-response debugging, CI/CD config drift, JSON vs YAML, common mistakes, arrays and ordering, webhooks, OpenAPI schemas, lockfiles, nested objects, and JSON Patch vs JSON Diff
- `/about.html` — what the tool is and why it exists
- `/privacy.html` — full statement of what is/isn't collected
- `/contact.html` — support, maintainer, and project contact details

## Advertising (Google AdSense)

Advertising is currently disabled. The public pages do not include ad placeholders, placeholder slot IDs, or an AdSense loader script.

Before enabling ads later, update the privacy policy, add real AdSense units only on content sections, and keep ads away from the JSON input panels so the tool remains usable and privacy expectations stay clear.

## Versioning

The app displays its version in the bottom-left corner. Current version: **0.0.1**.

To bump the version, update the version string in:
- `public/index.html` — the `<div class="version-badge">` element

## Deployment

### Vercel

```bash
npx vercel
```

Or connect the GitHub repo to Vercel for automatic deployments on every push.

### Environment

No environment variables required. The app works with zero configuration.

## API

`POST /api/diff`

```json
{
  "json1": "{\"a\": 1}",
  "json2": "{\"a\": 2}"
}
```

Response:

```json
{
  "diffs": [
    { "kind": "E", "path": ["a"], "lhs": 1, "rhs": 2 }
  ]
}
```

The web UI no longer calls this endpoint — both views run entirely client-side, so the privacy claim ("no data sent to any server") is true for the site. The endpoint remains available for scripts and CI pipelines that want structured diff output (see the CI/CD guide).

## License

ISC
