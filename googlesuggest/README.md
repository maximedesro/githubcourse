# Google Suggest scraper

Run `google-suggest.js` in the **browser DevTools console on Google Search** (`google.com`). This is a browser-console script, not a Node.js package or a website JavaScript bundle.

## Setup

1. Open Google Search and focus the standard Search page.
2. Copy the entire contents of [google-suggest.js](./google-suggest.js), then paste it into the DevTools Console.
3. Customize the `CONFIG` block at the top: `keywords`, `requiredTerms`, optional modifiers, and pacing.
4. Leave the tab open while it runs. Browser developer-console paste protection may require manual acknowledgement.

## Discovery phases

1. Search each seed plus alphabet letters, numbers 0–22, the configured years, and optional prefix/suffix modifiers.
2. Search **every** matching unique suggestion discovered in phase 1.
3. Append the complete alphabet to **every** matching unique suggestion discovered in phases 1 and 2.

There is no arbitrary keyword count or expansion-seed cap. Identical query strings are executed once. In large searches, phase 3 can require many thousands of autocomplete requests.

## Deduplication and exports

The main CSV contains one row per normalized keyword, plus its best observed position, number of matches, first query, and an `All Matches (JSON)` field. Each match records the query, position and phase. The second CSV contains a row per occurrence for easy spreadsheet analysis. Each export only includes suggestions that pass `requiredTerms` (AND) and, by default, contain a seed phrase (`strictSeedMatch`).

## Controls

While running, in the **same tab's console**:

```js
googleSuggestScraper.getStatus()
googleSuggestScraper.getResults()
googleSuggestScraper.export()
googleSuggestScraper.pause() // Finish current query, save, export
googleSuggestScraper.stop()  // Interrupt, save, export
```

To resume, run the full script again on the **same Google origin**. Sessions are checkpointed in IndexedDB every five completed queries and at phase boundaries. The previous completed run is replaced by a fresh run when you rerun the script. Stop a run before clearing its checkpoint:

```js
await googleSuggestScraper.clearCheckpoint()
```

Changing the discovery keywords, filters, or modifiers during an unfinished run requires clearing the saved checkpoint first. Timing settings can change across resumes. Checkpoints are local to the current browser profile and page origin, so `www.google.com` and another Google domain may not share them. Clearing site data or using a different browser profile also removes access to those checkpoints.

## Pacing and caveats

The scraper waits for an autocomplete DOM mutation, then a stabilization interval, **plus** a minimum inter-query delay. It starts at 250 ms after a completed query; failures increase this interval up to 10 seconds, and successful streaks bring it back down. Queries are sequential because they use one shared input.

**Important:** Google does not expose a reliable query-specific completion signal through this page's DOM. Changed suggestions are only a heuristic; identical results may time out, and stale/delayed UI updates can be misattributed. A timeout is not necessarily rate limiting. Google can change its markup, omit suggestions, or require a verification challenge; the script pauses if common challenge indicators are detected rather than attempting to bypass them. Failed queries are logged and not retried endlessly. Review results before relying on them.

The code is untested against Google's live interface; selectors may need updating after Google changes its page.
