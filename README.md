# thefracturedrealm.net

Static site for **Half the Truth** — a serialized supernatural thriller web novel.

Hosted on Netlify, served from the root of this repo.

## Files

| File | Purpose |
|---|---|
| `index.html` | Single-page site: hero, synopsis, character cards, chapter list, author, platforms, footer |
| `cover-art.jpg` | Book cover image (used by hero and OG/Twitter card meta tags) |
| `favicon.jpg` | Favicon |
| `sitemap.xml` | Sitemap pointing at the homepage |
| `robots.txt` | Crawler policy — allow all, sitemap at `/sitemap.xml` |
| `googlef45ff9cc83cdf969.html` | Google Search Console domain verification |

## Editing

This is a hand-coded static site, no build step. Edit `index.html` directly. Major sections (search for the `<!-- ========== X ========== -->` comments):

- `HEADER` — hero block with cover, tagline, CTAs
- `SYNOPSIS` — "Four kids. One impossible frequency." block
- `CHARACTERS` — Thea / Cole / Yuna / Kai cards
- `CHAPTERS` — table of contents linking out to Royal Road. Add a new `<a class="chapter-card">` block per chapter using the existing pattern.
- `AUTHOR` — short blurb
- `FOLLOW / PLATFORMS` — social links (Royal Road, Patreon, YouTube, TikTok)
- `FOOTER` — copyright + hit counter

Update `sitemap.xml` `<lastmod>` whenever the page changes meaningfully.

## Deploy

Netlify is connected to this repo (after the migration from Netlify Drop). Pushing to `main` auto-deploys to https://thefracturedrealm.net within ~10 seconds.

To deploy manually:

```bash
git add -A
git commit -m "Update chapter list / fix typo / etc."
git push
```

## Cadence

New chapters publish on Royal Road every Tuesday and Thursday at 2:14 PM PT. The website auto-syncs from Royal Road via the `sync-chapters` GitHub Action — no manual edit needed when a chapter goes live.

If you want to push a manual update outside the schedule, you can:
1. Add the new chapter card to `index.html` by hand (copy a previous block, bump number, paste new RR URL + title), and/or
2. Trigger the workflow yourself: GitHub repo → **Actions** tab → **Sync chapters from Royal Road** → **Run workflow**.

The auto-sync is harmless to run anytime — if all chapters are already present, it makes no commits.

## Links

- Live site: https://thefracturedrealm.net
- Royal Road: https://www.royalroad.com/fiction/154210/half-the-truth
- YouTube: https://www.youtube.com/@TheFracturedRealm
- TikTok: https://www.tiktok.com/@thefracturedrealm.net
- Patreon: https://www.patreon.com/cw/TheFracturedRealm
