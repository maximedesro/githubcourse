# Vectorize This language research

This folder contains machine-readable terminology research for translating and reviewing VectorizeThis.com.

## Files

- `index.json` — locale index and concept counts.
- `fr-FR.json` — French (France / international default).
- `de-DE.json` — German (Germany / international DACH default).
- `es-ES.json` — Spanish (Spain / neutral international starting point).
- `it-IT.json` — Italian.
- `pt-BR.json` — Brazilian Portuguese, selected as the default Portuguese locale for the larger Portuguese-language web/search audience.
- `nl-NL.json` — Dutch (Netherlands / international Dutch default).
- `da-DK.json` — Danish.
- `nb-NO.json` — Norwegian Bokmål, selected as the default Norwegian written locale.
- `sv-SE.json` — Swedish.
- `fi-FI.json` — Finnish.
- `zh-CN.json` — Simplified Chinese, selected as the default Chinese locale.
- `ja-JP.json` — Japanese.
- `ko-KR.json` — Korean (South Korea).
- `vi-VN.json` — Vietnamese.
- `th-TH.json` — Thai.

## How to use these files

Treat each JSON file as a **translation decision system**, not as a word-for-word dictionary.

For translation:

1. Preserve the English concept and user intent first.
2. Use `preferred` as the default terminology.
3. Use `seo_variants` in SEO-sensitive titles, headings, FAQs and links when they are more natural for search intent.
4. Use `ui_variant` for short buttons, labels and settings when supplied.
5. Respect `avoid`, `keep_english`, `register`, and `notes`.
6. Inflect or restructure terms naturally. Do not freeze glossary strings when grammar, particles, compounds, classifiers, politeness, or word order require changes.
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
- **SEO wording vs natural prose:** compact search phrases can differ from the best wording in a complete sentence.
- **Chinese:** use Simplified Chinese (`zh-CN`) consistently. Adobe uses `图像描摹`, `光栅图像`, `矢量路径`, `锚点`, and related professional terms.
- **Japanese:** distinguish `画像トレース` (tracing process) from `ベクトル化` / `ベクター化` (vectorization outcome). Many established UI terms are English-derived loanwords.
- **Korean:** Adobe uses `이미지 추적`, `래스터 이미지`, `벡터 패스`, and `고정점`; preserve polite prose while keeping UI labels concise.
- **Vietnamese:** SEO/design usage commonly retains English `vector`, while Adobe prose may use `véc-tơ`. Use the locale file's natural-vs-SEO distinction instead of enforcing one spelling everywhere.
- **Thai:** established software/design loanwords such as `เวกเตอร์`, `ราสเตอร์`, `พิกเซล`, upload/download forms, and format acronyms are normal. Adobe explicitly uses `ลอกลายรูปภาพ` for Image Trace.
- **Finnish morphology:** terms must be inflected and compounded naturally. Concept IDs are semantic anchors, not frozen translated strings.
- **Norwegian locale:** use Bokmål (`nb-NO`) consistently unless a separate Nynorsk locale is intentionally introduced.

## Evidence and confidence

The research prioritizes:

1. current VectorizeThis.com product/technical terminology,
2. localized Adobe Illustrator / Adobe Express terminology,
3. observed localized search-result wording and established converter/design terminology.

Each locale file includes a `sources` object and per-term confidence. Lower-confidence items should be rechecked when they become central to a page or UI.

For Vietnamese, some Adobe Illustrator help content is not fully localized, so the dataset deliberately gives more weight to established Vietnamese search/design usage for terms where localized Adobe evidence is weak.

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

Completed research batches:

- **Run 1:** French, German, Spanish, Italian, Brazilian Portuguese.
- **Run 2:** Dutch, Danish, Norwegian Bokmål, Swedish, Finnish.
- **Run 3:** Simplified Chinese, Japanese, Korean, Vietnamese, Thai.

The folder currently contains 15 locale datasets.