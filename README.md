
# Right‑Click: Remove Link from History (Chrome Extension)

Quickly purge a link from your browsing history. Right‑click any link → **Remove from history**.  
The extension searches your history for that URL (ignoring common tracking parameters like `utm_*`, `gclid`, etc.) and removes matching entries.

## Install (Developer Mode)
1. Download the ZIP and extract it somewhere handy.
2. In Chrome, open `chrome://extensions`.
3. Enable **Developer mode** (top‑right).
4. Click **Load unpacked** and select the extracted folder.

## How it works
- Adds a context‑menu item on links.
- On click, it:
  - normalizes the link (drops tracking params, normalizes protocol/host, sorts remaining query params),
  - searches your history by host,
  - removes all URLs whose normalized form matches the clicked link,
  - falls back to removing the exact URL if nothing matched via search.

## Permissions
- `history`: required to search and delete history items.
- `contextMenus`: required to add the right‑click menu item.

## Notes
- This removes the **URL** from history; it does not affect bookmarks or cookies.
- For pages with many tracked variants, multiple entries may be removed at once.
