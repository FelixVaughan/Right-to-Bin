// background.js (MV3 service worker)

// Create the context menu on install/update
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "removeFromHistory",
    title: "Remove from history",
    contexts: ["link"]
  });
});

/**
 * Strip common tracking params and normalize a URL for comparison.
 * - removes utm_* params, fbclid, gclid, ref, ref_, mc_cid, mc_eid, msclkid, icid, spm, cid, campaign, aff, aff_id
 * - normalizes default ports and duplicate trailing slashes (without changing path meaning)
 * - lowercases protocol and host for safe compare
 */
function normalizeUrl(raw) {
  try {
    const url = new URL(raw);

    // Lowercase protocol + host for comparison
    url.protocol = url.protocol.toLowerCase();
    url.host = url.host.toLowerCase();

    // Drop default ports
    if ((url.protocol === "http:" && url.port === "80") ||
        (url.protocol === "https:" && url.port === "443")) {
      url.port = "";
    }

    // Remove common tracking params
    const toStripExact = new Set([
      "fbclid","gclid","msclkid","icid","spm","cid","campaign","aff","aff_id","ref","ref_","mc_cid","mc_eid"
    ]);

    // Remove anything starting with utm_
    const params = url.searchParams;
    const keys = Array.from(params.keys());
    for (const k of keys) {
      if (k.toLowerCase().startsWith("utm_") || toStripExact.has(k.toLowerCase())) {
        params.delete(k);
      }
    }

    // Sort remaining params for stable compare
    const sorted = new URLSearchParams();
    Array.from(params.keys()).sort().forEach(k => {
      const vals = params.getAll(k);
      vals.forEach(v => sorted.append(k, v));
    });
    // Replace query with sorted
    url.search = sorted.toString() ? `?${sorted.toString()}` : "";

    // Normalize path: collapse multiple slashes (except keep leading single slash)
    url.pathname = url.pathname.replace(/\/{2,}/g, "/");

    // Avoid trailing slash differences for root path ("/" vs "")
    if (url.pathname === "/") url.pathname = "/";

    // Return normalized string form
    return url.toString();
  } catch (e) {
    return raw;
  }
}

async function removeMatchingHistory(linkUrl) {
  const normalizedTarget = normalizeUrl(linkUrl);

  // Broad search by host to keep results reasonable
  let host = "";
  try { host = new URL(linkUrl).host; } catch (e) {}

  const queryText = host || linkUrl;
  const results = await chrome.history.search({
    text: queryText,
    maxResults: 5000,
    startTime: 0
  });

  const toDelete = [];
  for (const item of results) {
    if (!item.url) continue;
    if (normalizeUrl(item.url) === normalizedTarget) {
      toDelete.append ?? toDelete.push(item.url);
    }
  }

  // If we didn't find via search, still try to delete the exact URL as a fallback
  if (toDelete.length === 0) {
    toDelete.push(linkUrl);
  }

  // Deduplicate URLs
  const unique = Array.from(new Set(toDelete));

  await Promise.all(unique.map(url => chrome.history.deleteUrl({ url })));

  return unique.length;
}

// Handle clicks on context menu
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "removeFromHistory") return;
  if (!info.linkUrl) return;

  try {
    const count = await removeMatchingHistory(info.linkUrl);
    // Optional: brief badge feedback on the action icon
    if (chrome.action && typeof chrome.action.setBadgeText === "function") {
      await chrome.action.setBadgeBackgroundColor({ color: "#555" });
      await chrome.action.setBadgeText({ text: `${count}` });
      setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2000);
    }
    console.debug(`Removed ${count} URL(s) from history for`, info.linkUrl);
  } catch (err) {
    console.error("Failed to remove from history:", err);
  }
});
