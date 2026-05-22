# Auto-sync scripts

## `sync_chapters.py`

Pulls the Royal Road TOC for fiction `154210` (Half the Truth), compares it to the chapter cards already in `index.html`, and adds any missing cards in chapter-number order. Bumps `sitemap.xml`'s `<lastmod>` when it makes changes.

### Triggered by
`.github/workflows/sync-chapters.yml`:
- **Scheduled**: every 15 minutes from 20:00 UTC through 23:45 UTC on Tue and Thu (catches the canonical 2:14 PM PT publish slot under both PDT and PST offsets).
- **Manual**: GitHub → Actions → "Sync chapters from Royal Road" → "Run workflow" button.

### Behaviour
- **No changes detected** → workflow exits without committing.
- **New chapter found** → script edits `index.html` + `sitemap.xml`, workflow commits with message `chore: auto-sync Royal Road chapters (YYYY-MM-DD HH:MM UTC)` and pushes to `main`. Netlify auto-deploys within ~5 seconds.
- **RR returns no chapters** (network or scraping failure) → script logs an error and exits with code 0; nothing is committed. Safe.

### Running locally
From this folder:

```
python scripts/sync_chapters.py
```

Requires Python 3.10+. No third-party dependencies — uses stdlib only (`urllib`, `re`, `html`, `pathlib`).

### Updating titles
The script derives chapter titles from the Royal Road slug. Six early chapters (Ch 1-6) have non-standard slugs without the `chapter-N-` prefix; their canonical titles are pinned via the `TITLE_OVERRIDES` dict near the top of `sync_chapters.py`. Add new entries there if Royal Road's slug for a chapter doesn't match the title you want shown on the website.

### Adding fresh manual chapters
Even with the auto-sync running, you can still hand-edit `index.html` to insert a chapter card before the schedule fires. The next sync will detect that the card is already there and skip the insert.
