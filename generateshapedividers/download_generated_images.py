#!/usr/bin/env python3

"""
Download every generated image from the ShapeDividers Shapes project threads.

Place this file in the same local folder as:
  - project-thread-links.json
  - the existing .venv used by rerun_aspect_ratio.py

The script connects to the already-open Chrome instance over CDP, visits the
same direct conversation URLs, scrolls through each thread so virtualized image
turns are mounted, and saves the original generated image blobs to:

    ~/Downloads/shape_dividers

Threads are throttled to one visit every 240 seconds by default.
"""

import argparse
import base64
import hashlib
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright


HERE = Path(__file__).resolve().parent

PROJECT_ID = "g-p-6aa5e3c7d10c8191a7e9547580d0be0b"
PROJECT_NAME = "ShapeDividers Shapes"

DEFAULT_CDP_URL = "http://127.0.0.1:9222"
DEFAULT_INTERVAL = 240.0
SCRIPT_VERSION = "2026-09-29.1"

THREAD_LINKS_FILE = HERE / "project-thread-links.json"
DOWNLOAD_LOG_FILE = HERE / "download-images-progress.json"
DEBUG_DIR = HERE / "download-images-debug-screenshots"
DEFAULT_OUTPUT_DIR = Path.home() / "Downloads" / "shape_dividers"

THREAD_SCROLL = '[data-app-action-timeline-scroll]'
GENERATED_IMAGE = (
    '[data-testid="generated-image-gallery"] '
    'img[alt^="Generated image"]'
)

UUID_RE = re.compile(
    r"(?<![0-9a-f])"
    r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"
    r"(?![0-9a-f])",
    re.IGNORECASE,
)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def conversation_key_from_url(url):
    matches = UUID_RE.findall(url or "")
    if not matches:
        return None
    return matches[-1].lower()


def load_project_threads():
    if not THREAD_LINKS_FILE.exists():
        raise RuntimeError(
            f"Missing direct thread manifest: {THREAD_LINKS_FILE}"
        )

    data = json.loads(
        THREAD_LINKS_FILE.read_text(
            encoding="utf-8"
        )
    )

    ignored = {
        str(value).lower()
        for value in data.get(
            "ignored_conversation_ids",
            []
        )
    }

    records = []
    seen = set()

    for item in data.get("threads", []):
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

        if conversation_id in ignored:
            continue

        if conversation_id in seen:
            continue

        if f"/g/{PROJECT_ID}/c/" not in url:
            continue

        seen.add(conversation_id)

        records.append(
            {
                "conversation_id": conversation_id,
                "title": (
                    item.get("title")
                    or f"thread-{len(records) + 1}"
                ),
                "url": url.split("?", 1)[0].split("#", 1)[0],
            }
        )

    if not records:
        raise RuntimeError(
            "No usable ShapeDividers conversation URLs were found in "
            "project-thread-links.json."
        )

    return records


def load_log():
    if not DOWNLOAD_LOG_FILE.exists():
        return {
            "version": 1,
            "project_id": PROJECT_ID,
            "threads": {},
        }

    try:
        data = json.loads(
            DOWNLOAD_LOG_FILE.read_text(
                encoding="utf-8"
            )
        )
    except Exception as exc:
        raise RuntimeError(
            f"Could not read {DOWNLOAD_LOG_FILE}: {exc}"
        )

    if not isinstance(data, dict):
        raise RuntimeError(
            f"{DOWNLOAD_LOG_FILE} must contain a JSON object."
        )

    data.setdefault("version", 1)
    data.setdefault("project_id", PROJECT_ID)
    data.setdefault("threads", {})

    return data


def save_log(data):
    temp = DOWNLOAD_LOG_FILE.with_suffix(
        ".json.tmp"
    )

    temp.write_text(
        json.dumps(
            data,
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    temp.replace(
        DOWNLOAD_LOG_FILE
    )


def reset_log():
    data = {
        "version": 1,
        "project_id": PROJECT_ID,
        "threads": {},
    }
    save_log(data)


def page_is_usable(page):
    try:
        return (
            page is not None
            and not page.is_closed()
        )
    except Exception:
        return False


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
    print(
        f"Open pages: {len(context.pages)}"
    )

    return browser, context


def get_chatgpt_page(context):
    for page in context.pages:
        try:
            if (
                not page.is_closed()
                and "chatgpt.com" in page.url
            ):
                return page
        except Exception:
            pass

    return context.new_page()


def recover_page(
    context,
    page=None,
    target_url=None,
):
    if page_is_usable(page):
        live_page = page
    else:
        live_page = None

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

        if live_page is None:
            live_page = context.new_page()

    live_page.set_default_timeout(
        20_000
    )

    if target_url:
        try:
            live_page.goto(
                target_url,
                wait_until="domcontentloaded",
                timeout=60_000,
            )
        except Exception:
            live_page.goto(
                target_url,
                wait_until="domcontentloaded",
                timeout=60_000,
            )

    return live_page


def save_debug_screenshot(
    page,
    conversation_id,
):
    DEBUG_DIR.mkdir(
        exist_ok=True
    )

    path = DEBUG_DIR / (
        time.strftime("%Y%m%d-%H%M%S")
        + "-"
        + conversation_id[:8]
        + ".png"
    )

    try:
        if page_is_usable(page):
            page.screenshot(
                path=str(path),
                full_page=True,
            )
            print(
                f"Saved debug screenshot: {path}"
            )
    except Exception:
        pass


def safe_filename(value):
    value = (
        value
        .replace("/", "-")
        .replace("\\", "-")
        .replace(":", " -")
    )

    value = re.sub(
        r'[<>:"/\\|?*\x00-\x1f]+',
        "-",
        value,
    )

    value = re.sub(
        r"\s+",
        " ",
        value,
    ).strip(" .-")

    if not value:
        value = "untitled"

    return value[:180]


def extension_for_mime(mime):
    mime = (
        mime
        or ""
    ).split(";", 1)[0].strip().lower()

    return {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/webp": ".webp",
        "image/gif": ".gif",
        "image/avif": ".avif",
    }.get(
        mime,
        ".png",
    )


def sha256_bytes(data):
    return hashlib.sha256(
        data
    ).hexdigest()


def file_sha256(path):
    digest = hashlib.sha256()

    with path.open("rb") as handle:
        while True:
            chunk = handle.read(
                1024 * 1024
            )
            if not chunk:
                break
            digest.update(chunk)

    return digest.hexdigest()


def choose_output_path(
    output_dir,
    title,
    conversation_id,
    image_number,
    image_count,
    extension,
    digest,
):
    stem = safe_filename(
        title
    )

    if image_count > 1:
        stem = (
            f"{stem} - {image_number}"
        )

    candidate = (
        output_dir
        / f"{stem}{extension}"
    )

    if not candidate.exists():
        return candidate

    try:
        if (
            file_sha256(candidate)
            == digest
        ):
            return candidate
    except Exception:
        pass

    # Duplicate thread titles are common in this project. Keep the clean
    # title when possible, and add the conversation prefix only on collision.
    candidate = (
        output_dir
        / (
            f"{stem} - "
            f"{conversation_id[:8]}"
            f"{extension}"
        )
    )

    if not candidate.exists():
        return candidate

    try:
        if (
            file_sha256(candidate)
            == digest
        ):
            return candidate
    except Exception:
        pass

    suffix = 2

    while True:
        numbered = (
            output_dir
            / (
                f"{stem} - "
                f"{conversation_id[:8]}"
                f" - {suffix}"
                f"{extension}"
            )
        )

        if not numbered.exists():
            return numbered

        try:
            if (
                file_sha256(numbered)
                == digest
            ):
                return numbered
        except Exception:
            pass

        suffix += 1


def wait_for_thread(page):
    page.locator(
        THREAD_SCROLL
    ).first.wait_for(
        state="attached",
        timeout=45_000,
    )

    # Give ChatGPT a short moment to mount the latest turn and image blobs.
    page.wait_for_timeout(
        1_000
    )


def image_info(locator):
    try:
        return locator.evaluate(
            """img => {
                const turn = img.closest('[data-turn-key]');
                return {
                    src: img.currentSrc || img.src || '',
                    alt: img.getAttribute('alt') || '',
                    complete: !!img.complete,
                    naturalWidth: img.naturalWidth || 0,
                    naturalHeight: img.naturalHeight || 0,
                    turnKey: turn ? (turn.getAttribute('data-turn-key') || '') : '',
                };
            }"""
        )
    except Exception:
        return None


def fetch_image_bytes(
    page,
    src,
):
    payload = page.evaluate(
        """async (src) => {
            const response = await fetch(src);
            if (!response.ok) {
                throw new Error(
                    'Image fetch failed: HTTP ' + response.status
                );
            }

            const blob = await response.blob();

            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(blob);
            });

            return {
                mime: blob.type || 'image/png',
                dataUrl,
                size: blob.size,
            };
        }""",
        src,
    )

    data_url = payload[
        "dataUrl"
    ]

    if "," not in data_url:
        raise RuntimeError(
            "Generated image did not produce a valid data URL."
        )

    encoded = data_url.split(
        ",",
        1,
    )[1]

    return (
        base64.b64decode(encoded),
        payload.get(
            "mime"
        ) or "image/png",
    )


def collect_visible_images(
    page,
    collected,
    seen_keys,
):
    images = page.locator(
        GENERATED_IMAGE
    )

    count = images.count()
    added = 0

    for index in range(count):
        locator = images.nth(index)
        info = image_info(
            locator
        )

        if not info:
            continue

        src = (
            info.get("src")
            or ""
        )

        if not src:
            continue

        # data-turn-key + generated-image alt is stable across virtualization.
        # Fall back to the blob URL if a turn key is unavailable.
        stable_key = (
            (
                info.get("turnKey")
                or ""
            )
            + "|"
            + (
                info.get("alt")
                or f"image-{index + 1}"
            )
        ).strip("|")

        if not stable_key:
            stable_key = src

        if stable_key in seen_keys:
            continue

        # Wait briefly for the <img> to have a real source. The actual bytes
        # are fetched directly from its blob URL; no preview click is needed.
        if not info.get("complete"):
            try:
                locator.evaluate(
                    """img => new Promise(resolve => {
                        if (img.complete) {
                            resolve();
                            return;
                        }
                        const finish = () => resolve();
                        img.addEventListener('load', finish, {once: true});
                        img.addEventListener('error', finish, {once: true});
                        setTimeout(finish, 5000);
                    })"""
                )
            except Exception:
                pass

            info = image_info(
                locator
            ) or info

            src = (
                info.get("src")
                or src
            )

        try:
            data, mime = fetch_image_bytes(
                page,
                src,
            )
        except Exception as exc:
            print(
                "  Image fetch failed; will retry if it remounts: "
                f"{exc}"
            )
            continue

        seen_keys.add(
            stable_key
        )

        digest = sha256_bytes(
            data
        )

        collected.append(
            {
                "data": data,
                "mime": mime,
                "sha256": digest,
                "key": stable_key,
                "width": info.get(
                    "naturalWidth",
                    0,
                ),
                "height": info.get(
                    "naturalHeight",
                    0,
                ),
            }
        )

        added += 1

        print(
            "  Captured generated image "
            f"#{len(collected)} "
            f"({len(data):,} bytes, "
            f"{info.get('naturalWidth', 0)}x"
            f"{info.get('naturalHeight', 0)})"
        )

    return added


def scroll_state(scroll):
    try:
        return scroll.evaluate(
            """el => ({
                top: el.scrollTop,
                height: el.scrollHeight,
                client: el.clientHeight
            })"""
        )
    except Exception:
        return {
            "top": 0,
            "height": 0,
            "client": 0,
        }


def scroll_one_step(
    scroll,
    direction,
):
    try:
        scroll.evaluate(
            """({el, direction}) => {
                const amount = Math.max(
                    500,
                    Math.floor(el.clientHeight * 0.80)
                );
                el.scrollBy(
                    0,
                    direction * amount
                );
            }""",
            {
                "el": scroll,
                "direction": direction,
            },
        )
    except Exception:
        # Playwright cannot pass a Locator as an evaluate argument in every
        # version, so use locator.evaluate as the normal path below.
        scroll.evaluate(
            """(el, direction) => {
                const amount = Math.max(
                    500,
                    Math.floor(el.clientHeight * 0.80)
                );
                el.scrollBy(
                    0,
                    direction * amount
                );
            }""",
            direction,
        )


def walk_scroll_direction(
    page,
    scroll,
    direction,
    collected,
    seen_keys,
    max_steps=300,
):
    """
    Walk one direction through ChatGPT's virtualized transcript.

    direction=-1 moves toward older messages.
    direction=+1 moves toward newer messages.
    """
    stable = 0

    for _ in range(max_steps):
        collect_visible_images(
            page,
            collected,
            seen_keys,
        )

        before = scroll_state(
            scroll
        )

        # locator.evaluate directly, avoiding mouse position/focus issues.
        scroll.evaluate(
            """(el, direction) => {
                const amount = Math.max(
                    500,
                    Math.floor(el.clientHeight * 0.80)
                );
                el.scrollBy(
                    0,
                    direction * amount
                );
            }""",
            direction,
        )

        page.wait_for_timeout(
            350
        )

        collect_visible_images(
            page,
            collected,
            seen_keys,
        )

        after = scroll_state(
            scroll
        )

        moved = (
            abs(
                float(after.get("top", 0))
                - float(before.get("top", 0))
            )
            > 1
        )

        resized = (
            int(after.get("height", 0))
            != int(before.get("height", 0))
        )

        if moved or resized:
            stable = 0
        else:
            stable += 1

            # Virtualized history can take a moment to prepend another chunk.
            page.wait_for_timeout(
                600
            )

        if stable >= 4:
            break


def collect_all_thread_images(page):
    wait_for_thread(
        page
    )

    scroll = page.locator(
        THREAD_SCROLL
    ).first

    collected = []
    seen_keys = set()

    # Start from whatever ChatGPT mounted (usually the newest response), then
    # walk completely upward to load older generated-image turns.
    collect_visible_images(
        page,
        collected,
        seen_keys,
    )

    walk_scroll_direction(
        page,
        scroll,
        -1,
        collected,
        seen_keys,
    )

    # Walk all the way back down too. This catches any image turns ChatGPT
    # virtualizes/remounts only while moving toward the newest response.
    walk_scroll_direction(
        page,
        scroll,
        +1,
        collected,
        seen_keys,
    )

    collect_visible_images(
        page,
        collected,
        seen_keys,
    )

    return collected


def save_thread_images(
    images,
    output_dir,
    title,
    conversation_id,
):
    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    saved = []
    image_count = len(
        images
    )

    for image_number, image in enumerate(
        images,
        start=1,
    ):
        extension = extension_for_mime(
            image["mime"]
        )

        path = choose_output_path(
            output_dir,
            title,
            conversation_id,
            image_number,
            image_count,
            extension,
            image["sha256"],
        )

        if not path.exists():
            path.write_bytes(
                image["data"]
            )
        else:
            try:
                if (
                    file_sha256(path)
                    != image["sha256"]
                ):
                    path.write_bytes(
                        image["data"]
                    )
            except Exception:
                path.write_bytes(
                    image["data"]
                )

        saved.append(
            {
                "path": str(
                    path.resolve()
                ),
                "filename": path.name,
                "sha256": image[
                    "sha256"
                ],
                "mime": image[
                    "mime"
                ],
                "width": image.get(
                    "width",
                    0,
                ),
                "height": image.get(
                    "height",
                    0,
                ),
            }
        )

        print(
            f"  Saved: {path.name}"
        )

    return saved


def entry_is_complete(
    entry,
):
    if not entry:
        return False

    if (
        entry.get("status")
        != "done"
    ):
        return False

    images = entry.get(
        "images",
        []
    )

    if not images:
        return False

    for image in images:
        path = Path(
            image.get(
                "path",
                ""
            )
        )

        if not path.exists():
            return False

    return True


def print_progress(
    records,
    log_data,
):
    threads = log_data.get(
        "threads",
        {}
    )

    done = 0
    image_count = 0

    for record in records:
        entry = threads.get(
            record["conversation_id"]
        )

        if entry_is_complete(
            entry
        ):
            done += 1
            image_count += len(
                entry.get(
                    "images",
                    []
                )
            )

    total = len(
        records
    )

    print(
        f"Progress: {done} / {total} threads downloaded; "
        f"{total - done} remaining; "
        f"{image_count} images saved"
    )


def wait_for_visit_interval(
    last_visit_at,
    interval,
):
    if (
        last_visit_at is None
        or interval <= 0
    ):
        return

    elapsed = (
        time.monotonic()
        - last_visit_at
    )

    remaining = (
        interval
        - elapsed
    )

    if remaining <= 0:
        return

    print(
        f"Waiting {remaining:.1f}s before visiting next thread..."
    )

    time.sleep(
        remaining
    )


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Visit ShapeDividers Shapes conversations and download all "
            "generated images to ~/Downloads/shape_dividers."
        )
    )

    parser.add_argument(
        "--interval",
        type=float,
        default=DEFAULT_INTERVAL,
        help=(
            "Seconds between conversation visits. "
            "Default: 240 (4 minutes)."
        ),
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help=(
            "Maximum number of conversations to download in this run."
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
        "--output-dir",
        default=str(
            DEFAULT_OUTPUT_DIR
        ),
        help=(
            "Download directory. "
            "Default: ~/Downloads/shape_dividers"
        ),
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help=(
            "Show which conversations would be visited without navigating "
            "or downloading anything."
        ),
    )

    parser.add_argument(
        "--reset-log",
        action="store_true",
        help=(
            "Reset only download-images-progress.json. Existing image files "
            "are not deleted."
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

    output_dir = Path(
        args.output_dir
    ).expanduser()

    if args.reset_log:
        reset_log()

    records = load_project_threads()
    log_data = load_log()

    print()
    print("ShapeDividers image downloader")
    print("------------------------------")
    print(
        f"Script version: {SCRIPT_VERSION}"
    )
    print(
        f"Project: {PROJECT_NAME}"
    )
    print(
        f"Threads in direct manifest: {len(records)}"
    )
    print(
        f"Output folder: {output_dir}"
    )
    print(
        f"Visit interval: {args.interval} seconds"
    )
    print(
        f"Progress log: {DOWNLOAD_LOG_FILE}"
    )
    print()
    print_progress(
        records,
        log_data,
    )

    if args.dry_run:
        print()
        print(
            "DRY RUN: no pages will be visited and no files will be written."
        )

        pending = [
            record
            for record in records
            if not entry_is_complete(
                log_data.get(
                    "threads",
                    {}
                ).get(
                    record["conversation_id"]
                )
            )
        ]

        if args.limit is not None:
            pending = pending[
                :args.limit
            ]

        for index, record in enumerate(
            pending,
            start=1,
        ):
            print(
                f"{index:03d}. "
                f"{record['title']} "
                f"[{record['conversation_id']}]"
            )

        print()
        print(
            f"Would visit: {len(pending)} thread(s)"
        )
        return

    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    processed_this_run = 0
    last_visit_at = None
    failed_this_run = set()

    with sync_playwright() as playwright:
        browser = None

        try:
            browser, context = connect_to_chrome(
                playwright,
                args.cdp_url,
            )

            page = get_chatgpt_page(
                context
            )

            page.set_default_timeout(
                20_000
            )

            for record in records:
                conversation_id = record[
                    "conversation_id"
                ]

                if (
                    conversation_id
                    in failed_this_run
                ):
                    continue

                existing = log_data.get(
                    "threads",
                    {}
                ).get(
                    conversation_id
                )

                if entry_is_complete(
                    existing
                ):
                    continue

                if (
                    args.limit is not None
                    and processed_this_run
                    >= args.limit
                ):
                    break

                title = record[
                    "title"
                ]
                url = record[
                    "url"
                ]

                wait_for_visit_interval(
                    last_visit_at,
                    args.interval,
                )

                print()
                print(
                    f"NEXT: {title}"
                )
                print(
                    f"Conversation: {conversation_id}"
                )

                try:
                    last_visit_at = time.monotonic()

                    page = recover_page(
                        context,
                        page,
                        target_url=url,
                    )

                    wait_for_thread(
                        page
                    )

                    images = collect_all_thread_images(
                        page
                    )

                    if not images:
                        raise RuntimeError(
                            "No generated images were found after scrolling "
                            "through the entire conversation."
                        )

                    saved = save_thread_images(
                        images,
                        output_dir,
                        title,
                        conversation_id,
                    )

                    log_data.setdefault(
                        "threads",
                        {}
                    )[conversation_id] = {
                        "status": "done",
                        "title": title,
                        "url": url,
                        "completed_at": now_iso(),
                        "image_count": len(
                            saved
                        ),
                        "images": saved,
                    }

                    save_log(
                        log_data
                    )

                    processed_this_run += 1

                    print(
                        f"DONE #{processed_this_run}: "
                        f"{title} — {len(saved)} image(s)"
                    )

                    print_progress(
                        records,
                        log_data,
                    )

                except KeyboardInterrupt:
                    raise

                except Exception as exc:
                    failed_this_run.add(
                        conversation_id
                    )

                    log_data.setdefault(
                        "threads",
                        {}
                    )[conversation_id] = {
                        "status": "failed",
                        "title": title,
                        "url": url,
                        "failed_at": now_iso(),
                        "error": str(
                            exc
                        ),
                    }

                    save_log(
                        log_data
                    )

                    print(
                        f"FAILED: {title}"
                    )
                    print(
                        str(exc)
                    )

                    save_debug_screenshot(
                        page,
                        conversation_id,
                    )

                    print(
                        "Moving to the next thread. This failed thread will "
                        "be retried on the next run."
                    )

            print()
            print(
                "Download pass finished."
            )
            print_progress(
                records,
                log_data,
            )

        finally:
            # Do not call browser.close() on a CDP-connected browser.
            # Leaving the sync_playwright() context disconnects automation
            # without intentionally closing the user's Chrome window.
            print()
            print(
                "Automation disconnected."
            )
            print(
                "Your Chrome window remains open."
            )


if __name__ == "__main__":
    main()
