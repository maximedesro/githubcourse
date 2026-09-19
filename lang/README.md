# Vectorize This language research

This folder contains machine-readable terminology research for translating and reviewing VectorizeThis.com.

## Files

- `index.json` — locale index and concept counts.
- `fr-FR.json` — French.
- `de-DE.json` — German.
- `es-ES.json` — Spanish.
- `it-IT.json` — Italian.
- `pt-BR.json` — Brazilian Portuguese.
- `nl-NL.json` — Dutch.
- `da-DK.json` — Danish.
- `nb-NO.json` — Norwegian Bokmål.
- `sv-SE.json` — Swedish.
- `fi-FI.json` — Finnish.
- `zh-CN.json` — Simplified Chinese.
- `ja-JP.json` — Japanese.
- `ko-KR.json` — Korean.
- `vi-VN.json` — Vietnamese.
- `th-TH.json` — Thai.
- `id-ID.json` — Indonesian.
- `ms-MY.json` — Malaysian Malay.
- `fil-PH.json` — Filipino.
- `hi-IN.json` — Hindi.
- `bn-BD.json` — Bengali.
- `ar.json` — Modern Standard Arabic, used as the international Arabic default.
- `he-IL.json` — Hebrew.
- `fa-IR.json` — Persian.
- `ur-PK.json` — Urdu.
- `tr-TR.json` — Turkish.
- `ru-RU.json` — Russian.
- `uk-UA.json` — Ukrainian.
- `pl-PL.json` — Polish.
- `el-GR.json` — Greek.
- `sw-KE.json` — Swahili (Kenya-oriented default).

## How to use these files

Treat each JSON file as a **translation decision system**, not as a word-for-word dictionary.

For translation:

1. Preserve the English concept and user intent first.
2. Use `preferred` as the default terminology.
3. Use `seo_variants` in SEO-sensitive titles, headings, FAQs and links when they are more natural for search intent.
4. Use `ui_variant` for short buttons, labels and settings when supplied.
5. Respect `avoid`, `keep_english`, `register`, `notes`, and `confidence`.
6. Inflect and restructure naturally. Do not freeze glossary strings when grammar, particles, gender, number, case, suffixes, code-switching, or word order require changes.
7. Never translate or alter PNG, JPG, JPEG, SVG, CNC, Vectorize This, Adobe Illustrator, Cricut or Tinkercad.
8. Never reverse input/output direction. “PNG to SVG” must remain PNG source → SVG output.
9. Preserve privacy claims precisely. “Runs locally/in your browser” means image processing occurs on the user’s device; it must not become generic cloud/security wording or “works offline.”
10. Do not turn “scales without losing quality” into a claim that the tool improves, restores or invents image detail.

For review:

- Compare the translation against the English source and locale JSON.
- Flag semantic errors, incorrect technical terms, unnatural UI wording, register inconsistency, SEO-intent loss, untranslated text that should be localized, and translated brands/formats that must remain unchanged.
- Treat source/output reversal, changed privacy meaning, changed file format, invented capabilities, and materially incorrect vector/raster terminology as critical errors.
- Suggest exact corrected wording.

## Terminology distinctions that matter

- **Vectorization vs tracing:** related but not identical. Use each locale's vectorization term for the general raster→vector outcome and its tracing term for trace mechanics/features.
- **Path vs tracing:** a vector/SVG path is geometry; tracing is a process.
- **Raster vs bitmap:** do not assume they share one localized term.
- **SEO wording vs natural prose:** short query language can differ from complete-sentence localization.
- **Filipino, Hindi, Persian, Urdu:** established graphics/software usage often mixes local grammar with English-derived technical terminology. Do not over-localize these into obscure terms.
- **Turkish:** allow natural Turkish case suffixes and vowel harmony around file-format tokens, e.g. `SVG'ye`, `PNG'yi`.
- **Russian:** distinguish `Трассировка изображения` (tracing) from `векторизация` (general vectorization) and `контур` (path geometry).
- **Ukrainian:** use `Трасування зображення`, `векторизація`, and `контур`; avoid Russian-influenced UI wording such as `скачати` when standard Ukrainian `завантажити` is appropriate.
- **Polish:** Adobe uses `Obrys obrazu`, `ścieżka`, and `punkt kontrolny`; allow natural case inflection rather than freezing glossary forms.
- **Greek:** prefer `διανυσματοποίηση` / `διανυσματικά γραφικά` for vectorization concepts; some Adobe feature labels may remain English.
- **Swahili:** authoritative localized graphics terminology is sparse. Prefer clear standard Swahili plus familiar English technical loans over obscure coined terminology, and respect lower confidence markers.
- **Arabic:** use neutral Modern Standard Arabic rather than a regional dialect.
- **Hebrew:** modern Israeli software terminology often retains English product feature names such as `Image Trace` while localizing surrounding explanations.

## RTL requirements

Arabic, Hebrew, Persian and Urdu are right-to-left languages.

When these locale datasets are used:

- set the document/container direction appropriately with `dir="rtl"`;
- keep SVG, PNG, JPG, JPEG, URLs, filenames, code, CSS values, MIME types, dimensions and other technical Latin-script tokens in their original order;
- use Unicode bidi isolation or suitable markup around LTR technical spans when necessary;
- test strings containing source/output pairs such as PNG → SVG visually, not only semantically;
- do not reverse source and destination because of visual RTL ordering;
- ensure punctuation, parentheses, slashes and numbers render in the intended sequence;
- do not translate code, schema keys, file extensions or URL slugs.

## Evidence and confidence

The research prioritizes:

1. current VectorizeThis.com terminology,
2. localized Adobe Illustrator / Adobe Express terminology,
3. localized professional/search terminology.

Each locale file contains a `sources` object and per-term confidence.

Vendor localization coverage is uneven:

- Arabic, Hebrew and Turkish currently have strong localized Adobe terminology.
- Persian and Urdu have weaker authoritative Illustrator localization coverage, so specialist terminology is intentionally more conservative and several decisions are marked medium/low confidence.
- Bengali similarly remains conservative because authoritative localized graphics terminology is sparse.
- Swahili also has sparse authoritative localized Illustrator terminology, so specialist terms are intentionally conservative and lower-confidence items permit familiar English loans.
- Filipino intentionally preserves natural code-switching because Adobe Philippines does so itself.

## Stable concept IDs

Keys inside `terms` are English concept IDs and should remain identical across locales. Add new concepts with snake_case English IDs, then add the same ID across locale files.

## Updating the dataset

When adding or revising terminology:

- prefer genuine localized professional/software usage over literal translation;
- distinguish observed terminology from editorial recommendations;
- add/update source URLs;
- lower confidence when evidence conflicts or is sparse;
- keep JSON valid UTF-8;
- update `index.json` counts when terms change;
- for RTL languages, validate both semantic direction and rendered bidi order.

## Scope

Completed research batches:

- **Run 1:** French, German, Spanish, Italian, Brazilian Portuguese.
- **Run 2:** Dutch, Danish, Norwegian Bokmål, Swedish, Finnish.
- **Run 3:** Simplified Chinese, Japanese, Korean, Vietnamese, Thai.
- **Run 4:** Indonesian, Malaysian Malay, Filipino, Hindi, Bengali.
- **Run 5:** Modern Standard Arabic, Hebrew, Persian, Urdu, Turkish.
- **Run 6:** Russian, Ukrainian, Polish, Greek, Swahili.

The folder currently contains **30 locale datasets**.