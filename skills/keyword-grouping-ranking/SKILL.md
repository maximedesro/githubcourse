---
name: keyword-grouping-ranking
description: Group SEO/autocomplete keywords into narrowly defined, genuinely interchangeable article or tutorial search intents, then prioritize the groups using shortest First Query signals. Especially useful for WordPress/Elementor keyword spreadsheets. Preserve source data, keep different tasks separate, audit ambiguous terms, and produce a reviewable grouped sheet.
---

# Keyword grouping and ranking for specific tutorials

## Mission

Turn a keyword list (often Google Suggest/autocomplete exports) into an editorial plan whose **individual groups correspond to one specific article or tutorial that can satisfy every search within that group**. Then sort those article ideas from more likely to be searched to less likely, using the spreadsheet's **First Query** field when available.

**The publisher prefers specific, practical how-to tutorials—not broad overview articles.** The priority is accurate reader intent, not minimizing group count. A one-keyword group is normal and desirable when no other search means the same thing.

This skill is written from the repeated review and correction of the November 2026 Elementor keyword sheet. Treat the examples below as behavioral tests and generalize their underlying principles to the entire input.

## Core non-negotiable rules

1. **Semantic intent first; word overlap last.** Do not group merely because keywords contain the same product, feature, modifier, verb, or the words "tutorial," "course," "plugin," "download," "not working," "free," "pricing," or "how to."
2. **The one-article test:** Could one reasonably focused tutorial fully answer the exact needs expressed by *all* searches, without becoming a multi-topic roundup? If not, split.
3. **Identify the object and action.** Parse *what the user is referring to*, *what they want to do*, *what result they expect*, and *where it happens*. "Download Elementor" is different from "make a PDF downloadable using Elementor."
4. **Specific beats generic.** A feature-specific tutorial must never be swallowed by a general "Elementor tutorial" group; a component-specific error must never be swallowed by "Elementor not working."
5. **Conservative merges.** If there is a plausible materially different intent, keep searches apart. Avoid "probably related" merges. Do not manufacture a relationship from a shared noun.
6. **Merge real paraphrases.** A group may contain differently worded keywords if they ask how to accomplish essentially the *same task*. Don't create needless separate groups for "two columns" versus "side by side" when they mean the same container layout.
7. **Rank the groups, not only the keywords.** Give priority to groups with a very short, relevant **First Query** on one or several member keywords. The rank is an estimated *popularity proxy*, **not** measured monthly search volume.
8. **Do not lose data or overwrite the original.** Keep original keywords and available metrics. Perform work in a new tab unless the user explicitly requests replacing an existing tab.
9. **Audit every broad-looking cluster** before delivery; the output is *not finished* just because a script assigned every row.
10. **Do not silently discard ambiguous but relevant searches.** A search can be relevant to Elementor and still require separate interpretation or a manual-review bucket.

## How to think about search intent

For **each keyword**, record an internal intent signature:

- **Entity/product:** Elementor page builder, Elementor Pro, Elementor AI, Elementor.com account, Hello Elementor theme, Royal Addons, WordPress, etc.
- **Object / feature:** a page revision, a PDF, a download button, a footer, a form, form emails, reCAPTCHA v3, an SVG logo, a flexbox container, a login widget, atomic elements, V4 roadmap, component library, plugin files, etc.
- **Action / problem:** create, install, configure, download, upload, import, export, link, compare, learn, troubleshoot, restore, sign in, purchase, cancel, etc.
- **Goal / expected outcome:** e.g., "give visitors a clickable link that downloads a PDF," "restore the previous revision of a page," "make two containers sit next to each other," "log into an existing SaaS account."
- **Environment/context:** Elementor editor vs Elementor.com, site frontend vs backend, plugin vs page, WordPress site vs hosting provider.
- **Intent type:** how-to, troubleshooting, navigational, transactional, informational, comparison, documentation/reference, course/training, resource/download.
- **Critical modifier:** v3, Pro, free, mobile, specific third-party plugin, specific competing builder, etc. A modifier may or may not change intent; decide semantically.

Use this structure to make decisions, even if these columns are not displayed. A practical internal group key is **entity + object + desired outcome + intent type + essential version/context**. Do not simply strip stop words and use the remaining tokens as a group key.

### One-article test (required for every merge)

Before adding keyword B to a group containing keyword A, ask:

1. Would the searcher clicking the same proposed page feel their exact task was addressed directly?
2. Would the **same sequence of steps** or same focused answer satisfy both?
3. Does one keyword specify a different object, feature, target system, version, action, or problem?
4. Would answering both require two independent substantial sections or entirely different instructions?
5. Is one phrase underspecified enough to represent multiple intentions? If so, prefer its own group or mark for manual review rather than assuming.

Only merge when the overlap is strong. If two tutorials would benefit from linking to each other but are independently useful, **keep them separate**. Similarity of *topic* is insufficient.

### Narrow articles vs broad overviews

The desired result is **specific tutorials**. Titles like "Elementor V4 / Atomic Elements — overview and how-to," "Elementor login / user account," "Elementor flexbox containers," "Elementor videos," "Elementor widgets," "Elementor Pro pricing and plans," or "Elementor troubleshooting" are warning signs when they cover many unrelated subintents.

A genuine broad query (e.g., "elementor tutorial", "elementor pro", "elementor templates") may keep a small general group when its exact intent is broad or navigational. But never attach more specific searches to it simply because they share those words.

A proposed article title should describe a concrete reader outcome whenever possible: **"How to restore a previous Elementor page revision"**, not "Elementor history"; **"How to make an Elementor container clickable"**, not "Elementor containers."

## Reference cases: MUST get these right

These are not just special-case strings; find and fix the same patterns elsewhere in the input.

### General tutorial vs feature tutorial

**Separate:**

- `elementor tutorial` → general Elementor beginner tutorial
- `elementor form builder tutorial` → creating/using Elementor forms
- `elementor footer tutorial` → creating an Elementor footer
- `elementor theme builder tutorial` → using the Theme Builder feature
- `elementor ai tutorial` and `how to use elementor ai in wordpress` → using Elementor AI (these two can group together)

An "Elementor tutorial" group must not become a dump of everything ending in "tutorial."

### Learning Elementor vs making an online course

**Separate:**

- `elementor course`, `elementor course for beginners`, `learn elementor` → learning Elementor
- `elementor course plugin` → building/selling/hosting courses with a WordPress/Elementor-compatible LMS plugin

"Course" describes two different roles: *material the searcher consumes* vs *functionality they add to their site*.

### Plugin versions vs revisions to pages

**Separate:**

- `elementor changelog`, `elementor plugin version history`, `elementor latest version` → Elementor software releases
- `elementor restore previous version of page`, `wordpress elementor restore previous version of page`, `elementor page version history` → restoring a page's editing revisions

A "version" is not necessarily a plugin version. Identify **what** has a previous version.

### "Not working" is not a grouping criterion

**Separate:**

- `elementor not working` → general Elementor problem
- `elementor z index not working` → CSS stacking/z-index problem
- `elementor recaptcha v3 not working` → reCAPTCHA v3 integration problem

Also distinguish forms not sending email, popups not appearing, a template library failing to load, widget panels not loading, fonts not showing, and page frontend failures. The faulty **object** matters more than the shared symptom.

Avoid grouping v2 and v3 reCAPTCHA errors without assessing version-specific setup. Avoid grouping all "not loading" terms by verb alone.

### What is being downloaded?

**Separate:**

- `elementor download` → downloading/installing the Elementor page-builder plugin
- `elementor download link` → potentially making a download link in Elementor; **ambiguous**, do not assume the plugin
- `elementor download pdf` → likely making a PDF downloadable on an Elementor page
- `elementor logo svg download` → getting an SVG of the Elementor logo
- `elementor theme download` → getting an Elementor-compatible theme
- `elementor template kit download` → getting a template kit
- `elementor blocks download` → blocks/resources, not automatically the core plugin

Pay attention to a keyword's **direct object**, even when its grammar is telegraphic. Use high-confidence common interpretations; if unclear, give it its own labeled group or flag uncertainty.

Likewise, distinguish **uploading an SVG to Elementor** from **downloading SVG icons**, **importing a template** from **downloading a template**, and **downloading a PDF** from **creating a downloadable PDF link**.

### V4, Atomic Elements and Components

Do **not** bundle all of these as one Elementor V4/Atomic overview. Distinguish as appropriate:

- `elementor atomic elements` → Atomic Elements concept and usage
- `elementor components` → components/reusable component feature; not automatically the same tutorial as Atomic Elements
- `elementor v4 roadmap` → roadmap, upcoming milestones
- `elementor v4 documentation` → official/reference documentation
- `elementor v4 course` → finding structured training
- `elementor v4 vs bricks` → comparison with Bricks

Also split when warranted: V4 release date, beta, setup, custom CSS, editor, classes, components library, disabling Atomic Elements. Prefer clear topic-specific tutorials and resource pages.

### Logging in vs building login functionality

**Separate:**

- `elementor login`, `elementor com login`, `elementor account login` when clearly navigational → signing into Elementor.com/account/dashboard
- `elementor login widget`, `elementor login page`, `elementor login and register` → building login or registration functionality **on a site made with Elementor**
- WordPress admin login and WooCommerce "My Account" may be different tasks again

A brand's account sign-in page is not a tutorial for adding authentication to the user's website. Ambiguous "elementor login" may be best kept separate or flagged if both are plausible.

### Flexbox/container example: merge paraphrases, split distinct tasks

**Group together** as one tutorial on creating side-by-side containers/two-column layouts:

- `elementor 2 column container`
- `elementor 2 containers side by side`
- `elementor two columns in container`
- `elementor put two containers side by side`
- `elementor two containers side by side`

**Separate:**

- `elementor container link` → making a container clickable/linking the whole container
- `elementor lazy load container` → lazy-loading a container
- `elementor container background image zoom on hover` → zoom hover effect
- `elementor container width` → width adjustment
- `elementor grid vs flexbox` → comparison, not a side-by-side tutorial

Do not lump these into "Flexbox containers — overview."

## Broader patterns to look for throughout the file

The above cases should become **general review heuristics**:

- **Comparison object:** "Elementor vs Bricks," "Elementor vs Divi," "V4 vs Bricks," "Elementor free vs Pro," and "Elementor Pro vs Elementor One" usually merit different articles. Do not group all `vs` searches.
- **Product/subproduct:** distinguish Elementor core, Pro, AI, hosting, One, Theme Builder, Site Mailer, Hello Theme, third-party addons, and their independent pricing, setup, download and support intents.
- **Forms:** contact form creation, Contact Form 7 embedding, forms-to-Google-Sheets, email notification delivery, conditional logic, multi-step forms, reCAPTCHA, and login forms are separate tutorials.
- **Templates/kits:** choosing a kit, importing a kit, exporting a kit, downloading kits, fixing kit library errors, editing a single-post template, and creating a landing-page template are different tasks.
- **Widgets:** a FAQ widget, Google reviews widget, breadcrumb widget, form widget, widget development, a list of widgets, and a widget-not-loading issue are not all one article.
- **Video:** embedding YouTube videos, lazy-loading videos, YouTube playlist widgets, YouTube feed widgets, autoplay failures and background-video mobile issues are distinct.
- **Responsive design:** configuring breakpoints, troubleshooting mobile layout, responsive image behavior, responsive columns and responsive sliders are not automatically one topic.
- **Pricing:** price of Elementor Pro, AI credits, One plans, Site Mailer, creating a pricing-table widget, cancelling a subscription, renewal, license activation and promo codes require intent checks.
- **Assets and resources:** downloadable template, logo SVG, icon library, PDF button, theme, plugin ZIP and software documentation are different objects.
- **Errors:** separate the broken feature, front-end vs editor context, and important platform/version constraints.
- **Action verbs:** "create," "edit," "download," "install," "remove," "restore," "fix," "export" and "import" may produce entirely different tutorials even when the nouns overlap.
- **Navigational vs instructional:** visiting the Elementor dashboard, finding documentation, logging in or checking a roadmap is not the same as building something on a website.

These checks should be applied to **every** source keyword—not just the named examples.

## Workflow

### 1. Inspect the entire source

Read the spreadsheet metadata, source tab names, dimensions and headers. Load **all used rows**, not merely the first few hundred. Identify the keyword text, `Best Position`, `Match Count`, `First Query`, and any optional `All Matches (JSON)` field.

Keep original text and original metrics intact. `Best Position` and `Match Count` are *autocomplete discovery metadata*, not monthly search volume. `All Matches` may reveal multiple discovery queries that improve grouping/ranking. Do not assume a short `First Query` means the exact keyword itself is short or popular.

Make an input inventory: row count, unique keywords, blanks, duplicates and irrelevant terms. Use normalized matching for deduplication only when clearly identical; preserve the original spelling in output. Maintain a mapping back to the source row.

### 2. Filter genuine irrelevance carefully

Ignore searches that are clearly unrelated to the Elementor WordPress page builder, such as an unrelated product/person with a similar name, unrelated game, or unrelated-language domain navigation.

Do **not** remove a keyword simply because it concerns a feature, plugin, PDF, SVG, account, subscription, documentation, or third-party integration. These can be valuable Elementor content ideas.

If available, put excluded and uncertain keywords in a separate audit/log tab with a **reason** and original source row, rather than losing them. Never describe excluded data as categorically irrelevant unless the meaning is clear.

### 3. Infer intent independently for each keyword

For each phrase, identify entity, object, action, goal, context and intent type before looking for clusters. Avoid initial grouping solely by bigrams or regular expressions.

Use rules/regexes as **candidate generation and guardrails**, not final semantic judgment. Specifically:

- Don't assign every keyword containing `tutorial` to the general tutorial.
- Don't assign every `download` keyword to installing the plugin.
- Don't assign every `version` keyword to plugin version history.
- Don't assign every `login` keyword to the same account topic.
- Don't assign every `not working` keyword to one troubleshooting article.
- Don't assign every `V4`, `components`, `container`, `form`, or `template` keyword to one feature umbrella.

A high-precision process may involve an LLM semantic classification pass, followed by deterministic consistency checks and human-readable spot review. If using machine similarity, lexical overlap, or embeddings, they are **only candidate matches**; manually/semantically validate each final group.

### 4. Build groups conservatively

Start from the **specific outcome/task**, not the broad product topic. Merge genuine synonyms and paraphrases. If a phrase could support multiple interpretations, don't make an unwarranted merge.

A practical test: draft the page's H1 and a 3–5 step tutorial outline. If two keywords demand materially different H1s, tutorials, workflows or troubleshooting procedures, split them.

Keep standalone keywords when necessary. There is no target/minimum/maximum number of groups. Neither the goal of "one row per keyword" nor a wish to reduce hundreds of groups should dictate semantic decisions.

One group must not be labeled as a broad overview while containing specific how-to tasks that deserve their own page. For broad leftovers, either (a) create a truly generic group of only generic search terms or (b) split by actual intent.

### 5. Detect over-broad groups (mandatory second pass)

Sort provisional groups by **group size**, then inspect all large groups; also inspect groups with broad headings, such as "overview and how-to," "miscellaneous," "other," "tutorial," "troubleshooting," "download," "login," "versions," "widgets," "templates," "containers," "pricing," or "comparisons."

Within each group, look for multiple **objects**, **actions**, **sites/environments**, **feature names**, **third-party products** or **versions**. If found, split and relabel.

Review a random sample of small and singleton groups for the opposite error: synonyms needlessly separated. For each split, check whether related variants in *other* groups must move as well.

A large group is not inherently wrong (many same-intent paraphrases can belong together), but every member must pass the one-article test. A one-row group is not inherently bad.

### 6. Ranking: use shortest First Query signals

When measured volumes are absent, prioritize groups with one or more **short, informative** `First Query` values. The search sequence matters: short prefixes often hint at high-interest/root topics, but do not prove popularity.

Recommended procedure:

1. Normalize `First Query` only for analysis: trim whitespace; retain the original cell content in output.
2. For each group, collect the length of **every member's** First Query (word count, then character count).
3. Use the **shortest relevant** First Query as the primary signal; short queries in multiple members strengthen the evidence.
4. Break ties with the second/third shortest query, number of *independent* members showing short First Queries, credible autocomplete rank/recurrence and topical judgment.
5. Use group size or `Match Count` as supporting tie-breakers, **not** stand-ins for measured volume.
6. **Critical pitfall:** a very general First Query such as `elementor` may have produced a very specific long-tail keyword through recursive expansion. Do not allow such incidental discovery paths to automatically outrank clearly stronger topical demand. Verify that the short query is semantically relevant to the actual **group topic**. Consider both raw and topic-relevant First Query lengths, and count corroborating members.
7. The ordering should be group-level descending estimated demand, with each group's keywords contiguous. Within a group put the strongest/shortest relevant First Query keywords at the top.
8. If genuine search volume is provided later, prefer it over this heuristic, with appropriate aggregation and intent-specific adjustments. Do **not** invent numerical volumes.

A transparent scoring implementation may use a tuple such as:
`(shortest_topic_relevant_First_Query_word_count, shortest_character_count, second_shortest_word_count, second_shortest_character_count, -number_of_supporting_members, -other_evidence)`
with shorter values ranked earlier, plus an **editorial relevance sanity check**. Any weighted formula is provisional; semantic validation overrides it. State explicitly that the resulting rank is an **estimate**, not search-volume measurement.

Do not prioritize a category purely because the keyword is in an earlier row of the original scraper export.

### 7. Output spreadsheet format

If producing a Google Sheet:

- Create a **new named tab** in the existing spreadsheet unless instructed otherwise.
- Retain columns: `Keyword`, `Best Position`, `Match Count`, `First Query`.
- Add `Article / tutorial group` with a **specific, descriptive intent label** (same label for all members of a group).
- Optionally add `Intent type`, `Confidence`, `Rationale`, `Estimated priority`, or `Needs review` where useful, but do not make unrequested changes to the source tab.
- Sort entire groups by the above popularity heuristic.
- Keep each group's keyword rows adjacent, and insert **exactly THREE completely empty rows between groups** (no spacer after the final group).
- Freeze and format the header; make the keyword and group-title columns wide enough to read.
- Preserve the source row metrics and case/spelling. Do not put headings or summary data into the three separator rows.
- Prefer a separate excluded/ambiguous audit tab for transparency when appropriate.

If output is not a spreadsheet, produce equivalent groups with labeled boundaries and enough metadata to preserve provenance.

### 8. Quality assurance — do not skip

Run **both automated checks and semantic audits**.

**Integrity checks**
- Total included keywords + documented excluded keywords = expected unique source keywords (account for duplicates explicitly).
- No unexpected missing or duplicated keywords.
- Every included keyword belongs to exactly one group.
- Exactly three blank rows separate groups; no accidental blank keyword rows inside groups.
- Each group is contiguous; no repeated separated instances of the same group.
- Original columns and values preserved.
- Ranking uses group-level evidence, not alphabetical order or source order.
- Verify the entire sheet is written, including a middle block and the last rows—not just its header.

**Intent regression checks**
- Generic Elementor tutorial vs form, footer, Theme Builder and AI tutorial.
- Learning an Elementor course vs choosing an LMS/course plugin.
- Plugin version history vs restoring previous page revisions.
- Generic "not working" vs z-index vs reCAPTCHA v3.
- Core plugin download vs download link vs PDF vs logo SVG vs theme/kit/blocks.
- Atomic Elements vs components vs V4 roadmap/docs/course/comparison with Bricks.
- Elementor.com login vs adding a login/register widget to a site.
- Side-by-side/two-column container synonyms together; clickable container and lazy-load container apart.

**Semantic audits**
- Inspect every large/high-priority group, especially the first 20–50 by proposed ranking.
- Inspect all overly generic labels.
- Review mismatched objects, verbs, contexts and versions.
- Spot-check low-frequency/long-tail phrases to avoid silently forcing them into convenient groups.
- Check for obvious synonyms scattered across multiple groups.
- Correct false merges **before** marking the work complete; repeat until a full pass finds no obvious errors.

**Reality check:** a machine-generated 1,000+ group sheet can still have many erroneous placements. Never claim perfect semantic accuracy, fully human-reviewed classification or validated search volume when that has not occurred. State any limitations plainly.

## Helpful implementation notes

A robust implementation is **multi-pass**:

1. Parse all rows; normalize for matching; retain original source data.
2. Generate **per-keyword intent signatures** from semantic understanding.
3. Apply high-confidence object/action rules and explicit contrast rules.
4. Cluster only phrases that pass a focused semantic equivalence test.
5. Label each cluster with one real article idea.
6. Audit large/ambiguous clusters and split them.
7. Find paraphrases in isolated clusters and merge **only** true equivalents.
8. Compute topical First Query ranking.
9. Render new sheet, write in safe batches and verify data coverage.
10. Report group count, included/excluded counts, ranking limitations and a direct link.

For large datasets, processing in batches is sensible, but **batch boundaries must never become artificial group boundaries**. Compare intent candidates across all batches before final grouping.

If an external research tool is available, use it selectively to resolve genuinely ambiguous technical product terms. Do not substitute general product-category keywords for understanding searcher intent. Recent version changes may matter: do not assume an outdated interpretation of Elementor V4, Atomic Elements or a plugin.

## Final deliverable standard

The final output should let the publisher scan from the likely most popular tutorial ideas to narrower opportunities and instantly see which search phrases belong to each **specific** article. The underlying work must favor reader intent over convenient grouping.

When reporting completion, link the actual new tab/file, mention the count of included keywords and groups, confirm three empty separator rows and source preservation, explain that popularity is estimated from **First Query** rather than measured search volumes, and avoid overstating classification certainty.
