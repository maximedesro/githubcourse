const list = document.querySelector("#list");
const emptyState = document.querySelector("#emptyState");
const count = document.querySelector("#count");
const selectedCount = document.querySelector("#selectedCount");
const sortButton = document.querySelector("#sortButton");
const refreshButton = document.querySelector("#refreshButton");
const statusToast = document.querySelector("#status");

const selections = new Map();
const zoomLevels = new Map();
let currentItems = [];
let refreshTimer = null;
let busy = false;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function selectedTotal() {
  let total = 0;

  for (const item of currentItems) {
    if (selections.has(item.name)) {
      total += 1;
    }
  }

  return total;
}

function updateSelectionUi() {
  const total = selectedTotal();
  selectedCount.textContent = String(total);
  sortButton.disabled = busy || total === 0;
}

function showStatus(message, timeout = 2800) {
  statusToast.textContent = message;
  statusToast.hidden = false;

  window.clearTimeout(showStatus.timer);
  showStatus.timer = window.setTimeout(() => {
    statusToast.hidden = true;
  }, timeout);
}

function render(items) {
  currentItems = items;

  const currentNames = new Set(
    items.map((item) => item.name),
  );

  for (const name of [...selections.keys()]) {
    if (!currentNames.has(name)) {
      selections.delete(name);
    }
  }

  for (const name of [...zoomLevels.keys()]) {
    if (!currentNames.has(name)) {
      zoomLevels.delete(name);
    }
  }

  count.textContent =
    `${items.length} image${items.length === 1 ? "" : "s"} in /new`;

  emptyState.hidden = items.length !== 0;

  list.innerHTML = items
    .map((item) => {
      const selected = selections.get(item.name) || "";
      const zoom = zoomLevels.get(item.name) || 1;
      const encodedName = encodeURIComponent(item.name);

      return `
        <section class="shapeRow" data-name="${escapeHtml(item.name)}">
          <div class="rowHeader">
            <div class="fileMeta">
              <div class="fileName" title="${escapeHtml(item.name)}">
                ${escapeHtml(item.name)}
              </div>
              <div class="modified">
                Modified ${escapeHtml(item.modified)}
              </div>
            </div>

            <div class="zoomBadge" data-zoom-badge="${encodedName}">
              ${zoom}×
            </div>

            <div class="choices" role="radiogroup" aria-label="Sort ${escapeHtml(item.name)}">
              ${choiceMarkup(item.name, "accepted", "Accepted", selected)}
              ${choiceMarkup(item.name, "maybe", "Maybe", selected)}
              ${choiceMarkup(item.name, "delete", "Delete", selected)}
            </div>
          </div>

          <div class="previewViewport">
            <div class="previewInner">
              <img
                class="previewImage"
                src="${escapeHtml(item.url)}"
                alt="${escapeHtml(item.name)}"
                loading="lazy"
                draggable="false"
                data-image-name="${escapeHtml(item.name)}"
                data-zoom="${zoom}"
                style="width: ${zoom * 100}%"
              >
            </div>
          </div>
        </section>
      `;
    })
    .join("");

  wireRows();
  updateSelectionUi();
}

function choiceMarkup(name, destination, label, selected) {
  const id =
    "choice-" +
    destination +
    "-" +
    btoa(unescape(encodeURIComponent(name)))
      .replaceAll("=", "")
      .replaceAll("/", "_")
      .replaceAll("+", "-");

  return `
    <label class="choice" data-destination="${destination}" for="${id}">
      <input
        id="${id}"
        type="radio"
        name="destination-${escapeHtml(name)}"
        value="${destination}"
        data-radio-name="${escapeHtml(name)}"
        ${selected === destination ? "checked" : ""}
      >
      <span>${label}</span>
    </label>
  `;
}

function wireRows() {
  for (const radio of document.querySelectorAll("[data-radio-name]")) {
    radio.addEventListener("change", () => {
      selections.set(
        radio.dataset.radioName,
        radio.value,
      );
      updateSelectionUi();
    });
  }

  for (const image of document.querySelectorAll("[data-image-name]")) {
    image.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();

        const name = image.dataset.imageName;
        let zoom = zoomLevels.get(name) || 1;

        if (event.deltaY < 0) {
          zoom = Math.min(4, zoom + 1);
        } else if (event.deltaY > 0) {
          zoom = Math.max(1, zoom - 1);
        }

        zoomLevels.set(name, zoom);
        image.dataset.zoom = String(zoom);
        image.style.width = `${zoom * 100}%`;

        const badge = document.querySelector(
          `[data-zoom-badge="${CSS.escape(encodeURIComponent(name))}"]`,
        );

        if (badge) {
          badge.textContent = `${zoom}×`;
        }
      },
      { passive: false },
    );
  }
}

async function fetchImages({ quiet = false } = {}) {
  if (busy) {
    return;
  }

  try {
    const response = await fetch(
      "/api/images",
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`,
      );
    }

    const payload = await response.json();
    render(payload.items || []);

    if (!quiet) {
      showStatus("Refreshed.");
    }
  } catch (error) {
    showStatus(
      `Could not refresh: ${error.message}`,
      5000,
    );
  }
}

async function sortSelected() {
  if (busy) {
    return;
  }

  const items = currentItems
    .filter((item) => selections.has(item.name))
    .map((item) => ({
      name: item.name,
      destination: selections.get(item.name),
    }));

  if (items.length === 0) {
    return;
  }

  busy = true;
  updateSelectionUi();
  sortButton.firstChild.textContent = "Sorting selected ";

  try {
    const response = await fetch(
      "/api/sort",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items }),
      },
    );

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(
        payload.error || `HTTP ${response.status}`,
      );
    }

    for (const moved of payload.moved || []) {
      selections.delete(moved.name);
      zoomLevels.delete(moved.name);
    }

    render(payload.items || []);

    const movedCount = (payload.moved || []).length;
    const errorCount = (payload.errors || []).length;

    if (errorCount) {
      showStatus(
        `Moved ${movedCount}. ${errorCount} failed — check the terminal.`,
        6000,
      );

      console.error(
        "Sort errors:",
        payload.errors,
      );
    } else {
      showStatus(
        `Moved ${movedCount} image${movedCount === 1 ? "" : "s"}.`,
      );
    }
  } catch (error) {
    showStatus(
      `Sort failed: ${error.message}`,
      6000,
    );
  } finally {
    busy = false;
    sortButton.firstChild.textContent = "Sort selected ";
    updateSelectionUi();
  }
}

sortButton.addEventListener(
  "click",
  sortSelected,
);

refreshButton.addEventListener(
  "click",
  () => fetchImages(),
);

// Auto-populate and keep the list in sync with /new. Existing choices and
// zoom levels are preserved by filename during refreshes.
fetchImages({ quiet: true });

refreshTimer = window.setInterval(
  () => {
    fetchImages({ quiet: true });
  },
  5000,
);
