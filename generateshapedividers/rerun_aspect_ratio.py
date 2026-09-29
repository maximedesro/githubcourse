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
SCRIPT_VERSION = "2026-09-29.4"

# ShapeDividers Shapes currently contains 400+ conversations.
# This prevents a collapsed sidebar showing 6/20/25 chats from being
# mistaken for the complete project.
EXPECTED_MIN_PROJECT_THREADS = 400

PROMPT_FILE = HERE / "aspect-ratio-followup.txt"
LOG_FILE = HERE / "aspect-ratio-done-threads.json"
THREAD_LINKS_FILE = HERE / "project-thread-links.json"
SCREENSHOT_DIR = HERE / "aspect-ratio-debug-screenshots"

# Only this conversation is intentionally excluded from the rerun.
IGNORE_CONVERSATION_IDS = {
    "6aa5d391-9e94-83ea-bfe0-a8909756dfc6",
}

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

PROJECT_SHOW_MORE_SELECTORS = [
    'button:has-text("Show more")',
    '[role="button"]:has-text("Show more")',
    '[data-testid*="show-more"]',
    'text="Show more"',
]

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


def load_project_threads():
    """
    Load the direct conversation URLs captured from ChatGPT's project markup.

    This intentionally does NOT inspect/click the sidebar and does NOT use
    Show more. The manifest contains the 427 existing <a href="/g/.../c/...">
    conversation links supplied from the new layout.
    """
    if not THREAD_LINKS_FILE.exists():
        raise RuntimeError(
            f"Missing direct thread manifest: {THREAD_LINKS_FILE}"
        )

    try:
        data = json.loads(
            THREAD_LINKS_FILE.read_text(
                encoding="utf-8"
            )
        )
    except Exception as exc:
        raise RuntimeError(
            f"Could not read {THREAD_LINKS_FILE}: {exc}"
        )

    raw_threads = data.get(
        "threads",
        []
    )

    if not isinstance(raw_threads, list):
        raise RuntimeError(
            f"{THREAD_LINKS_FILE} must contain a 'threads' array."
        )

    records = []
    seen = set()

    for item in raw_threads:
        if not isinstance(item, dict):
            continue

        url = (
            item.get("url")
            or ""
        ).strip()

        conversation_id = (
            item.get("conversation_id")
            or conversation_key_from_url(url)
        )

        if not conversation_id:
            continue

        conversation_id = conversation_id.lower()

        # User explicitly requested that ONLY this current thread be ignored.
        if conversation_id in IGNORE_CONVERSATION_IDS:
            continue

        if conversation_id in seen:
            continue

        if f"/g/{PROJECT_ID}/c/" not in url:
            raise RuntimeError(
                "Manifest contains a URL outside the ShapeDividers project: "
                f"{url}"
            )

        seen.add(
            conversation_id
        )

        records.append(
            {
                "conversation_id": conversation_id,
                "title": (
                    item.get("title")
                    or f"thread-{len(records) + 1}"
                ),
                "url": url.split(
                    "?",
                    1,
                )[0].split(
                    "#",
                    1,
                )[0],
            }
        )

    if not records:
        raise RuntimeError(
            "The direct thread manifest contains no usable conversations."
        )

    return records


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


def project_chat_list_locator(page):
    return page.locator(
        PROJECT_CHAT_LIST
    ).first


def scroll_project_list_to_bottom(page):
    """
    Force the ShapeDividers project list to its bottom.

    ChatGPT sometimes reveals the next Show more control only after the
    project list has been scrolled to the bottom. In some UI versions the
    list also lazy-loads additional rows from scrolling alone.
    """
    chat_list = project_chat_list_locator(
        page
    )

    try:
        chat_list.wait_for(
            state="attached",
            timeout=10_000,
        )
    except Exception:
        return

    # Bring the last known conversation into view first.
    try:
        rows = project_chat_links(
            page
        )

        count = rows.count()

        if count > 0:
            rows.nth(
                count - 1
            ).scroll_into_view_if_needed(
                timeout=5_000,
            )
    except Exception:
        pass

    # Then force the actual list/container scroll position to the bottom.
    for locator in [
        chat_list,
        page.locator(
            PROJECT_CONTAINER
        ).first,
    ]:
        try:
            locator.evaluate(
                """el => {
                    el.scrollTop = el.scrollHeight;
                    const parent = el.parentElement;
                    if (parent) {
                        parent.scrollTop = parent.scrollHeight;
                    }
                }"""
            )
        except Exception:
            pass


def find_project_show_more(page):
    """
    Find the ShapeDividers project's own Show more control.

    The control can briefly disappear while React rebuilds the sidebar, so
    callers must not interpret a single None result as "fully expanded".
    """
    container = page.locator(
        PROJECT_CONTAINER
    ).first

    try:
        container.wait_for(
            state="attached",
            timeout=10_000,
        )
    except Exception:
        return None

    for selector in PROJECT_SHOW_MORE_SELECTORS:
        try:
            candidates = container.locator(
                selector
            )

            count = candidates.count()

            for i in range(count):
                candidate = candidates.nth(
                    i
                )

                try:
                    text = (
                        candidate.inner_text(
                            timeout=1_000
                        )
                        or ""
                    ).strip()

                    if (
                        "show more" not in text.lower()
                        and selector == 'text="Show more"'
                    ):
                        continue
                except Exception:
                    pass

                try:
                    if candidate.is_visible():
                        return candidate
                except Exception:
                    pass

                try:
                    if candidate.count() > 0:
                        return candidate
                except Exception:
                    pass

        except Exception:
            pass

    return None


def wait_for_project_show_more(
    page,
    timeout_ms=15_000,
):
    """
    Wait for Show more using a DOM MutationObserver.

    The observer watches the live sidebar subtree and resolves as soon as
    ChatGPT mounts/re-mounts a Show more control for ShapeDividers Shapes.
    This avoids fixed polling delays while still keeping the full timeout as
    a safety ceiling.
    """
    # Fast path: it may already exist.
    control = find_project_show_more(
        page
    )

    if control is not None:
        return control

    try:
        found = page.evaluate(
            """({projectId, timeoutMs}) => {
                return new Promise((resolve) => {
                    const projectSelector =
                        'div[data-sidebar-project-container-id="project:' +
                        projectId + '"]';

                    const findShowMore = () => {
                        const project = document.querySelector(
                            projectSelector
                        );

                        if (!project) {
                            return false;
                        }

                        const candidates = [
                            ...project.querySelectorAll(
                                'button, [role="button"], [data-testid]'
                            )
                        ];

                        return candidates.some((el) => {
                            const text = (
                                el.textContent || ''
                            ).trim().toLowerCase();

                            const testId = (
                                el.getAttribute('data-testid') || ''
                            ).toLowerCase();

                            return (
                                text === 'show more' ||
                                text.includes('show more') ||
                                testId.includes('show-more')
                            );
                        });
                    };

                    if (findShowMore()) {
                        resolve(true);
                        return;
                    }

                    const root =
                        document.querySelector(
                            '#app-shell-sidebar'
                        ) ||
                        document.body;

                    const observer = new MutationObserver(() => {
                        if (findShowMore()) {
                            observer.disconnect();
                            clearTimeout(timer);
                            resolve(true);
                        }
                    });

                    observer.observe(
                        root,
                        {
                            childList: true,
                            subtree: true,
                            attributes: true,
                            attributeFilter: [
                                'aria-hidden',
                                'aria-expanded',
                                'style',
                                'class',
                                'data-testid',
                            ],
                        }
                    );

                    const timer = setTimeout(() => {
                        observer.disconnect();
                        resolve(false);
                    }, timeoutMs);
                });
            }""",
            {
                "projectId": PROJECT_ID,
                "timeoutMs": timeout_ms,
            },
        )

    except Exception:
        found = False

    if not found:
        return None

    # Re-acquire a Playwright locator after the observer signals that the
    # control exists. React may have replaced the exact DOM node.
    return find_project_show_more(
        page
    )


def click_project_show_more(page):
    """
    Click one project Show more control if present.
    """
    control = wait_for_project_show_more(
        page,
        timeout_ms=2_500,
    )

    if control is None:
        return False

    try:
        control.scroll_into_view_if_needed(
            timeout=5_000,
        )
    except Exception:
        pass

    try:
        control.click(
            timeout=5_000,
        )
        return True
    except Exception:
        try:
            control.dispatch_event(
                "click"
            )
            return True
        except Exception:
            return False


def expand_all_project_chats(
    page,
    minimum_expected=EXPECTED_MIN_PROJECT_THREADS,
):
    """
    Fully expand the ShapeDividers project list.

    ChatGPT temporarily removes/recreates the Show more button after every
    click. The old implementation could look again too quickly and mistake
    that temporary DOM gap for completion.

    This version deliberately waits after EVERY click, then waits again for
    either:
      1) more conversation links to appear, or
      2) the next Show more control to be recreated.

    It is NEVER allowed to report completion while fewer than
    minimum_expected conversations are loaded.
    """
    ensure_project_available(
        page
    )

    total_clicks = 0
    consecutive_no_button = 0
    last_count = project_thread_count(
        page
    )

    print(
        f"Expansion target floor: {minimum_expected}+ conversations."
    )

    while True:
        scroll_project_list_to_bottom(
            page
        )

        current = project_thread_count(
            page
        )

        if current != last_count:
            print(
                f"Project expansion: {current} conversations loaded."
            )
            last_count = current

        # MutationObserver resolves as soon as React recreates Show more.
        # The 15-second value is only the maximum safety timeout.
        control = wait_for_project_show_more(
            page,
            timeout_ms=15_000,
        )

        if control is None:
            current = project_thread_count(
                page
            )

            if current < minimum_expected:
                consecutive_no_button += 1

                print(
                    f"Show more not present yet at {current} conversations "
                    f"(minimum {minimum_expected}). Waiting for sidebar "
                    f"rerender... [{consecutive_no_button}/12]"
                )

                # Re-scroll and wait longer. Do not declare completion.
                scroll_project_list_to_bottom(
                    page
                )
                page.wait_for_timeout(
                    2_000
                )

                try:
                    ensure_project_available(
                        page
                    )
                except Exception:
                    pass

                if consecutive_no_button >= 12:
                    raise RuntimeError(
                        "ChatGPT stopped exposing Show more while only "
                        f"{current} ShapeDividers conversations are loaded. "
                        f"The known minimum is {minimum_expected}. "
                        "Refusing to declare completion."
                    )

                continue

            # At/above the known floor, require five long, consecutive checks
            # with no Show more before accepting completion.
            consecutive_no_button += 1

            print(
                f"No Show more found at {current} conversations "
                f"(completion check {consecutive_no_button}/5)."
            )

            if consecutive_no_button >= 5:
                break

            page.wait_for_timeout(
                2_000
            )
            continue

        # A button exists, so we are definitely not finished.
        consecutive_no_button = 0
        before_click = project_thread_count(
            page
        )

        # Click the exact control we already found rather than doing a second
        # lookup that might race a React rerender.
        try:
            control.scroll_into_view_if_needed(
                timeout=5_000,
            )
        except Exception:
            pass

        clicked = False

        try:
            control.click(
                timeout=5_000,
            )
            clicked = True
        except Exception:
            try:
                control.dispatch_event(
                    "click"
                )
                clicked = True
            except Exception:
                clicked = False

        if not clicked:
            print(
                "Show more was found but could not be clicked. "
                "Waiting and retrying..."
            )
            page.wait_for_timeout(
                2_000
            )
            continue

        total_clicks += 1

        # Always allow a short settle after a successful click. ChatGPT removes
        # the old button and asynchronously mounts the next batch/button.
        page.wait_for_timeout(
            350
        )

        # Wait up to 15 seconds for the conversation count to grow. Even if it
        # grows immediately, keep a short settle delay before looking for the
        # next Show more.
        deadline = time.monotonic() + 15.0
        after_click = project_thread_count(
            page
        )

        while time.monotonic() < deadline:
            scroll_project_list_to_bottom(
                page
            )

            after_click = project_thread_count(
                page
            )

            if after_click > before_click:
                break

            page.wait_for_timeout(
                300
            )

        print(
            f"Project expansion: {after_click} conversations loaded "
            f"after {total_clicks} Show more click(s)."
        )

        # Let React finish mounting the replacement Show more control before
        # the next loop iteration.
        page.wait_for_timeout(
            250
        )

        if total_clicks >= 1000:
            raise RuntimeError(
                "Stopped after 1000 Show more clicks. "
                "The ChatGPT UI may have changed."
            )

    final_count = project_thread_count(
        page
    )

    if final_count < minimum_expected:
        raise RuntimeError(
            "Expansion ended below the required minimum: "
            f"{final_count} < {minimum_expected}."
        )

    print(
        f"Project expansion complete for this pass: "
        f"{final_count} conversations loaded."
    )

    return total_clicks


def snapshot_project_threads(page=None):
    """
    Return the static direct-link manifest.

    The page argument is retained only for compatibility with older call sites.
    No DOM inspection is performed.
    """
    return load_project_threads()


def project_thread_rows(page=None):
    # Kept only so older diagnostics do not crash.
    return []


def project_thread_count(page=None):
    return len(
        load_project_threads()
    )


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
    Pick the next conversation directly from project-thread-links.json.

    No sidebar scanning, Show more clicking, DOM mutation observing, or project
    expansion is involved.
    """
    records = load_project_threads()
    threads = log_data[
        "threads"
    ]

    print()
    print(
        f"Direct conversation links available: {len(records)}"
    )

    # Preserve the earlier bottom-to-top processing order.
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
    Only confirmed successful sends are protected.

    - done: skip forever
    - reserved: eligible again, because the user wants these retried
    """
    return entry.get("status") == "done"


def is_thread_eligible(entry):
    """
    A thread is eligible unless it is confirmed DONE.

    Missing entries, reserved entries, and diagnostic states such as
    prepare_failed may be retried.
    """
    if not entry:
        return True

    return not status_is_protected(
        entry
    )


def validate_script_structure():
    """
    Lightweight startup sanity check so stale/duplicate helper code fails
    clearly instead of entering a recovery loop.
    """
    required = [
        "choose_next_unprocessed_thread",
        "snapshot_project_threads",
        "load_project_threads",
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


def print_progress(log_data):
    """
    Print confirmed completion progress for the direct-link manifest.

    Only DONE counts as complete. RESERVED remains in the remaining workload
    and is shown separately so it is clear those chats will be retried.
    """
    records = load_project_threads()
    manifest_ids = {
        record["conversation_id"]
        for record in records
    }

    done_count = 0
    reserved_count = 0
    remaining_count = 0

    threads = log_data.get(
        "threads",
        {}
    )

    for conversation_id in manifest_ids:
        entry = threads.get(
            conversation_id
        )

        if entry and entry.get("status") == "done":
            done_count += 1
            continue

        remaining_count += 1

        if entry and entry.get("status") == "reserved":
            reserved_count += 1

    total_count = len(
        records
    )

    print(
        f"Progress: {done_count} / {total_count} done; "
        f"{remaining_count} remaining "
        f"({reserved_count} reserved to retry)"
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
            "Inspect the direct conversation manifest, "
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
            "Deprecated compatibility flag. Reserved threads are retried "
            "automatically; only DONE threads are skipped."
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
    print(f"Script version: {SCRIPT_VERSION}")
    print(f"Project: {PROJECT_NAME}")
    print(f"Interval: {args.interval} seconds")
    print(f"Log: {LOG_FILE}")
    print()
    print("Follow-up prompt:")
    print(prompt)
    print()
    print(
        "Duplicate protection: only DONE conversation IDs are skipped. "
        "RESERVED chats are retried automatically."
    )
    print(
        "Temporary page/composer failures are retried automatically "
        "and no longer stop the batch."
    )
    print(
        "Direct-link mode: using project-thread-links.json; "
        "no Show more/sidebar expansion is used."
    )
    print(
        "Ignored conversation: "
        "6aa5d391-9e94-83ea-bfe0-a8909756dfc6"
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

            records = load_project_threads()

            print()
            print(
                "Direct project thread manifest loaded."
            )
            print(
                f"Threads available: {len(records)}"
            )
            print(
                "Show more / sidebar expansion: disabled"
            )

            print_progress(
                log_data
            )

            if args.dry_run:
                records = snapshot_project_threads(
                    page
                )

                print()
                print(
                    "Direct project conversations eligible for scanning:"
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
                        # Direct-link mode: no sidebar recovery/expansion needed.
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
                        "All direct ShapeDividers conversation links in "
                        "project-thread-links.json are marked DONE."
                    )
                    print_progress(
                        log_data
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
                        # Direct-link mode: no sidebar recovery/expansion needed.
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
                        # Direct-link mode: no sidebar recovery/expansion needed.
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

                print_progress(
                    log_data
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
