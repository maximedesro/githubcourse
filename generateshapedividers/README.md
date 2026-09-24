# ShapeDividers automation folder

These files are intended to live **inside your existing**:

```text
/Users/maxime/Desktop/shapedividers_shapes/shapedivider_automation
```

folder.

You do **not** need a second virtual environment and you do **not** need to reinstall Playwright. The new aspect-ratio follow-up automation reuses the existing `.venv` that your original `run.py` already uses.

## Existing files you keep

Do not delete or rename your existing automation files:

```text
run.py
base-prompt.txt
concepts.json
progress.json
setup.command
.venv/
dry-run/
debug-screenshots/
```

Your original `run.py` continues to create brand-new divider conversations exactly as before.

## New files to add to that same folder

Copy these two files from this GitHub folder into your existing `shapedivider_automation` folder:

```text
rerun_aspect_ratio.py
aspect-ratio-followup.txt
```

The new script creates these automatically while it runs:

```text
aspect-ratio-done-threads.json
aspect-ratio-debug-screenshots/
```

The new filenames are deliberately separate from your existing `run.py`, `progress.json`, and `debug-screenshots/`, so the two automations can coexist safely in the same folder.

## What the new script does

`rerun_aspect_ratio.py`:

1. Connects to the same already-open Chrome debugging session on port 9222.
2. Finds the **ShapeDividers Shapes** project.
3. Expands its conversation list by repeatedly clicking **Show more**.
4. Goes through project conversations one by one.
5. Sends the text stored in `aspect-ratio-followup.txt`.
6. Waits 240 seconds / 4 minutes between sends.
7. Records each conversation UUID in `aspect-ratio-done-threads.json`.
8. Skips conversations already recorded as `reserved` or `done`, preventing intentional duplicate sends.
9. Does not wait for image generation to finish before moving on to the next conversation.

The default follow-up is:

```text
Make it larger and much wider, at least a 10:1 horizontal aspect ratio. Keep the same divider design and concept.
```

## Chrome

Start or keep open the same dedicated Chrome debugging profile you already use for the original automation.

For reference:

```bash
mkdir -p "$HOME/chatgpt-automation-chrome"

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/chatgpt-automation-chrome"
```

Keep that Chrome instance open and logged into ChatGPT.

## Go to your existing automation folder

```bash
cd /Users/maxime/Desktop/shapedividers_shapes/shapedivider_automation
```

There is no installation step if your current `.venv` already runs the original Playwright automation.

## Dry run first

This sends nothing. It expands the project conversation list and prints the conversations it can detect:

```bash
./.venv/bin/python rerun_aspect_ratio.py --dry-run
```

## Small live test

Send the follow-up to two conversations with only 20 seconds between sends:

```bash
./.venv/bin/python rerun_aspect_ratio.py --limit 2 --interval 20
```

Check those two conversations manually before running the full batch.

## Full run

```bash
./.venv/bin/python rerun_aspect_ratio.py
```

The default interval is:

```text
240 seconds
```

which is 4 minutes send-to-send.

## Stop and resume

Press:

```text
Ctrl+C
```

to stop.

Later, simply run:

```bash
./.venv/bin/python rerun_aspect_ratio.py
```

again.

The script reads `aspect-ratio-done-threads.json` and skips conversations that it has already reserved or completed.



## 2026-09-24 ChatGPT sidebar update

ChatGPT changed the project sidebar markup again.

The current UI no longer exposes the project row through
`data-app-action-sidebar-project-id`, and project conversations are no longer
inside `role="list" aria-label="Chats in ShapeDividers Shapes"`.

The automation now supports the new structure by:

- locating the visible **ShapeDividers Shapes** project name;
- resolving its nearest sidebar project row;
- recognizing the current **Open project home** trailing button;
- finding project conversations through links whose accessible labels end in
  `chat in project ShapeDividers Shapes` or
  `pinned chat in project ShapeDividers Shapes`;
- falling back to project conversation URLs beginning with
  `/g/g-p-6aa5e3c7d10c8191a7e9547580d0be0b/c/`;
- continuing to use **Show more** when ChatGPT exposes it.

Your existing `aspect-ratio-done-threads.json` remains compatible. Do not reset
it when updating the script.

## Reliability / automatic recovery

The rerun script now automatically handles the intermittent failures seen in long runs where ChatGPT either closes/replaces the active tab or a conversation loads without mounting the composer.

It will:

- retry a conversation UI up to 4 times before giving up on that attempt;
- reopen or reuse a live ChatGPT tab if the current page disappears;
- navigate directly back to the target conversation URL during recovery;
- reload a conversation if its composer does not appear;
- continue with the remaining batch instead of terminating on a temporary Playwright page/composer error;
- only mark a thread `reserved` after its composer is visible and the follow-up has actually been filled;
- keep an ambiguous post-submit failure as `reserved` to avoid accidental duplicate sends;
- record pre-submit failures as `prepare_failed`, which are eligible to be retried on a later pass.

So if the browser UI glitches during a multi-hour run, the normal command is still:

```bash
./.venv/bin/python rerun_aspect_ratio.py
```

and the script should keep going rather than exiting on the first transient UI failure.

## Duplicate protection

Immediately before submitting a follow-up, the script stores that conversation UUID as:

```json
"status": "reserved"
```

After the send is confirmed, it changes it to:

```json
"status": "done"
```

Both states are skipped on future normal runs.

This favors avoiding duplicate prompts. If the script crashes at the exact moment a message is submitted, that conversation remains `reserved` instead of automatically being retried.

If a thread is left as `reserved`, inspect it manually first.

If you confirm that the message was **not** sent, you can explicitly retry reserved threads:

```bash
./.venv/bin/python rerun_aspect_ratio.py --retry-reserved
```

Be careful with that option because it can duplicate a follow-up if the earlier send actually succeeded.

## Reset the aspect-ratio log

Normally you should **not** do this.

If you intentionally want every project conversation to become eligible again:

```bash
./.venv/bin/python rerun_aspect_ratio.py --reset-log
```

This only resets:

```text
aspect-ratio-done-threads.json
```

It does not touch your original:

```text
progress.json
```

## Change the follow-up wording

Edit:

```text
aspect-ratio-followup.txt
```

No Python changes are needed.

## Your two automations side by side

Create new dividers from `concepts.json`:

```bash
./.venv/bin/python run.py
```

Revisit existing divider conversations and request wider versions:

```bash
./.venv/bin/python rerun_aspect_ratio.py
```

They use separate progress/log files and can live in the same folder.
