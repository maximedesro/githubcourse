#!/usr/bin/env python3

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError


HERE = Path(__file__).resolve().parent

PROJECT_ID = "g-p-6aa5e3c7d10c8191a7e9547580d0be0b"
PROJECT_NAME = "ShapeDividers Shapes"
PROJECT_URL = (
    "https://chatgpt.com/"
    "g/g-p-6aa5e3c7d10c8191a7e9547580d0be0b-shapedividers-shapes/project"
)

DEFAULT_CDP_URL = "http://127.0.0.1:9222"
DEFAULT_INTERVAL = 240.0

PROMPT_FILE = HERE / "aspect-ratio-followup.txt"
LOG_FILE = HERE / "aspect-ratio-done-threads.json"
SCREENSHOT_DIR = HERE / "aspect-ratio-debug-screenshots"

PROJECT_ROW_OLD = (
    f'[data-app-action-sidebar-project-id="{PROJECT_ID}"]'
)

PROJECT_CONTAINER = (
    f'div[data-sidebar-project-container-id="project:{PROJECT_ID}"]'
)

PROJECT_CHAT_LIST = (
    f'{PROJECT_CONTAINER} '
    f'[role="list"][aria-label="Chats in {PROJECT_NAME}"]'
)

PROJECT_CHAT_ANY = (
    f'{PROJECT_CHAT_LIST} '
    f'a[data-interactive-row-link="true"]'
    f'[href^="/g/{PROJECT_ID}/c/"]'
)

# Threads accidentally created by older rerun versions are skipped so the
# automation does not recurse into its own follow-up-only conversations.
SKIP_THREAD_TITLES = {
    "widen divider design",
}

COMPOSER = (
    'div.ProseMirror'
    '[contenteditable="true"]'
    '[role="textbox"]'
)

UUID_RE = re.compile(
    r"(?<![0-9a-f])"
    r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"
    r"(?![0-9a-f])",
    re.IGNORECASE,
)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def load_log():
    if not LOG_FILE.exists():
        return {
            "version": 1,
            "project_id": PROJECT_ID,
            "threads": {},
        }

    try:
        data = json.loads(
            LOG_FILE.read_text(encoding="utf-8")
        )
    except Exception as exc:
        raise RuntimeError(
            f"Could not read {LOG_FILE}: {exc}"
        )

    if not isinstance(data, dict):
        raise RuntimeError(
            f"{LOG_FILE} must contain a JSON object."
        )

    data.setdefault("version", 1)
    data.setdefault("project_id", PROJECT_ID)
    data.setdefault("threads", {})

    return data


def save_log(data):
    temp = LOG_FILE.with_suffix(".json.tmp")

    temp.write_text(
        json.dumps(
            data,
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    temp.replace(LOG_FILE)


def reset_log():
    data = {
        "version": 1,
        "project_id": PROJECT_ID,
        "threads": {},
    }

    save_log(data)


def save_debug_screenshot(page, label):
    SCREENSHOT_DIR.mkdir(exist_ok=True)

    safe = re.sub(
        r"[^a-zA-Z0-9._-]+",
        "-",
        label,
    ).strip("-")

    path = SCREENSHOT_DIR / (
        time.strftime("%Y%m%d-%H%M%S")
        + "-"
        + (safe or "debug")
        + ".png"
    )

    try:
        if page_is_usable(page):
            page.screenshot(
                path=str(path),
                full_page=True,
            )
            print(f"Saved screenshot: {path}")
    except Exception:
        pass


def connect_to_chrome(playwright, cdp_url):
    print()
    print("Connecting to already-open Chrome...")
    print(cdp_url)

    browser = (
        playwright.chromium
        .connect_over_cdp(cdp_url)
    )

    if not browser.contexts:
        raise RuntimeError(
            "Connected to Chrome, but no browser context was found."
        )

    context = browser.contexts[0]

    print("Connected.")
    print(f"Open pages: {len(context.pages)}")

    return browser, context


def get_chatgpt_page(context):
    for page in context.pages:
        try:
            if "chatgpt.com" in page.url:
                print("Using existing ChatGPT tab.")
                return page
        except Exception:
            pass

    print("Opening a new ChatGPT tab.")
    return context.new_page()


def project_chat_links(page):
    """
    Return only existing ShapeDividers conversation links from the
    project's own chat list.

    Current 2026-09-25 markup:
      div[data-sidebar-project-container-id="project:<project-id>"]
        [role="list"][aria-label="Chats in ShapeDividers Shapes"]
          a[data-interactive-row-link="true"]
            [href^="/g/<project-id>/c/"]

    This intentionally excludes unrelated pinned/recents links elsewhere
    in the sidebar.
    """
    return page.locator(
        PROJECT_CHAT_ANY
    )


def clean_thread_title(raw_label):
    title = re.sub(
        rf",\s*(?:pinned\s+)?chat in project {re.escape(PROJECT_NAME)}(?:,\s*unread)?$",
        "",
        raw_label or "",
        flags=re.IGNORECASE,
    ).strip()

    return title


def should_skip_thread_title(title):
    normalized = re.sub(
        r"\s+",
        " ",
        (title or "").strip().lower(),
    )

    return normalized in SKIP_THREAD_TITLES


def find_project_row(page):
    """
    Find the visible ShapeDividers Shapes project row without using it to
    navigate. It is used only to expand the sidebar section when needed.
    """
    old = page.locator(
        PROJECT_ROW_OLD
    ).first

    try:
        if old.count() and old.is_visible():
            return old
    except Exception:
        pass

    name = page.get_by_text(
        PROJECT_NAME,
        exact=True,
    ).first

    try:
        name.wait_for(
            state="visible",
            timeout=10_000,
        )
    except Exception:
        return None

    try:
        row = name.locator(
            "xpath=ancestor::div[@role='button'][1]"
        ).first

        if row.count():
            return row
    except Exception:
        pass

    return None


def ensure_project_available(page):
    """
    Ensure the ShapeDividers Shapes project is expanded and its own
    conversation list is present.

    The current UI again exposes data-app-action-sidebar-project-id on
    the project row, but conversation anchors no longer have
    data-sidebar-item. They now live inside the project's role=list.
    """
    # If project chat links are already visible, nothing to do.
    try:
        if project_chat_links(page).count() > 0:
            return
    except Exception:
        pass

    row = find_project_row(
        page
    )

    if row is None:
        print()
        print(
            "ShapeDividers Shapes is not visible in the sidebar yet."
        )
        print(
            "Expand the Pinned section and ShapeDividers Shapes manually."
        )
        input(
            "Press ENTER when the project conversations are visible..."
        )

        if project_chat_links(page).count() > 0:
            return

        row = find_project_row(
            page
        )

        if row is None:
            raise RuntimeError(
                "Could not detect ShapeDividers Shapes in the sidebar."
            )

    try:
        expanded = row.get_attribute(
            "aria-expanded"
        )
    except Exception:
        expanded = None

    if expanded == "false":
        row.click()
        page.wait_for_timeout(
            500
        )

    # Wait for the specific project chat list first.
    chat_list = page.locator(
        PROJECT_CHAT_LIST
    ).first

    try:
        chat_list.wait_for(
            state="attached",
            timeout=20_000,
        )
    except Exception:
        raise RuntimeError(
            "ShapeDividers Shapes was found, but its project chat list "
            "did not appear."
        )

    # A newly expanded list can render before its links are mounted.
    deadline = time.monotonic() + 20.0

    while time.monotonic() < deadline:
        try:
            if project_chat_links(page).count() > 0:
                return
        except Exception:
            pass

        page.wait_for_timeout(
            250
        )

    raise RuntimeError(
        "ShapeDividers Shapes was found and its chat list appeared, "
        "but no existing conversation links were detected."
    )


def expand_all_project_chats(page):
    """
    Expand only the ShapeDividers project's own conversation list.

    The 2026-09-25 UI places Show more inside the project container.
    Scoping it here prevents accidentally clicking a Show more belonging
    to another sidebar section.
    """
    clicks = 0

    container = page.locator(
        PROJECT_CONTAINER
    ).first

    container.wait_for(
        state="attached",
        timeout=20_000,
    )

    while True:
        before = project_thread_count(
            page
        )

        candidates = container.get_by_role(
            "button",
            name="Show more",
        )

        visible = None

        try:
            count = candidates.count()
        except Exception:
            count = 0

        for i in range(count):
            candidate = candidates.nth(i)

            try:
                if candidate.is_visible():
                    visible = candidate
                    break
            except Exception:
                pass

        if visible is None:
            break

        try:
            visible.scroll_into_view_if_needed()
            visible.click()
        except Exception:
            break

        clicks += 1
        page.wait_for_timeout(
            700
        )

        deadline = time.monotonic() + 5.0
        grew = False

        while time.monotonic() < deadline:
            after = project_thread_count(
                page
            )

            if after > before:
                grew = True
                break

            page.wait_for_timeout(
                150
            )

        if clicks >= 500:
            raise RuntimeError(
                "Stopped after 500 project Show more clicks. "
                "The UI may have changed."
            )

        if not grew:
            break

    return clicks


def snapshot_project_threads(page):
    """
    Snapshot conversation IDs, titles, and URLs BEFORE navigating away.

    This is the key safety change: we never click a sidebar chat row to
    discover its URL. We read the existing href directly and then navigate
    to that exact conversation URL.
    """
    rows = project_chat_links(
        page
    )

    records = []
    seen = set()

    count = rows.count()

    for i in range(count):
        row = rows.nth(i)

        try:
            href = row.get_attribute(
                "href"
            )
            raw_label = row.get_attribute(
                "aria-label"
            ) or ""

            if not href:
                continue

            conversation_id = (
                conversation_key_from_url(
                    href
                )
            )

            if not conversation_id:
                continue

            if conversation_id in seen:
                continue

            seen.add(
                conversation_id
            )

            title = clean_thread_title(
                raw_label
            )

            if should_skip_thread_title(
                title
            ):
                continue

            if href.startswith("/"):
                url = (
                    "https://chatgpt.com"
                    + href
                )
            else:
                url = href

            # Strip messageId/query fragments. We want the base conversation.
            url = url.split(
                "?",
                1,
            )[0].split(
                "#",
                1,
            )[0]

            records.append(
                {
                    "conversation_id": conversation_id,
                    "title": title or f"thread-{i + 1}",
                    "url": url,
                }
            )

        except Exception:
            continue

    return records


def project_thread_rows(page):
    return project_chat_links(
        page
    )


def project_thread_count(page):
    try:
        return project_chat_links(
            page
        ).count()
    except Exception:
        return 0


def conversation_key_from_url(url):
    matches = UUID_RE.findall(
        url or ""
    )

    if not matches:
        return None

    return matches[-1].lower()


def choose_next_unprocessed_thread(
    page,
    log_data,
    retry_reserved=False,
):
    """
    Pick the next existing project conversation from a href snapshot.

    No sidebar conversation is clicked. Therefore this function cannot create
    a new ShapeDividers chat.
    """
    expand_all_project_chats(
        page
    )

    records = snapshot_project_threads(
        page
    )

    if not records:
        raise RuntimeError(
            "No existing ShapeDividers conversation links were found."
        )

    print()
    print(
        f"Existing project conversations currently loaded: {len(records)}"
    )

    threads = log_data[
        "threads"
    ]

    # Process bottom-to-top to preserve the behavior of the previous script.
    for record in reversed(
        records
    ):
        conversation_id = record[
            "conversation_id"
        ]
        title = record[
            "title"
        ]
        url = record[
            "url"
        ]

        entry = threads.get(
            conversation_id
        )

        if entry:
            status = entry.get(
                "status"
            )

            if (
                status == "reserved"
                and retry_reserved
            ):
                print(
                    f"Retrying reserved thread: "
                    f"{title} [{conversation_id}]"
                )
                return (
                    conversation_id,
                    url,
                    title,
                )

            if status_is_protected(
                entry
            ):
                continue

        return (
            conversation_id,
            url,
            title,
        )

    return None


def page_is_usable(page):
    try:
        return page is not None and not page.is_closed()
    except Exception:
        return False


def recover_page(context, page=None, target_url=None):
    """
    Return a live ChatGPT page.

    ChatGPT occasionally replaces or closes the active tab while the
    automation is running. Reuse another ChatGPT tab if possible, or
    open a fresh one, then navigate directly to target_url when supplied.
    """
    if page_is_usable(page):
        live_page = page
    else:
        live_page = None

        try:
            for candidate in context.pages:
                try:
                    if (
                        not candidate.is_closed()
                        and "chatgpt.com" in candidate.url
                    ):
                        live_page = candidate
                        break
                except Exception:
                    pass
        except Exception:
            pass

        if live_page is None:
            live_page = context.new_page()

    live_page.set_default_timeout(20_000)

    if target_url:
        try:
            if live_page.url != target_url:
                live_page.goto(
                    target_url,
                    wait_until="domcontentloaded",
                    timeout=60_000,
                )
            else:
                live_page.wait_for_load_state(
                    "domcontentloaded",
                    timeout=30_000,
                )
        except Exception:
            # A normal reload is often enough when the SPA got stuck.
            try:
                live_page.goto(
                    target_url,
                    wait_until="domcontentloaded",
                    timeout=60_000,
                )
            except Exception:
                pass

    return live_page


def wait_for_composer(page, timeout_ms=45_000):
    """
    Wait for a usable visible composer.

    The page sometimes finishes URL navigation before the conversation
    UI is actually mounted, so this uses a longer timeout and a few
    selector fallbacks.
    """
    selectors = [
        COMPOSER,
        'div.ProseMirror[contenteditable="true"]',
        '[contenteditable="true"][role="textbox"]',
    ]

    deadline = time.monotonic() + (
        timeout_ms / 1000
    )

    last_error = None

    while time.monotonic() < deadline:
        if not page_is_usable(page):
            raise RuntimeError(
                "The ChatGPT page was closed while waiting for the composer."
            )

        for selector in selectors:
            try:
                locator = page.locator(
                    selector
                ).first

                if locator.is_visible(
                    timeout=750
                ):
                    return locator
            except Exception as exc:
                last_error = exc

        page.wait_for_timeout(
            250
        )

    raise RuntimeError(
        "No visible ChatGPT composer appeared within "
        f"{timeout_ms / 1000:.0f} seconds."
        + (
            f" Last error: {last_error}"
            if last_error
            else ""
        )
    )


def prepare_followup(page, prompt):
    """
    Fill the prompt but do not submit it yet.

    The caller writes the RESERVED log only after this function
    succeeds, which means a temporary page/composer loading failure
    does not poison the thread as already attempted.
    """
    composer = wait_for_composer(
        page
    )

    composer.click()
    composer.fill("")
    composer.fill(prompt)

    page.wait_for_timeout(
        400
    )

    return composer


def submit_followup(page, composer):
    """
    Submit an already-filled prompt and confirm that the composer clears.

    Once Enter is pressed the outcome is potentially ambiguous if the
    page disappears, so the caller must already have written RESERVED.
    """
    composer.press("Enter")

    deadline = time.monotonic() + 20.0

    while time.monotonic() < deadline:
        if not page_is_usable(page):
            raise RuntimeError(
                "The ChatGPT page closed immediately after submission."
            )

        try:
            current = page.locator(
                COMPOSER
            ).first

            if current.count() == 0:
                return

            if current.inner_text().strip() == "":
                return
        except Exception:
            # React may replace the composer node after a successful send.
            try:
                replacement = page.locator(
                    'div.ProseMirror[contenteditable="true"]'
                ).first

                if (
                    replacement.count() > 0
                    and replacement.inner_text().strip() == ""
                ):
                    return
            except Exception:
                pass

        page.wait_for_timeout(
            200
        )

    raise RuntimeError(
        "The message was submitted but the script could not confirm "
        "that the composer cleared."
    )


def prepare_thread_page(
    context,
    page,
    url,
    max_attempts=4,
):
    """
    Navigate directly to a conversation and wait until its composer exists.

    This handles the two intermittent failures seen in the logs:
    a closed target page and a conversation whose composer never mounted.
    """
    conversation_id = conversation_key_from_url(
        url
    )

    if (
        not conversation_id
        or f"/g/{PROJECT_ID}/c/" not in url
    ):
        raise RuntimeError(
            "Refusing to send because target URL is not an existing "
            "ShapeDividers conversation: "
            f"{url}"
        )

    last_error = None

    for attempt in range(
        1,
        max_attempts + 1,
    ):
        try:
            page = recover_page(
                context,
                page,
                target_url=url,
            )

            # Give the SPA a moment after direct navigation.
            page.wait_for_timeout(
                800
            )

            composer = wait_for_composer(
                page,
                timeout_ms=45_000,
            )

            return (
                page,
                composer,
            )

        except Exception as exc:
            last_error = exc

            print()
            print(
                f"Conversation UI attempt "
                f"{attempt}/{max_attempts} failed: {exc}"
            )

            if page_is_usable(page):
                try:
                    page.reload(
                        wait_until="domcontentloaded",
                        timeout=60_000,
                    )
                except Exception:
                    pass

            time.sleep(
                min(5 * attempt, 15)
            )

    raise RuntimeError(
        "Could not get a usable conversation composer after "
        f"{max_attempts} attempts. Last error: {last_error}"
    )


def read_prompt():
    if not PROMPT_FILE.exists():
        raise SystemExit(
            f"Missing prompt file: {PROMPT_FILE}"
        )

    prompt = PROMPT_FILE.read_text(
        encoding="utf-8"
    ).strip()

    if not prompt:
        raise SystemExit(
            f"{PROMPT_FILE} is empty."
        )

    return prompt


def status_is_protected(entry):
    """
    Both reserved and done are skipped automatically.

    'reserved' is written immediately before pressing Enter.
    This prevents a crash at exactly the wrong moment from causing
    the same conversation to receive the follow-up twice.

    If a reserved entry truly needs another attempt, run with
    --retry-reserved.
    """
    return entry.get("status") in {
        "reserved",
        "done",
    }


def validate_script_structure():
    """
    Lightweight startup sanity check so stale/duplicate helper code fails
    clearly instead of entering a recovery loop.
    """
    required = [
        "choose_next_unprocessed_thread",
        "snapshot_project_threads",
        "conversation_key_from_url",
        "prepare_thread_page",
        "submit_followup",
    ]

    missing = [
        name
        for name in required
        if name not in globals()
    ]

    if missing:
        raise RuntimeError(
            "Automation script is missing required helpers: "
            + ", ".join(missing)
        )


def main():
    validate_script_structure()

    parser = argparse.ArgumentParser(
        description=(
            "Visit every conversation in the ShapeDividers Shapes "
            "ChatGPT project and send one aspect-ratio follow-up "
            "without intentionally sending twice to the same thread."
        )
    )

    parser.add_argument(
        "--interval",
        type=float,
        default=DEFAULT_INTERVAL,
        help=(
            "Seconds between sends. "
            "Default: 240 (4 minutes)."
        ),
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help=(
            "Maximum number of conversations to update in this run."
        ),
    )

    parser.add_argument(
        "--cdp-url",
        default=DEFAULT_CDP_URL,
        help=(
            "Chrome remote debugging URL. "
            "Default: http://127.0.0.1:9222"
        ),
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help=(
            "Expand the project and inspect conversations, "
            "but do not send the follow-up."
        ),
    )

    parser.add_argument(
        "--reset-log",
        action="store_true",
        help=(
            "Erase the local done/reserved log before starting. "
            "Use carefully: this allows old conversations to be "
            "eligible again."
        ),
    )

    parser.add_argument(
        "--retry-reserved",
        action="store_true",
        help=(
            "Retry entries left in 'reserved' state by an interrupted run. "
            "This can duplicate a message if the earlier send actually "
            "succeeded, so use only after checking those chats manually."
        ),
    )

    args = parser.parse_args()

    if args.interval < 0:
        raise SystemExit(
            "--interval cannot be negative."
        )

    if (
        args.limit is not None
        and args.limit < 0
    ):
        raise SystemExit(
            "--limit cannot be negative."
        )

    if args.reset_log:
        reset_log()

    prompt = read_prompt()
    log_data = load_log()

    print()
    print("ShapeDividers aspect-ratio follow-up")
    print("-----------------------------------")
    print(f"Project: {PROJECT_NAME}")
    print(f"Interval: {args.interval} seconds")
    print(f"Log: {LOG_FILE}")
    print()
    print("Follow-up prompt:")
    print(prompt)
    print()
    print(
        "Reserved and completed conversation IDs are skipped "
        "to prevent duplicate follow-ups."
    )
    print(
        "Temporary page/composer failures are retried automatically "
        "and no longer stop the batch."
    )
    print(
        "Safety mode: only existing /c/ conversation URLs inside the "
        "ShapeDividers project's own chat list are used."
    )

    if args.dry_run:
        print()
        print("DRY RUN: no messages will be sent.")

    sent_this_run = 0
    last_send_at = None

    with sync_playwright() as p:
        try:
            browser, context = (
                connect_to_chrome(
                    p,
                    args.cdp_url,
                )
            )

            page = get_chatgpt_page(
                context
            )

            page.set_default_timeout(
                20_000
            )

            ensure_project_available(
                page
            )

            show_more_clicks = (
                expand_all_project_chats(
                    page
                )
            )

            print()
            print(
                "Initial project expansion complete."
            )
            print(
                f"Show more clicks: "
                f"{show_more_clicks}"
            )
            print(
                f"Threads loaded: "
                f"{project_thread_count(page)}"
            )

            if args.dry_run:
                records = snapshot_project_threads(
                    page
                )

                print()
                print(
                    "Existing project conversations that are eligible for scanning:"
                )

                for i, record in enumerate(
                    records,
                    start=1,
                ):
                    print(
                        f"{i:03d}. "
                        f"{record['title']} "
                        f"[{record['conversation_id']}]"
                    )

                print()
                print(
                    "Dry run finished."
                )
                return

            while True:
                if (
                    args.limit is not None
                    and sent_this_run >= args.limit
                ):
                    print()
                    print(
                        "Run limit reached."
                    )
                    break

                try:
                    page = recover_page(
                        context,
                        page,
                    )

                    ensure_project_available(
                        page
                    )

                    next_thread = (
                        choose_next_unprocessed_thread(
                            page,
                            log_data,
                            retry_reserved=(
                                args.retry_reserved
                            ),
                        )
                    )

                except Exception as exc:
                    print()
                    print(
                        "Thread scan/navigation hit a temporary error:"
                    )
                    print(exc)
                    print(
                        "Recovering the ChatGPT page and continuing..."
                    )

                    try:
                        page = recover_page(
                            context,
                            page,
                            target_url=None,
                        )
                        ensure_project_available(
                            page
                        )
                        expand_all_project_chats(
                            page
                        )
                    except Exception as recover_exc:
                        print(
                            "Recovery attempt failed: "
                            f"{recover_exc}"
                        )

                    time.sleep(10)
                    continue

                if next_thread is None:
                    print()
                    print(
                        "All currently discovered "
                        "ShapeDividers Shapes conversations "
                        "are already in the done/reserved log."
                    )
                    break

                (
                    conversation_id,
                    url,
                    title,
                ) = next_thread

                print()
                print(
                    f"NEXT: {title}"
                )
                print(
                    f"Conversation: "
                    f"{conversation_id}"
                )

                if last_send_at is not None:
                    next_send_time = (
                        last_send_at
                        + args.interval
                    )

                    seconds_left = max(
                        0,
                        next_send_time
                        - time.monotonic(),
                    )

                    if seconds_left > 0:
                        print(
                            f"Waiting "
                            f"{seconds_left:.1f}s "
                            f"before sending..."
                        )
                        time.sleep(
                            seconds_left
                        )

                # First make sure the conversation itself is healthy.
                # Temporary page closures and missing composers are retried
                # WITHOUT reserving the thread.
                try:
                    page, composer = (
                        prepare_thread_page(
                            context,
                            page,
                            url,
                            max_attempts=4,
                        )
                    )

                    # Fill before reserving. If filling fails, it is still
                    # safe to retry because nothing has been submitted.
                    composer.click()
                    composer.fill("")
                    composer.fill(prompt)
                    page.wait_for_timeout(
                        400
                    )

                except Exception as exc:
                    print()
                    print(
                        "Could not prepare this conversation after retries."
                    )
                    print(
                        f"Reason: {exc}"
                    )

                    save_debug_screenshot(
                        page,
                        (
                            "prepare-error-"
                            + conversation_id
                        ),
                    )

                    # Record a non-protected diagnostic state. This does NOT
                    # make the thread count as done; a later loop/run may
                    # try it again.
                    log_data["threads"][
                        conversation_id
                    ] = {
                        "status": "prepare_failed",
                        "title": title,
                        "url": url,
                        "failed_at": now_iso(),
                        "error": str(exc),
                        "prompt": prompt,
                    }

                    save_log(
                        log_data
                    )

                    print(
                        "Skipping it for now and continuing with the batch."
                    )

                    # Recover a live project page before scanning again.
                    try:
                        page = recover_page(
                            context,
                            page,
                            target_url=None,
                        )
                        ensure_project_available(
                            page
                        )
                        expand_all_project_chats(
                            page
                        )
                    except Exception as recover_exc:
                        print(
                            "Project-page recovery also failed: "
                            f"{recover_exc}"
                        )
                        time.sleep(10)

                    continue

                # Reserve only after the composer is visible and filled,
                # immediately before pressing Enter.
                log_data["threads"][
                    conversation_id
                ] = {
                    "status": "reserved",
                    "title": title,
                    "url": url,
                    "reserved_at": now_iso(),
                    "prompt": prompt,
                }

                save_log(
                    log_data
                )

                try:
                    submit_followup(
                        page,
                        composer,
                    )

                except Exception as exc:
                    save_debug_screenshot(
                        page,
                        (
                            "send-error-"
                            + conversation_id
                        ),
                    )

                    log_data["threads"][
                        conversation_id
                    ].update(
                        {
                            "status": "reserved",
                            "send_error_at": now_iso(),
                            "error": str(exc),
                        }
                    )

                    save_log(
                        log_data
                    )

                    print()
                    print(
                        "Send could not be confirmed."
                    )
                    print(
                        "This thread remains RESERVED so it will not "
                        "accidentally receive the prompt twice."
                    )
                    print(
                        "The automation will continue to the next thread "
                        "instead of stopping."
                    )

                    try:
                        page = recover_page(
                            context,
                            page,
                            target_url=None,
                        )
                        ensure_project_available(
                            page
                        )
                        expand_all_project_chats(
                            page
                        )
                    except Exception as recover_exc:
                        print(
                            "Project-page recovery failed: "
                            f"{recover_exc}"
                        )
                        time.sleep(10)

                    continue

                last_send_at = (
                    time.monotonic()
                )

                log_data["threads"][
                    conversation_id
                ].update(
                    {
                        "status": "done",
                        "sent_at": now_iso(),
                    }
                )

                save_log(
                    log_data
                )

                sent_this_run += 1

                print()
                print(
                    f"SENT #{sent_this_run}"
                )
                print(title)
                print(
                    f"Marked done: "
                    f"{conversation_id}"
                )

                # Do not wait for image generation to finish.
                # The 4-minute send-to-send timer is enforced above.
                if page_is_usable(page):
                    page.wait_for_timeout(
                        600
                    )

        except KeyboardInterrupt:
            print()
            print("Stopped by user.")
            print(
                "The log is already saved."
            )

        finally:
            print()
            print(
                "Automation disconnected."
            )
            print(
                "Your Chrome window remains open."
            )


if __name__ == "__main__":
    main()
