/* Google Suggest scraper — paste this entire file into the console on google.com.
 * One row per distinct keyword, with every observation retained.
 * Stores checkpoints locally in IndexedDB; no fixed limit on expansion.
 */
(async () => {
  "use strict";

  const CONFIG = {
    keywords: ["elementor woocommerce"],
    requiredTerms: ["woocommerce"], // All terms must be present; [] disables this filter.
    strictSeedMatch: true,          // Also require one full original seed phrase.
    alphabet: "abcdefghijklmnopqrstuvwxyz".split(""),
    numbers: Array.from({ length: 23 }, (_, i) => String(i)),
    years: ["2021", "2022", "2023"],
    preModifiers: [],               // e.g. ["why", "what"]
    postModifiers: [],              // e.g. ["how to", "how many"]
    minDelay: 250,                 // Initial delay AFTER each query, in milliseconds.
    settleDelay: 250,              // Wait for autocomplete DOM to settle.
    timeout: 4000,
    maxRetries: 3,
    retryDelay: 500,
    backoffMultiplier: 1.7,
    maxDelay: 10000,
    recoveryAfter: 15,
    checkpointEvery: 5,
    autoExport: true,
    exportOccurrences: true
  };

  const DB_NAME = "google-suggest-scraper-v1";
  const STORE = "sessions";
  const SESSION_KEY = "active";
  const normalize = value => String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  const tidy = value => String(value ?? "").replace(/\s+/g, " ").trim();
  const unique = values => [...new Set(values.map(tidy).filter(Boolean))];
  const isAbort = error => error?.name === "AbortError";

  if (window.googleSuggestScraper?.running) {
    console.warn("Google Suggest scraper is already running.");
    return;
  }

  const controller = new AbortController();
  const signal = controller.signal;
  let db = null;
  let pauseRequested = false;
  let currentDelay = CONFIG.minDelay;
  let successStreak = 0;
  let state;

  function abortError() {
    return new DOMException("Scraper stopped", "AbortError");
  }

  function sleep(ms) {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(abortError());
      const onAbort = () => {
        clearTimeout(timer);
        reject(abortError());
      };
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) {
          request.result.createObjectStore(STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function dbGet() {
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).get(SESSION_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function dbPut(value) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(value, SESSION_KEY);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  function dbClear() {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).delete(SESSION_KEY);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  }

  function fingerprint(config) {
    // Timing settings may change safely; discovery/filter settings may not.
    return JSON.stringify({
      keywords: config.keywords.map(normalize),
      requiredTerms: config.requiredTerms.map(normalize),
      strictSeedMatch: config.strictSeedMatch,
      alphabet: config.alphabet,
      numbers: config.numbers,
      years: config.years,
      preModifiers: config.preModifiers,
      postModifiers: config.postModifiers
    });
  }

  function initialQueries() {
    const modifiers = unique([...CONFIG.alphabet, ...CONFIG.numbers, ...CONFIG.years]);
    return unique(CONFIG.keywords.flatMap(seed => [
      seed,
      ...modifiers.map(mod => seed + " " + mod),
      ...CONFIG.preModifiers.map(mod => mod + " " + seed),
      ...CONFIG.postModifiers.map(mod => seed + " " + mod)
    ]));
  }

  function emptyState() {
    return {
      version: 1,
      signature: fingerprint(CONFIG),
      phase: 1,
      pending: initialQueries(),
      cursor: 0,
      visited: [],
      results: [],
      failed: [],
      completed: 0,
      startedAt: new Date().toISOString(),
      updatedAt: null,
      finished: false
    };
  }

  function snapshot() {
    return {
      ...state,
      pending: [...state.pending],
      visited: [...state.visited],
      results: [...state.results.entries()],
      failed: [...state.failed.entries()],
      updatedAt: new Date().toISOString()
    };
  }

  async function checkpoint() {
    await dbPut(snapshot());
  }

  function fieldElement() {
    return document.querySelector('textarea[name="q"], input[name="q"], input[jsaction]');
  }

  function challengePresent() {
    const text = (document.body?.innerText || "").slice(0, 5000).toLowerCase();
    return Boolean(
      document.querySelector('form[action*="/sorry/"], #recaptcha, .g-recaptcha') ||
      /unusual traffic from your computer network|not a robot|verify you are human/.test(text)
    );
  }

  function suggestionElements() {
    const selectors = [
      '.sbct .wM6W7d',
      '[role="listbox"] [role="option"] .wM6W7d',
      'form ul > li > div > div:nth-child(2) > div:first-child'
    ];
    for (const selector of selectors) {
      const nodes = [...document.querySelectorAll(selector)]
        .filter(node => node.getClientRects().length);
      if (nodes.length) return nodes;
    }
    return [];
  }

  function suggestions() {
    // Deduplicate entries inside one dropdown, but preserve their displayed order.
    const seen = new Set();
    return suggestionElements().map(node => tidy(node.textContent))
      .filter(value => {
        const key = normalize(value);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function setInput(field, value) {
    const descriptor = Object.getOwnPropertyDescriptor(
      field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      "value"
    );
    if (descriptor?.set) descriptor.set.call(field, value);
    else field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function waitForFreshSuggestions(previous, query) {
    return new Promise((resolve, reject) => {
      const prior = JSON.stringify(previous);
      let finished = false;
      let settleTimer = null;
      let timeoutTimer = null;
      let observer = null;

      const cleanup = () => {
        observer?.disconnect();
        clearTimeout(settleTimer);
        clearTimeout(timeoutTimer);
        signal.removeEventListener("abort", onAbort);
      };
      const finish = value => {
        if (finished) return;
        finished = true;
        cleanup();
        resolve(value);
      };
      const onAbort = () => {
        if (finished) return;
        finished = true;
        cleanup();
        reject(abortError());
      };
      const check = () => {
        if (challengePresent()) return finish({ status: "challenge", values: [] });
        const current = suggestions();
        if (!current.length || JSON.stringify(current) === prior) return;
        clearTimeout(settleTimer);
        settleTimer = setTimeout(() => {
          const stable = suggestions();
          // A changed dropdown is a heuristic, NOT proof that the response belongs to query.
          if (stable.length && JSON.stringify(stable) !== prior) {
            finish({ status: "ok", values: stable });
          }
        }, CONFIG.settleDelay);
      };

      observer = new MutationObserver(check);
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      signal.addEventListener("abort", onAbort, { once: true });
      timeoutTimer = setTimeout(() => finish({ status: "timeout", values: [] }), CONFIG.timeout);
      check();
    });
  }

  async function queryGoogle(query) {
    const field = fieldElement();
    if (!field) throw new Error("Google Search input not found. Open google.com.");

    for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
      if (signal.aborted) throw abortError();
      if (challengePresent()) return { status: "challenge", values: [] };

      field.focus();
      // Clear before every query to reduce stale autocomplete collisions.
      setInput(field, "");
      await sleep(attempt ? CONFIG.retryDelay : 100);

      const previous = suggestions();
      const pending = waitForFreshSuggestions(previous, query);
      setInput(field, query);
      const response = await pending;
      if (response.status === "ok" || response.status === "challenge") return response;
      console.warn("No fresh suggestions:", query, "attempt", attempt + 1);
      if (attempt < CONFIG.maxRetries) await sleep(CONFIG.retryDelay);
    }
    return { status: "timeout", values: [] };
  }

  function matchesFilters(keyword) {
    const value = normalize(keyword);
    const required = CONFIG.requiredTerms.every(term => value.includes(normalize(term)));
    const seed = !CONFIG.strictSeedMatch ||
      CONFIG.keywords.some(term => value.includes(normalize(term)));
    return required && seed;
  }

  function collect(values, query, phase) {
    values.forEach((keyword, index) => {
      if (!matchesFilters(keyword)) return;
      const key = normalize(keyword);
      const match = {
        query,
        position: index + 1,
        phase: phase === 1 ? "initial" : phase === 2 ? "expansion" : "thorough"
      };
      const existing = state.results.get(key);
      if (existing) {
        // Every appearance in a distinct executed query is retained.
        existing.matches.push(match);
        if (match.position < existing.bestPosition) existing.bestPosition = match.position;
      } else {
        state.results.set(key, {
          keyword: tidy(keyword),
          bestPosition: match.position,
          matches: [match]
        });
      }
    });
  }

  function advancePhase() {
    if (state.phase === 1) {
      state.phase = 2;
      state.pending = [...state.results.values()].map(item => item.keyword);
    } else if (state.phase === 2) {
      state.phase = 3;
      state.pending = [...state.results.values()].flatMap(item =>
        CONFIG.alphabet.map(letter => item.keyword + " " + letter)
      );
    } else {
      state.finished = true;
      state.pending = [];
    }
    state.cursor = 0;
    state.pending = unique(state.pending).filter(query => !state.visited.has(normalize(query)));
    console.log("Phase", state.phase, "queue size:", state.pending.length);
  }

  function pace(status) {
    if (status === "ok") {
      successStreak++;
      if (successStreak >= CONFIG.recoveryAfter) {
        currentDelay = Math.max(CONFIG.minDelay, Math.round(currentDelay / CONFIG.backoffMultiplier));
        successStreak = 0;
      }
    } else {
      successStreak = 0;
      currentDelay = Math.min(CONFIG.maxDelay, Math.round(Math.max(currentDelay, CONFIG.minDelay) * CONFIG.backoffMultiplier));
      console.warn("Possible throttling or UI mismatch. Delay now", currentDelay, "ms");
    }
  }

  function csvEscape(value) {
    const string = String(value ?? "");
    // Prevent spreadsheet formula execution when importing scraped text.
    const safe = /^[\s]*[=+\-@\t\r]/.test(string) ? "'" + string : string;
    return '"' + safe.replace(/"/g, '""') + '"';
  }

  function downloadCSV(name, rows) {
    const text = "\uFEFF" + rows.map(row => row.map(csvEscape).join(",")).join("\r\n");
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function exportResults() {
    const rows = [...state.results.values()];
    downloadCSV("google-suggest-keywords.csv", [
      ["Keyword", "Best Position", "Match Count", "First Query", "All Matches (JSON)"],
      ...rows.map(item => [
        item.keyword,
        item.bestPosition,
        item.matches.length,
        item.matches[0]?.query || "",
        JSON.stringify(item.matches)
      ])
    ]);
    if (CONFIG.exportOccurrences) {
      downloadCSV("google-suggest-occurrences.csv", [
        ["Keyword", "Query", "Position", "Phase"],
        ...rows.flatMap(item => item.matches.map(match =>
          [item.keyword, match.query, match.position, match.phase]
        ))
      ]);
    }
    console.log("Exported", rows.length, "unique keywords and",
      rows.reduce((sum, row) => sum + row.matches.length, 0), "occurrences.");
  }

  const api = {
    running: true,
    stop() { controller.abort(); },
    pause() { pauseRequested = true; console.log("Pausing after the current query."); },
    resume() {
      console.log("To resume a paused or stopped session, run this file again.");
    },
    export: exportResults,
    getResults() { return [...state.results.values()]; },
    getStatus() {
      return {
        phase: state.phase,
        completed: state.completed,
        remainingThisPhase: state.pending.length - state.cursor,
        uniqueKeywords: state.results.size,
        occurrences: [...state.results.values()].reduce((n, r) => n + r.matches.length, 0),
        failedQueries: state.failed.size,
        currentDelay,
        finished: state.finished
      };
    },
    async clearCheckpoint() {
      if (api.running) throw new Error("Stop the running scraper before clearing checkpoints.");
      await dbClear();
      console.log("Saved session deleted. Run the script again to start fresh.");
    }
  };
  window.googleSuggestScraper = api;

  try {
    db = await openDB();
    const saved = await dbGet();

    if (saved && !saved.finished && saved.signature !== fingerprint(CONFIG)) {
      throw new Error("Saved session uses different keywords/filters. Stop and call googleSuggestScraper.clearCheckpoint() to start fresh, or restore the original configuration.");
    }
    if (saved && !saved.finished) {
      state = {
        ...saved,
        visited: new Set(saved.visited),
        results: new Map(saved.results),
        failed: new Map(saved.failed)
      };
      console.log("Resumed saved session: phase", state.phase,
        "completed", state.completed, "keywords", state.results.size);
    } else {
      state = emptyState();
      state.visited = new Set();
      state.results = new Map();
      state.failed = new Map();
      await checkpoint();
      console.log("Started new Google Suggest session.");
    }

    while (!state.finished && !signal.aborted && !pauseRequested) {
      if (challengePresent()) {
        console.warn("Google verification detected. Pausing; resolve it manually before running the script again.");
        break;
      }

      if (state.cursor >= state.pending.length) {
        advancePhase();
        await checkpoint();
        continue;
      }

      const query = state.pending[state.cursor];
      const key = normalize(query);
      if (state.visited.has(key)) {
        state.cursor++;
        continue;
      }

      // If aborted mid-query, leave cursor unchanged so it can be retried on resume.
      const response = await queryGoogle(query);
      if (response.status === "challenge") {
        console.warn("Verification challenge detected; session saved for resume.");
        break;
      }

      if (response.status === "ok") {
        collect(response.values, query, state.phase);
        state.failed.delete(key);
      } else {
        state.failed.set(key, { query, phase: state.phase, reason: response.status });
      }

      state.visited.add(key);
      state.cursor++;
      state.completed++;
      pace(response.status);

      if (state.completed % 10 === 0) console.log("Progress", api.getStatus());
      if (state.completed % CONFIG.checkpointEvery === 0) await checkpoint();
      await sleep(currentDelay);
    }

    await checkpoint();
    console.log("Session status:", api.getStatus());
    if (state.finished) console.log("All three phases complete.");

  } catch (error) {
    if (!isAbort(error)) console.error("Scraper error:", error);
  } finally {
    if (db && state) {
      try { await checkpoint(); } catch (error) { console.warn("Checkpoint failed:", error); }
    }
    api.running = false;
    if (state && CONFIG.autoExport) exportResults();
    console.log("Run the script again on the same Google origin to resume unfinished work.");
  }
})();
