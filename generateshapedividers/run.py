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

PROMPT_FILE = HERE / "followup-prompt.txt"
LOG_FILE = HERE / "done_threads.json"
SCREENSHOT_DIR = HERE / "debug-screenshots"

PROJECT_ROW = (
    f'[data-app-action-sidebar-project-id="{PROJECT_ID}"]'
)

PROJECT_CHAT_LIST = (
    f'[role="list"][aria-label="Chats in {PROJECT_NAME}"]'
)

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


def ensure_project_available(page):
    if "chatgpt.com" not in page.url:
        page.goto(
            PROJECT_URL,
            wait_until="domcontentloaded",
        )
        page.wait_for_timeout(1500)

    try:
        row = page.locator(PROJECT_ROW).first
        row.wait_for(
            state="attached",
            timeout=20_000,
        )
    except PlaywrightTimeoutError:
        print()
        print(
            "The ShapeDividers Shapes project was not found in the sidebar."
        )
        print(
            "Open the project manually in this Chrome window, then return here."
        )
        input("Press ENTER when ready...")

        row = page.locator(PROJECT_ROW).first
        row.wait_for(
            state="attached",
            timeout=30_000,
        )

    expanded = row.get_attribute(
        "aria-expanded"
    )

    if expanded == "false":
        row.click()
        page.wait_for_timeout(500)

    page.locator(
        PROJECT_CHAT_LIST
    ).first.wait_for(
        state="attached",
        timeout=20_000,
    )


def expand_all_project_chats(page):
    """
    Click the project's Show more button until ChatGPT stops
    offering additional project conversations.
    """
    chat_list = page.locator(
        PROJECT_CHAT_LIST
    ).first

    chat_list.wait_for(
        state="attached",
        timeout=20_000,
    )

    clicks = 0

    while True:
        show_more = chat_list.get_by_role(
            "button",
            name="Show more",
        )

        visible = None

        try:
            count = show_more.count()
        except Exception:
            count = 0

        for i in range(count):
            candidate = show_more.nth(i)

            try:
                if candidate.is_visible():
                    visible = candidate
                    break
            except Exception:
                pass

        if visible is None:
            break

        before = project_thread_count(page)

        visible.scroll_into_view_if_needed()
        visible.click()

        clicks += 1
        page.wait_for_timeout(650)

        # Wait briefly for the list to grow or for Show more to change.
        deadline = time.monotonic() + 5.0

        while time.monotonic() < deadline:
            after = project_thread_count(page)

            if after > before:
                break

            try:
                if not visible.is_visible():
                    break
            except Exception:
                break

            page.wait_for_timeout(150)

        if clicks >= 500:
            raise RuntimeError(
                "Stopped after 500 Show more clicks. "
                "The UI may have changed."
            )

    return clicks


def project_thread_rows(page):
    """
    Return the current project chat rows only.

    The supplied markup shows project conversations as DIVs
    with role=button and aria-label inside:
      role=list aria-label="Chats in ShapeDividers Shapes"
    """
    chat_list = page.locator(
        PROJECT_CHAT_LIST
    ).first

    return chat_list.locator(
        'div[role="button"][aria-label]'
    )


def project_thread_count(page):
    try:
        return project_thread_rows(page).count()
    except Exception:
        return 0


def conversation_key_from_url(url):
    """
    Use the conversation UUID as the durable de-duplication key.

    ChatGPT URLs can change shape, so search the full URL
    for UUIDs and ignore the project id, which is not a UUID.
    """
    matches = UUID_RE.findall(url)

    if not matches:
        return None

    # Conversation URLs normally contain exactly one UUID.
    # Use the last UUID if another UUID ever appears earlier.
    return matches[-1].lower()


def wait_for_conversation(page, old_url=None):
    """
    Allow the SPA navigation to settle, then extract the
    conversation id from the current URL.
    """
    deadline = time.monotonic() + 15.0
    last_url = page.url

    while time.monotonic() < deadline:
        last_url = page.url
        key = conversation_key_from_url(last_url)

        if key:
            return key, last_url

        page.wait_for_timeout(150)

    raise RuntimeError(
        "Could not determine the conversation ID after opening a thread. "
        f"Current URL: {last_url}"
    )


def wait_for_composer(page):
    composer = page.locator(
        COMPOSER
    ).first

    composer.wait_for(
        state="visible",
        timeout=30_000,
    )

    return composer


def send_followup(page, prompt):
    composer = wait_for_composer(page)

    composer.click()
    composer.fill("")
    composer.fill(prompt)

    page.wait_for_timeout(300)

    # In the current ChatGPT UI, the empty composer shows the
    # Voice button rather than a Send button. Pressing Enter is
    # more stable than depending on the changing submit-button DOM.
    composer.press("Enter")

    # Confirm the composer clears. This is a practical indication
    # that ChatGPT accepted the message.
    deadline = time.monotonic() + 15.0

    while time.monotonic() < deadline:
        try:
            text = composer.inner_text().strip()
        except Exception:
            # The composer can be replaced during submission.
            text = ""

        if not text:
            return

        page.wait_for_timeout(150)

    raise RuntimeError(
        "The composer did not clear after pressing Enter; "
        "the message may not have been sent."
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


def choose_next_unprocessed_thread(
    page,
    log_data,
    retry_reserved=False,
):
    """
    Scan the ShapeDividers project from oldest-looking visible row
    to newest-looking row (bottom to top).

    Each candidate is opened only long enough to obtain its durable
    conversation UUID. The done log decides whether it is eligible.

    Returns:
      (conversation_id, url, title)
    or None when every discovered project conversation is already
    protected by the log.
    """
    expand_all_project_chats(page)

    rows = project_thread_rows(page)
    count = rows.count()

    if count == 0:
        raise RuntimeError(
            "No conversations were found inside ShapeDividers Shapes."
        )

    print()
    print(f"Project conversations currently loaded: {count}")

    threads = log_data["threads"]

    # Bottom-to-top works well because a conversation that receives
    # a new message usually moves toward the top.
    for index in range(count - 1, -1, -1):
        # Re-resolve after every navigation because React may rerender.
        rows = project_thread_rows(page)

        if index >= rows.count():
            continue

        row = rows.nth(index)

        try:
            title = (
                row.get_attribute("aria-label")
                or f"thread-{index + 1}"
            )
        except Exception:
            title = f"thread-{index + 1}"

        try:
            row.scroll_into_view_if_needed()
            row.click()
        except Exception:
            # One retry after a fresh DOM lookup.
            rows = project_thread_rows(page)
            row = rows.nth(index)
            row.scroll_into_view_if_needed()
            row.click()

        page.wait_for_timeout(500)

        conversation_id, url = (
            wait_for_conversation(page)
        )

        entry = threads.get(
            conversation_id
        )

        if entry:
            status = entry.get("status")

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

            if status_is_protected(entry):
                continue

        return (
            conversation_id,
            url,
            title,
        )

    return None


def main():
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
                rows = project_thread_rows(
                    page
                )

                print()
                print(
                    "Visible project thread titles:"
                )

                for i in range(
                    rows.count()
                ):
                    title = (
                        rows.nth(i)
                        .get_attribute(
                            "aria-label"
                        )
                        or "(untitled)"
                    )
                    print(
                        f"{i + 1:03d}. {title}"
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

                next_thread = (
                    choose_next_unprocessed_thread(
                        page,
                        log_data,
                        retry_reserved=(
                            args.retry_reserved
                        ),
                    )
                )

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

                # Reserve BEFORE pressing Enter. If Python dies between
                # this write and the final "done" write, a restart skips
                # this thread rather than risking a duplicate.
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
                    send_followup(
                        page,
                        prompt,
                    )
                except Exception:
                    save_debug_screenshot(
                        page,
                        (
                            "send-error-"
                            + conversation_id
                        ),
                    )

                    print()
                    print(
                        "Send failed or could not be confirmed."
                    )
                    print(
                        "This thread remains RESERVED in "
                        "done_threads.json so the script will "
                        "not accidentally send it twice."
                    )
                    print(
                        "Inspect the chat manually. If it definitely "
                        "did not send, rerun later with --retry-reserved."
                    )
                    raise

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

                # Do not wait for the image generation to finish.
                # The 4-minute send-to-send timer is enforced above.
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
