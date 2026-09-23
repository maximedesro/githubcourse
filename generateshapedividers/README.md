# Generate ShapeDividers follow-ups

This folder contains a Playwright automation that opens every conversation inside the ChatGPT project **ShapeDividers Shapes** and sends one follow-up asking for a much wider, at-least-10:1 divider.

The automation is based on the current ChatGPT markup supplied on 2026-09-23. It scopes itself to the project list whose accessible label is `Chats in ShapeDividers Shapes`, repeatedly clicks the project-specific `Show more` button, and uses the conversation UUID from the browser URL as the de-duplication key.

## Files

- `run.py` — automation
- `followup-prompt.txt` — the message sent to every thread
- `requirements.txt` — Python dependency
- `.gitignore` — keeps local run state out of Git
- `done_threads.json` — created automatically on your Mac; records reserved/completed thread IDs and is intentionally not committed

## Chrome

Use the same dedicated Chrome debugging profile you already use for your other ShapeDividers automation.

Example:

```bash
mkdir -p "$HOME/chatgpt-automation-chrome"

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/chatgpt-automation-chrome"
```

Keep that Chrome window open and logged into ChatGPT.

## Install

From your local clone:

```bash
cd /path/to/githubcourse/generateshapedividers

python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
```

## First test: dry run

This expands the project and prints the conversations it can see without sending anything:

```bash
./.venv/bin/python run.py --dry-run
```

## Small live test

Send to two conversations with a 20-second interval:

```bash
./.venv/bin/python run.py --limit 2 --interval 20
```

Then inspect those two chats manually.

## Full run

```bash
./.venv/bin/python run.py
```

The default is **240 seconds (4 minutes) between sends**.

The script does **not** wait for image generation to finish. After a send is accepted, it records the conversation ID and later moves on according to the timer.

## Duplicate protection

The script creates `done_threads.json`.

Before sending, it writes the conversation as `reserved`. After ChatGPT accepts the message, it changes it to `done`.

Both `reserved` and `done` are skipped on future runs. This is intentional: if Python or Chrome crashes at the exact moment a message is being sent, the safer behavior is to skip that conversation instead of risking a duplicate follow-up.

If a conversation is left as `reserved`, inspect it manually. If the follow-up definitely was **not** sent, you can explicitly allow reserved items to retry:

```bash
./.venv/bin/python run.py --retry-reserved
```

Be careful: using `--retry-reserved` can duplicate a message if the original send actually succeeded.

## Resetting the log

Normally, do **not** reset it.

If you intentionally want every conversation to become eligible again:

```bash
./.venv/bin/python run.py --reset-log
```

That removes the duplicate protection from prior runs.

## Changing the follow-up message

Edit:

```text
followup-prompt.txt
```

No Python change is required.

## How it finds threads

The current UI places project conversations inside:

```text
role="list"
aria-label="Chats in ShapeDividers Shapes"
```

and places a `Show more` button at the bottom when more project chats are available.

The automation clicks `Show more` until it disappears, then works through project threads. It does not use the global Recents section.

The current composer is detected as a visible `div.ProseMirror[contenteditable="true"][role="textbox"]`. The script submits the short follow-up with Enter because the empty composer currently shows a Voice button instead of a stable Send button.

## If the ChatGPT UI changes again

Run:

```bash
./.venv/bin/python run.py --dry-run
```

If it can no longer find the project list, Show more button, or composer, capture the new HTML and update the selectors near the top of `run.py`.
