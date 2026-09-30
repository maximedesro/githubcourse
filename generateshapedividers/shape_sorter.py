#!/usr/bin/env python3

import argparse
import json
import mimetypes
import shutil
import threading
import time
import urllib.parse
import webbrowser
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path


HERE = Path(__file__).resolve().parent
SHAPES_DIR = HERE / "shapedividers_newshapes"
NEW_DIR = SHAPES_DIR / "new"
DESTINATIONS = {
    "accepted": SHAPES_DIR / "accepted",
    "maybe": SHAPES_DIR / "maybe",
    "delete": SHAPES_DIR / "delete",
}
STATIC_FILES = {
    "/": HERE / "shape_sorter.html",
    "/shape_sorter.html": HERE / "shape_sorter.html",
    "/shape_sorter.css": HERE / "shape_sorter.css",
    "/shape_sorter.js": HERE / "shape_sorter.js",
}
IMAGE_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".avif",
    ".bmp",
    ".tif",
    ".tiff",
}

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8765


def ensure_directories():
    NEW_DIR.mkdir(parents=True, exist_ok=True)
    for destination in DESTINATIONS.values():
        destination.mkdir(parents=True, exist_ok=True)


def list_new_images():
    ensure_directories()

    items = []

    for path in NEW_DIR.iterdir():
        if not path.is_file():
            continue

        if path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue

        stat = path.stat()

        items.append(
            {
                "name": path.name,
                "size": stat.st_size,
                "mtime": stat.st_mtime,
                "modified": time.strftime(
                    "%Y-%m-%d %H:%M:%S",
                    time.localtime(stat.st_mtime),
                ),
                "url": "/image?"
                + urllib.parse.urlencode(
                    {
                        "name": path.name,
                        "v": int(stat.st_mtime_ns),
                    }
                ),
            }
        )

    # Most recently modified first, matching a typical Date Modified workflow.
    items.sort(
        key=lambda item: (
            item["mtime"],
            item["name"].lower(),
        ),
        reverse=True,
    )

    return items


def unique_destination_path(destination_dir, filename):
    target = destination_dir / filename

    if not target.exists():
        return target

    stem = Path(filename).stem
    suffix = Path(filename).suffix
    counter = 2

    while True:
        candidate = destination_dir / f"{stem} ({counter}){suffix}"
        if not candidate.exists():
            return candidate
        counter += 1


def move_selected_items(items):
    ensure_directories()

    moved = []
    errors = []

    for item in items:
        if not isinstance(item, dict):
            continue

        filename = str(item.get("name") or "").strip()
        destination_key = str(item.get("destination") or "").strip()

        if destination_key not in DESTINATIONS:
            errors.append(
                {
                    "name": filename,
                    "error": f"Unknown destination: {destination_key}",
                }
            )
            continue

        # Strip any path components so requests can only address /new files.
        safe_name = Path(filename).name

        if safe_name != filename or not safe_name:
            errors.append(
                {
                    "name": filename,
                    "error": "Invalid filename.",
                }
            )
            continue

        source = NEW_DIR / safe_name

        if not source.exists() or not source.is_file():
            errors.append(
                {
                    "name": safe_name,
                    "error": "File is no longer present in /new.",
                }
            )
            continue

        destination = unique_destination_path(
            DESTINATIONS[destination_key],
            safe_name,
        )

        try:
            shutil.move(
                str(source),
                str(destination),
            )
            moved.append(
                {
                    "name": safe_name,
                    "destination": destination_key,
                    "new_name": destination.name,
                }
            )
        except Exception as exc:
            errors.append(
                {
                    "name": safe_name,
                    "error": str(exc),
                }
            )

    return moved, errors


class ShapeSorterHandler(SimpleHTTPRequestHandler):
    server_version = "ShapeSorter/1.0"

    def log_message(self, format, *args):
        print(
            "%s - %s"
            % (
                self.address_string(),
                format % args,
            )
        )

    def send_json(self, payload, status=200):
        data = json.dumps(
            payload,
            ensure_ascii=False,
        ).encode("utf-8")

        self.send_response(status)
        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8",
        )
        self.send_header(
            "Content-Length",
            str(len(data)),
        )
        self.send_header(
            "Cache-Control",
            "no-store",
        )
        self.end_headers()
        self.wfile.write(data)

    def serve_static_file(self, path):
        if not path.exists() or not path.is_file():
            self.send_error(
                404,
                "Static file not found.",
            )
            return

        mime, _ = mimetypes.guess_type(
            path.name
        )

        if path.suffix.lower() == ".js":
            mime = "text/javascript"
        elif path.suffix.lower() == ".css":
            mime = "text/css"

        data = path.read_bytes()

        self.send_response(200)
        self.send_header(
            "Content-Type",
            (mime or "application/octet-stream")
            + (
                "; charset=utf-8"
                if path.suffix.lower()
                in {".html", ".css", ".js"}
                else ""
            ),
        )
        self.send_header(
            "Content-Length",
            str(len(data)),
        )
        self.send_header(
            "Cache-Control",
            "no-store",
        )
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        parsed = urllib.parse.urlparse(
            self.path
        )

        if parsed.path == "/api/images":
            self.send_json(
                {
                    "items": list_new_images(),
                }
            )
            return

        if parsed.path == "/image":
            params = urllib.parse.parse_qs(
                parsed.query
            )
            filename = (
                params.get(
                    "name",
                    [""],
                )[0]
            )
            safe_name = Path(
                filename
            ).name

            if (
                not safe_name
                or safe_name != filename
            ):
                self.send_error(
                    400,
                    "Invalid image filename.",
                )
                return

            image_path = (
                NEW_DIR / safe_name
            )

            if (
                not image_path.exists()
                or not image_path.is_file()
            ):
                self.send_error(
                    404,
                    "Image not found.",
                )
                return

            mime, _ = mimetypes.guess_type(
                image_path.name
            )
            data = image_path.read_bytes()

            self.send_response(200)
            self.send_header(
                "Content-Type",
                mime or "application/octet-stream",
            )
            self.send_header(
                "Content-Length",
                str(len(data)),
            )
            self.send_header(
                "Cache-Control",
                "no-store",
            )
            self.end_headers()
            self.wfile.write(data)
            return

        static_path = STATIC_FILES.get(
            parsed.path
        )

        if static_path:
            self.serve_static_file(
                static_path
            )
            return

        self.send_error(
            404,
            "Not found.",
        )

    def do_POST(self):
        parsed = urllib.parse.urlparse(
            self.path
        )

        if parsed.path != "/api/sort":
            self.send_error(
                404,
                "Not found.",
            )
            return

        try:
            content_length = int(
                self.headers.get(
                    "Content-Length",
                    "0",
                )
            )
            body = self.rfile.read(
                content_length
            )
            payload = json.loads(
                body.decode("utf-8")
            )
        except Exception as exc:
            self.send_json(
                {
                    "ok": False,
                    "error": f"Invalid JSON: {exc}",
                },
                status=400,
            )
            return

        items = payload.get(
            "items",
            [],
        )

        if not isinstance(
            items,
            list,
        ):
            self.send_json(
                {
                    "ok": False,
                    "error": "'items' must be an array.",
                },
                status=400,
            )
            return

        moved, errors = move_selected_items(
            items
        )

        self.send_json(
            {
                "ok": not errors,
                "moved": moved,
                "errors": errors,
                "items": list_new_images(),
            }
        )


def open_browser(url):
    time.sleep(
        0.5
    )

    try:
        webbrowser.open(
            url
        )
    except Exception:
        pass


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Run a local browser UI for sorting ShapeDividers images "
            "from shapedividers_newshapes/new."
        )
    )

    parser.add_argument(
        "--host",
        default=DEFAULT_HOST,
        help=(
            "Host to bind. "
            f"Default: {DEFAULT_HOST}"
        ),
    )

    parser.add_argument(
        "--port",
        type=int,
        default=DEFAULT_PORT,
        help=(
            "Port to bind. "
            f"Default: {DEFAULT_PORT}"
        ),
    )

    parser.add_argument(
        "--no-browser",
        action="store_true",
        help=(
            "Do not automatically open the browser."
        ),
    )

    args = parser.parse_args()

    ensure_directories()

    httpd = ThreadingHTTPServer(
        (
            args.host,
            args.port,
        ),
        ShapeSorterHandler,
    )

    url = (
        f"http://{args.host}:{args.port}/"
    )

    print()
    print(
        "ShapeDividers sorter"
    )
    print(
        "-------------------"
    )
    print(
        f"Watching: {NEW_DIR}"
    )
    print(
        f"Accepted: {DESTINATIONS['accepted']}"
    )
    print(
        f"Maybe: {DESTINATIONS['maybe']}"
    )
    print(
        f"Delete: {DESTINATIONS['delete']}"
    )
    print()
    print(
        f"Open: {url}"
    )
    print(
        "Press Ctrl+C to stop."
    )
    print()

    if not args.no_browser:
        threading.Thread(
            target=open_browser,
            args=(
                url,
            ),
            daemon=True,
        ).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print()
        print(
            "Stopping sorter."
        )
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
