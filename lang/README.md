# Vectorize This language research

This folder contains machine-readable terminology research for translating and reviewing VectorizeThis.com.

## Files

- `index.json` — locale index and concept counts.
- `fr-FR.json` — French (France / international default).
- `de-DE.json` — German (Germany / international DACH default).
- `es-ES.json` — Spanish (Spain / neutral international starting point).
- `it-IT.json` — Italian.
- `pt-BR.json` — Brazilian Portuguese, selected as the default Portuguese locale for the larger Portuguese-language web/search audience.

## How to use these files

Treat each JSON file as a **translation decision system**, not as a word-for-word dictionary.

For translation:

1. Preserve the English concept and user intent first.
2. Use `preferred` as the default terminology.
3. Use `seo_variants` in SEO-sensitive titles, headings, FAQs and links when they are more natural for search intent.
4. Use `ui_variant` for short buttons, labels and settings when supplied.
5. Respect `avoid`, `keep_english`, `register`, and `notes`.
6. Inflect terms naturally. Do not freeze glossary strings when grammar requires gender, case, articles, contractions, conjugation or word-order changes.
7. Never translate or alter PNG, JPG, JPEG, SVG, CNC, Vectorize This, Adobe Illustrator, Cricut or Tinkercad.
8. Never reverse input/output direction. “PNG to SVG” must always remain PNG source → SVG output.
9. Preserve privacy claims precisely. “Runs locally/in your browser” means image processing occurs on the user’s device; it must not be weakened to generic “secure online processing” or strengthened to “works offline.”
10. Do not turn “scales without losing quality” into a claim that the tool improves, restores or creates image detail.

For review:

- Compare the translation against the English source and the locale JSON.
- Flag semantic errors, wrong technical terms, unnatural UI wording, register inconsistency, SEO-intent loss, untranslated text that should be localized, and translated brands/formats that must remain unchanged.
- Treat source/output reversal, changed privacy meaning, changed file format, invented capabilities, and materially incorrect vector/raster terminology as critical errors.
- Suggest exact corrected wording rather than only identifying a problem.

## Terminology distinctions that matter

- **Vectorization vs tracing:** these overlap but are not always the same localized word. Each locale JSON records the preferred general vectorization term and the localized Illustrator-style tracing term.
- **Path vs tracing:** a vector/SVG “path” is geometry; “tracing” is the process. Do not use one term indiscriminately for both.
- **Raster vs bitmap:** some languages prefer a localized technical term while others commonly retain “raster” or “bitmap.”
- **SEO wording vs natural prose:** short query patterns such as “PNG a SVG”, “PNG en SVG”, “PNG zu SVG”, etc. can differ from the best wording in a complete sentence.

## Evidence and confidence

The research prioritizes:

1. current VectorizeThis.com product/technical terminology,
2. localized Adobe Illustrator / Adobe Express terminology,
3. observed localized search-result wording and established converter/design terminology.

Each locale file includes a `sources` object and per-term confidence. Lower-confidence items should be rechecked when they become central to a page or UI.

## Stable concept IDs

Keys inside `terms` are English concept IDs and should remain identical across locales. Add new concepts using snake_case English IDs, then add the same ID to every locale that needs it.

## Updating the dataset

When adding or revising terminology:

- prefer genuine localized professional/software usage over literal translation;
- distinguish observed terminology from editorial recommendations;
- add or update source URLs;
- lower confidence when evidence conflicts;
- keep JSON valid and UTF-8;
- update `index.json` concept counts when terms are added or removed.

## Scope

This is Run 1 of the multilingual terminology research and covers French, German, Spanish, Italian and Brazilian Portuguese.