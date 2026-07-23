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
- **Fully client-side** — no data is sent to any server (split view runs entirely in the browser)

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Vanilla HTML, CSS, JS |
| Backend | Express.js |
| Structural diff | [deep-diff](https://github.com/flitbit/diff) |
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
│   ├── index.html      # Main page with SEO meta tags
│   ├── style.css       # Dark theme styles
│   ├── app.js          # Client-side diff engine + UI
│   ├── robots.txt      # Crawler directives
│   ├── sitemap.xml     # Sitemap for search engines
│   └── google*.html    # Google Search Console verification
├── server.js           # Express backend (structural diff API)
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
5. **Render** — the split view uses a two-column table with synchronized line numbers; the change list view sends both payloads to the `/api/diff` endpoint for structural comparison via `deep-diff`

## SEO

- `robots.txt` — crawler directives with sitemap reference
- `sitemap.xml` — XML sitemap for search engines
- Meta tags — title, description, keywords, Open Graph, Twitter Card
- Structured data — JSON-LD WebApplication schema
- Google Search Console — verified via HTML file

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

The structural diff API is used by the Change List view. The Split View runs entirely client-side.

## License

ISC
