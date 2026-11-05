// Pin library releases so CDN updates cannot silently change the creator.
const sdCdnAssets = new Map();
function loadShapeCdnAsset(type, url, marker) {
    if (!sdCdnAssets.has(url)) {
        sdCdnAssets.set(url, new Promise(resolve => {
            const asset = document.createElement(type === 'style' ? 'link' : 'script');
            if (type === 'style') {
                asset.rel = 'stylesheet';
                asset.href = url;
            } else {
                asset.src = url;
                asset.async = true;
            }
            asset.dataset[marker] = 'true';
            asset.onload = () => resolve(true);
            // A failed UI dependency must not prevent previewing or exporting.
            asset.onerror = () => resolve(false);
            document.head.appendChild(asset);
        }));
    }
    return sdCdnAssets.get(url);
}
let sdTooltipLibraryPromise;
function loadShapeTooltipLibrary() {
    if (!sdTooltipLibraryPromise) {
        const styles = loadShapeCdnAsset('style',
            'https://cdn.jsdelivr.net/npm/tippy.js@6.3.7/dist/tippy.css','sdTooltipStyles');
        const scripts = typeof window.tippy === 'function' ? Promise.resolve(true)
            : (window.Popper?.createPopper ? Promise.resolve(true) : loadShapeCdnAsset('script',
                'https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.8/dist/umd/popper.min.js','sdPopper'))
                .then(loaded => loaded && loadShapeCdnAsset('script',
                    'https://cdn.jsdelivr.net/npm/tippy.js@6.3.7/dist/tippy.umd.min.js','sdTooltips'));
        sdTooltipLibraryPromise = Promise.all([styles,scripts])
            .then(() => typeof window.tippy === 'function' ? window.tippy : null);
    }
    return sdTooltipLibraryPromise;
}
let sdChoicesLibraryPromise;
function loadShapeChoicesLibrary() {
    if (!sdChoicesLibraryPromise) {
        const styles = loadShapeCdnAsset('style',
            'https://cdn.jsdelivr.net/npm/choices.js@11.1.0/public/assets/styles/choices.min.css','sdChoicesStyles');
        const script = typeof window.Choices === 'function' ? Promise.resolve(true) : loadShapeCdnAsset('script',
            'https://cdn.jsdelivr.net/npm/choices.js@11.1.0/public/assets/scripts/choices.min.js','sdChoices');
        // Wait for the base CSS as well as the script before replacing selects.
        sdChoicesLibraryPromise = Promise.all([styles,script])
            .then(() => typeof window.Choices === 'function' ? window.Choices : null);
    }
    return sdChoicesLibraryPromise;
}

const SHAPE_DIVIDERS_LOADER_MARKUP = "<div id=\"sd-loader\" class=\"sd-loader\" role=\"status\" aria-live=\"polite\" aria-atomic=\"true\">\n  <div class=\"sd-loader__card\">\n    <div class=\"sd-loader__brand\"><span class=\"sd-loader__spark\" aria-hidden=\"true\">✳</span> ShapeDividers</div>\n    <div class=\"sd-loader__art\" aria-hidden=\"true\">\n      <svg viewBox=\"0 0 600 180\" preserveAspectRatio=\"none\"><path class=\"sd-loader__wave sd-loader__wave--back\" d=\"M-100 70Q50 0 200 70T500 70T800 70V220H-100Z\"/><path class=\"sd-loader__wave sd-loader__wave--mid\" d=\"M-100 95Q50 25 200 95T500 95T800 95V220H-100Z\"/><path class=\"sd-loader__wave sd-loader__wave--front\" d=\"M-100 120Q50 50 200 120T500 120T800 120V220H-100Z\"/></svg>\n      <span class=\"sd-loader__art-label\">GOOD THINGS TAKE SHAPE</span>\n    </div>\n    <span class=\"sd-loader__eyebrow\">YOUR NEXT GREAT DESIGN</span>\n    <h2 class=\"sd-loader__title\">Just taking shape.</h2>\n    <p class=\"sd-loader__message\" data-loader-message>Loading your shape library…</p>\n    <div class=\"sd-loader__track\" aria-hidden=\"true\"><span></span></div>\n    <ol class=\"sd-loader__steps\" aria-hidden=\"true\"><li class=\"is-active\">Library</li><li>Canvas</li><li>Ready</li></ol>\n    <button class=\"sd-loader__retry\" type=\"button\" hidden>Try again</button>\n  </div>\n</div>";

function getShapeDividersLoader() {
    let loader = document.getElementById('sd-loader');
    if (!loader) {
        document.body.insertAdjacentHTML('beforeend', SHAPE_DIVIDERS_LOADER_MARKUP);
        loader = document.getElementById('sd-loader');
    }
    return loader;
}

function setShapeDividersLoadingStage(stage, message) {
    const loader = getShapeDividersLoader();
    loader.querySelector('[data-loader-message]').textContent = message;
    loader.querySelectorAll('.sd-loader__steps li').forEach((step, index) => {
        step.classList.toggle('is-active', index === stage);
        step.classList.toggle('is-complete', index < stage);
    });
}

function finishShapeDividersLoading() {
    const loader = getShapeDividersLoader();
    setShapeDividersLoadingStage(2, 'Your canvas is ready.');
    document.body.classList.remove('sd-is-loading');
    document.getElementById('shape-divider-tool')?.removeAttribute('aria-busy');
    loader.classList.add('is-leaving');
    // Keep a timeout fallback for reduced motion and background tabs.
    const remove = () => loader.remove();
    loader.addEventListener('transitionend', (event) => {
        if (event.target === loader) remove();
    }, { once: true });
    window.setTimeout(remove, 500);
}

function failShapeDividersLoading(error) {
    const loader = getShapeDividersLoader();
    loader.classList.add('has-error');
    loader.querySelector('.sd-loader__title').textContent = 'A small pause in the flow.';
    loader.querySelector('[data-loader-message]').textContent =
        'We couldn’t finish loading the creator. Please check your connection and try again.';
    const retry = loader.querySelector('.sd-loader__retry');
    retry.hidden = false;
    retry.onclick = () => window.location.reload();
    console.error('ShapeDividers failed to initialize:', error);
}

async function paintShapeDividersLoader() {
    if (document.hidden) return;
    await new Promise((resolve) => requestAnimationFrame(() => {
        window.setTimeout(resolve, 0);
    }));
}

function prepareShapeDividerSvgs(shapes) {
    const alignment = {
        top: 'xMidYMax slice',
        right: 'xMinYMid slice',
        bottom: 'xMidYMin slice',
        left: 'xMaxYMid slice'
    };

    shapes.forEach((shape) => {
        const preservesRatio =
            String(shape.ratio).trim().toUpperCase() === 'TRUE';

        Object.entries(alignment).forEach(([direction, alignmentValue]) => {
            if (typeof shape[direction] !== 'string') return;

            let svgMarkup = shape[direction];

            // Join sheet overflow columns before inspecting or rendering the SVG.
            // A complete SVG may already have been joined by the data exporter
            // or an earlier preparation pass; do not append its chunks twice.
            if (!/<\/svg>\s*$/i.test(svgMarkup)) {
                const extraColumns = Object.keys(shape)
                    .map((key) => {
                        const match = key.match(/^extra(\d*)-(top|right|bottom|left)$/);
                        if (!match || match[2] !== direction) return null;

                        return {
                            key,
                            part: Number(match[1] || 1)
                        };
                    })
                    .filter((column) =>
                        column &&
                        column.part >= 1 &&
                        typeof shape[column.key] === 'string'
                    )
                    .sort((a, b) => a.part - b.part);

                svgMarkup += extraColumns
                    .map((column) => shape[column.key])
                    .join('');
            }

            const value = preservesRatio ? alignmentValue : 'none';
            shape[direction] = svgMarkup.replace(
                /<svg\b[^>]*>/i,
                (rootTag) => rootTag
                    .replace(
                        /\s+preserveAspectRatio\s*=\s*(?:"[^"]*"|'[^']*')/gi,
                        ''
                    )
                    .replace(
                        /^<svg\b/i,
                        '<svg preserveAspectRatio="' + value + '"'
                    )
            );
        });
    });
}

// Retained Motion Lab recipes: light / Natural / Strong. @ID@ and @USE@
// bind each pass to the previous pass; repeated displacement maps are interned.
// These are SVG/CSS templates only, with no animation scripts in exported code.
const SD_MOTION_IMAGES = ["data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221200%22%20height%3D%22320%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22w%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%221%22%20gradientUnits%3D%22objectBoundingBox%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22white%22%2F%3E%3Cstop%20offset%3D%2238%25%22%20stop-color%3D%22white%22%2F%3E%3Cstop%20offset%3D%2292.5%25%22%20stop-color%3D%22white%22%20stop-opacity%3D%220%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22white%22%20stop-opacity%3D%220%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%221200%22%20height%3D%22320%22%20fill%3D%22url%28%23w%29%22%2F%3E%3C%2Fsvg%3E", "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221200%22%20height%3D%22320%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22s%22%3E%3Cstop%20offset%3D%220.00000%22%20stop-color%3D%22rgb%2850%25%2C50.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.03125%22%20stop-color%3D%22rgb%2850%25%2C59.36434%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.06250%22%20stop-color%3D%22rgb%2850%25%2C68.36880%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.09375%22%20stop-color%3D%22rgb%2850%25%2C76.66737%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.12500%22%20stop-color%3D%22rgb%2850%25%2C83.94113%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.15625%22%20stop-color%3D%22rgb%2850%25%2C89.91054%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.18750%22%20stop-color%3D%22rgb%2850%25%2C94.34622%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.21875%22%20stop-color%3D%22rgb%2850%25%2C97.07769%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.25000%22%20stop-color%3D%22rgb%2850%25%2C98.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.28125%22%20stop-color%3D%22rgb%2850%25%2C97.07769%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.31250%22%20stop-color%3D%22rgb%2850%25%2C94.34622%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.34375%22%20stop-color%3D%22rgb%2850%25%2C89.91054%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.37500%22%20stop-color%3D%22rgb%2850%25%2C83.94113%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.40625%22%20stop-color%3D%22rgb%2850%25%2C76.66737%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.43750%22%20stop-color%3D%22rgb%2850%25%2C68.36880%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.46875%22%20stop-color%3D%22rgb%2850%25%2C59.36434%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.50000%22%20stop-color%3D%22rgb%2850%25%2C50.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.53125%22%20stop-color%3D%22rgb%2850%25%2C40.63566%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.56250%22%20stop-color%3D%22rgb%2850%25%2C31.63120%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.59375%22%20stop-color%3D%22rgb%2850%25%2C23.33263%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.62500%22%20stop-color%3D%22rgb%2850%25%2C16.05887%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.65625%22%20stop-color%3D%22rgb%2850%25%2C10.08946%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.68750%22%20stop-color%3D%22rgb%2850%25%2C5.65378%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.71875%22%20stop-color%3D%22rgb%2850%25%2C2.92231%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.75000%22%20stop-color%3D%22rgb%2850%25%2C2.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.78125%22%20stop-color%3D%22rgb%2850%25%2C2.92231%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.81250%22%20stop-color%3D%22rgb%2850%25%2C5.65378%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.84375%22%20stop-color%3D%22rgb%2850%25%2C10.08946%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.87500%22%20stop-color%3D%22rgb%2850%25%2C16.05887%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.90625%22%20stop-color%3D%22rgb%2850%25%2C23.33263%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.93750%22%20stop-color%3D%22rgb%2850%25%2C31.63120%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.96875%22%20stop-color%3D%22rgb%2850%25%2C40.63566%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%221.00000%22%20stop-color%3D%22rgb%2850%25%2C50.00000%25%2C50%25%29%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%221200%22%20height%3D%22320%22%20fill%3D%22url%28%23s%29%22%2F%3E%3C%2Fsvg%3E", "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221200%22%20height%3D%22320%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22s%22%3E%3Cstop%20offset%3D%220.0000000%22%20stop-color%3D%22rgb%2850%25%2C50.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0208333%22%20stop-color%3D%22rgb%2850%25%2C56.26526%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0416667%22%20stop-color%3D%22rgb%2850%25%2C62.42331%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0625000%22%20stop-color%3D%22rgb%2850%25%2C68.36880%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0833333%22%20stop-color%3D%22rgb%2850%25%2C74.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1041667%22%20stop-color%3D%22rgb%2850%25%2C79.22055%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1250000%22%20stop-color%3D%22rgb%2850%25%2C83.94113%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1458333%22%20stop-color%3D%22rgb%2850%25%2C88.08096%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1666667%22%20stop-color%3D%22rgb%2850%25%2C91.56922%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1875000%22%20stop-color%3D%22rgb%2850%25%2C94.34622%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2083333%22%20stop-color%3D%22rgb%2850%25%2C96.36444%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2291667%22%20stop-color%3D%22rgb%2850%25%2C97.58935%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2500000%22%20stop-color%3D%22rgb%2850%25%2C98.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2708333%22%20stop-color%3D%22rgb%2850%25%2C97.58935%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2916667%22%20stop-color%3D%22rgb%2850%25%2C96.36444%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3125000%22%20stop-color%3D%22rgb%2850%25%2C94.34622%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3333333%22%20stop-color%3D%22rgb%2850%25%2C91.56922%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3541667%22%20stop-color%3D%22rgb%2850%25%2C88.08096%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3750000%22%20stop-color%3D%22rgb%2850%25%2C83.94113%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3958333%22%20stop-color%3D%22rgb%2850%25%2C79.22055%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4166667%22%20stop-color%3D%22rgb%2850%25%2C74.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4375000%22%20stop-color%3D%22rgb%2850%25%2C68.36880%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4583333%22%20stop-color%3D%22rgb%2850%25%2C62.42331%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4791667%22%20stop-color%3D%22rgb%2850%25%2C56.26526%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5000000%22%20stop-color%3D%22rgb%2850%25%2C50.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5208333%22%20stop-color%3D%22rgb%2850%25%2C43.73474%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5416667%22%20stop-color%3D%22rgb%2850%25%2C37.57669%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5625000%22%20stop-color%3D%22rgb%2850%25%2C31.63120%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5833333%22%20stop-color%3D%22rgb%2850%25%2C26.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6041667%22%20stop-color%3D%22rgb%2850%25%2C20.77945%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6250000%22%20stop-color%3D%22rgb%2850%25%2C16.05887%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6458333%22%20stop-color%3D%22rgb%2850%25%2C11.91904%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6666667%22%20stop-color%3D%22rgb%2850%25%2C8.43078%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6875000%22%20stop-color%3D%22rgb%2850%25%2C5.65378%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7083333%22%20stop-color%3D%22rgb%2850%25%2C3.63556%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7291667%22%20stop-color%3D%22rgb%2850%25%2C2.41065%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7500000%22%20stop-color%3D%22rgb%2850%25%2C2.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7708333%22%20stop-color%3D%22rgb%2850%25%2C2.41065%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7916667%22%20stop-color%3D%22rgb%2850%25%2C3.63556%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8125000%22%20stop-color%3D%22rgb%2850%25%2C5.65378%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8333333%22%20stop-color%3D%22rgb%2850%25%2C8.43078%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8541667%22%20stop-color%3D%22rgb%2850%25%2C11.91904%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8750000%22%20stop-color%3D%22rgb%2850%25%2C16.05887%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8958333%22%20stop-color%3D%22rgb%2850%25%2C20.77945%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9166667%22%20stop-color%3D%22rgb%2850%25%2C26.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9375000%22%20stop-color%3D%22rgb%2850%25%2C31.63120%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9583333%22%20stop-color%3D%22rgb%2850%25%2C37.57669%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9791667%22%20stop-color%3D%22rgb%2850%25%2C43.73474%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%221.0000000%22%20stop-color%3D%22rgb%2850%25%2C50.00000%25%2C50%25%29%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%221200%22%20height%3D%22320%22%20fill%3D%22url%28%23s%29%22%2F%3E%3C%2Fsvg%3E", "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221200%22%20height%3D%22320%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22s%22%3E%3Cstop%20offset%3D%220.0000000%22%20stop-color%3D%22rgb%2850%25%2C50.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0041667%22%20stop-color%3D%22rgb%2850%25%2C56.26526%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0083333%22%20stop-color%3D%22rgb%2850%25%2C62.42331%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0125000%22%20stop-color%3D%22rgb%2850%25%2C68.36880%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0166667%22%20stop-color%3D%22rgb%2850%25%2C74.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0208333%22%20stop-color%3D%22rgb%2850%25%2C79.22055%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0250000%22%20stop-color%3D%22rgb%2850%25%2C83.94113%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0291667%22%20stop-color%3D%22rgb%2850%25%2C88.08096%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0333333%22%20stop-color%3D%22rgb%2850%25%2C91.56922%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0375000%22%20stop-color%3D%22rgb%2850%25%2C94.34622%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0416667%22%20stop-color%3D%22rgb%2850%25%2C96.36444%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0458333%22%20stop-color%3D%22rgb%2850%25%2C97.58935%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0500000%22%20stop-color%3D%22rgb%2850%25%2C98.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0541667%22%20stop-color%3D%22rgb%2850%25%2C97.58935%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0583333%22%20stop-color%3D%22rgb%2850%25%2C96.36444%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0625000%22%20stop-color%3D%22rgb%2850%25%2C94.34622%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0666667%22%20stop-color%3D%22rgb%2850%25%2C91.56922%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0708333%22%20stop-color%3D%22rgb%2850%25%2C88.08096%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0750000%22%20stop-color%3D%22rgb%2850%25%2C83.94113%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0791667%22%20stop-color%3D%22rgb%2850%25%2C79.22055%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0833333%22%20stop-color%3D%22rgb%2850%25%2C74.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0875000%22%20stop-color%3D%22rgb%2850%25%2C68.36880%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0916667%22%20stop-color%3D%22rgb%2850%25%2C62.42331%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0958333%22%20stop-color%3D%22rgb%2850%25%2C56.26526%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1000000%22%20stop-color%3D%22rgb%2850%25%2C50.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1041667%22%20stop-color%3D%22rgb%2850%25%2C43.73474%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1083333%22%20stop-color%3D%22rgb%2850%25%2C37.57669%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1125000%22%20stop-color%3D%22rgb%2850%25%2C31.63120%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1166667%22%20stop-color%3D%22rgb%2850%25%2C26.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1208333%22%20stop-color%3D%22rgb%2850%25%2C20.77945%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1250000%22%20stop-color%3D%22rgb%2850%25%2C16.05887%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1291667%22%20stop-color%3D%22rgb%2850%25%2C11.91904%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1333333%22%20stop-color%3D%22rgb%2850%25%2C8.43078%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1375000%22%20stop-color%3D%22rgb%2850%25%2C5.65378%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1416667%22%20stop-color%3D%22rgb%2850%25%2C3.63556%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1458333%22%20stop-color%3D%22rgb%2850%25%2C2.41065%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1500000%22%20stop-color%3D%22rgb%2850%25%2C2.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1541667%22%20stop-color%3D%22rgb%2850%25%2C2.41065%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1583333%22%20stop-color%3D%22rgb%2850%25%2C3.63556%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1625000%22%20stop-color%3D%22rgb%2850%25%2C5.65378%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1666667%22%20stop-color%3D%22rgb%2850%25%2C8.43078%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1708333%22%20stop-color%3D%22rgb%2850%25%2C11.91904%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1750000%22%20stop-color%3D%22rgb%2850%25%2C16.05887%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1791667%22%20stop-color%3D%22rgb%2850%25%2C20.77945%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1833333%22%20stop-color%3D%22rgb%2850%25%2C26.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1875000%22%20stop-color%3D%22rgb%2850%25%2C31.63120%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1916667%22%20stop-color%3D%22rgb%2850%25%2C37.57669%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1958333%22%20stop-color%3D%22rgb%2850%25%2C43.73474%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2000000%22%20stop-color%3D%22rgb%2850%25%2C50.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2041667%22%20stop-color%3D%22rgb%2850%25%2C56.26526%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2083333%22%20stop-color%3D%22rgb%2850%25%2C62.42331%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2125000%22%20stop-color%3D%22rgb%2850%25%2C68.36880%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2166667%22%20stop-color%3D%22rgb%2850%25%2C74.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2208333%22%20stop-color%3D%22rgb%2850%25%2C79.22055%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2250000%22%20stop-color%3D%22rgb%2850%25%2C83.94113%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2291667%22%20stop-color%3D%22rgb%2850%25%2C88.08096%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2333333%22%20stop-color%3D%22rgb%2850%25%2C91.56922%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2375000%22%20stop-color%3D%22rgb%2850%25%2C94.34622%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2416667%22%20stop-color%3D%22rgb%2850%25%2C96.36444%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2458333%22%20stop-color%3D%22rgb%2850%25%2C97.58935%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2500000%22%20stop-color%3D%22rgb%2850%25%2C98.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2541667%22%20stop-color%3D%22rgb%2850%25%2C97.58935%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2583333%22%20stop-color%3D%22rgb%2850%25%2C96.36444%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2625000%22%20stop-color%3D%22rgb%2850%25%2C94.34622%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2666667%22%20stop-color%3D%22rgb%2850%25%2C91.56922%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2708333%22%20stop-color%3D%22rgb%2850%25%2C88.08096%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2750000%22%20stop-color%3D%22rgb%2850%25%2C83.94113%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2791667%22%20stop-color%3D%22rgb%2850%25%2C79.22055%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2833333%22%20stop-color%3D%22rgb%2850%25%2C74.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2875000%22%20stop-color%3D%22rgb%2850%25%2C68.36880%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2916667%22%20stop-color%3D%22rgb%2850%25%2C62.42331%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2958333%22%20stop-color%3D%22rgb%2850%25%2C56.26526%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3000000%22%20stop-color%3D%22rgb%2850%25%2C50.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3041667%22%20stop-color%3D%22rgb%2850%25%2C43.73474%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3083333%22%20stop-color%3D%22rgb%2850%25%2C37.57669%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3125000%22%20stop-color%3D%22rgb%2850%25%2C31.63120%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3166667%22%20stop-color%3D%22rgb%2850%25%2C26.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3208333%22%20stop-color%3D%22rgb%2850%25%2C20.77945%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3250000%22%20stop-color%3D%22rgb%2850%25%2C16.05887%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3291667%22%20stop-color%3D%22rgb%2850%25%2C11.91904%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3333333%22%20stop-color%3D%22rgb%2850%25%2C8.43078%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3375000%22%20stop-color%3D%22rgb%2850%25%2C5.65378%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3416667%22%20stop-color%3D%22rgb%2850%25%2C3.63556%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3458333%22%20stop-color%3D%22rgb%2850%25%2C2.41065%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3500000%22%20stop-color%3D%22rgb%2850%25%2C2.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3541667%22%20stop-color%3D%22rgb%2850%25%2C2.41065%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3583333%22%20stop-color%3D%22rgb%2850%25%2C3.63556%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3625000%22%20stop-color%3D%22rgb%2850%25%2C5.65378%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3666667%22%20stop-color%3D%22rgb%2850%25%2C8.43078%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3708333%22%20stop-color%3D%22rgb%2850%25%2C11.91904%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3750000%22%20stop-color%3D%22rgb%2850%25%2C16.05887%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3791667%22%20stop-color%3D%22rgb%2850%25%2C20.77945%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3833333%22%20stop-color%3D%22rgb%2850%25%2C26.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3875000%22%20stop-color%3D%22rgb%2850%25%2C31.63120%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3916667%22%20stop-color%3D%22rgb%2850%25%2C37.57669%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3958333%22%20stop-color%3D%22rgb%2850%25%2C43.73474%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4000000%22%20stop-color%3D%22rgb%2850%25%2C50.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4041667%22%20stop-color%3D%22rgb%2850%25%2C56.26526%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4083333%22%20stop-color%3D%22rgb%2850%25%2C62.42331%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4125000%22%20stop-color%3D%22rgb%2850%25%2C68.36880%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4166667%22%20stop-color%3D%22rgb%2850%25%2C74.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4208333%22%20stop-color%3D%22rgb%2850%25%2C79.22055%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4250000%22%20stop-color%3D%22rgb%2850%25%2C83.94113%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4291667%22%20stop-color%3D%22rgb%2850%25%2C88.08096%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4333333%22%20stop-color%3D%22rgb%2850%25%2C91.56922%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4375000%22%20stop-color%3D%22rgb%2850%25%2C94.34622%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4416667%22%20stop-color%3D%22rgb%2850%25%2C96.36444%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4458333%22%20stop-color%3D%22rgb%2850%25%2C97.58935%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4500000%22%20stop-color%3D%22rgb%2850%25%2C98.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4541667%22%20stop-color%3D%22rgb%2850%25%2C97.58935%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4583333%22%20stop-color%3D%22rgb%2850%25%2C96.36444%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4625000%22%20stop-color%3D%22rgb%2850%25%2C94.34622%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4666667%22%20stop-color%3D%22rgb%2850%25%2C91.56922%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4708333%22%20stop-color%3D%22rgb%2850%25%2C88.08096%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4750000%22%20stop-color%3D%22rgb%2850%25%2C83.94113%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4791667%22%20stop-color%3D%22rgb%2850%25%2C79.22055%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4833333%22%20stop-color%3D%22rgb%2850%25%2C74.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4875000%22%20stop-color%3D%22rgb%2850%25%2C68.36880%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4916667%22%20stop-color%3D%22rgb%2850%25%2C62.42331%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4958333%22%20stop-color%3D%22rgb%2850%25%2C56.26526%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5000000%22%20stop-color%3D%22rgb%2850%25%2C50.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5041667%22%20stop-color%3D%22rgb%2850%25%2C43.73474%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5083333%22%20stop-color%3D%22rgb%2850%25%2C37.57669%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5125000%22%20stop-color%3D%22rgb%2850%25%2C31.63120%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5166667%22%20stop-color%3D%22rgb%2850%25%2C26.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5208333%22%20stop-color%3D%22rgb%2850%25%2C20.77945%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5250000%22%20stop-color%3D%22rgb%2850%25%2C16.05887%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5291667%22%20stop-color%3D%22rgb%2850%25%2C11.91904%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5333333%22%20stop-color%3D%22rgb%2850%25%2C8.43078%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5375000%22%20stop-color%3D%22rgb%2850%25%2C5.65378%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5416667%22%20stop-color%3D%22rgb%2850%25%2C3.63556%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5458333%22%20stop-color%3D%22rgb%2850%25%2C2.41065%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5500000%22%20stop-color%3D%22rgb%2850%25%2C2.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5541667%22%20stop-color%3D%22rgb%2850%25%2C2.41065%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5583333%22%20stop-color%3D%22rgb%2850%25%2C3.63556%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5625000%22%20stop-color%3D%22rgb%2850%25%2C5.65378%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5666667%22%20stop-color%3D%22rgb%2850%25%2C8.43078%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5708333%22%20stop-color%3D%22rgb%2850%25%2C11.91904%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5750000%22%20stop-color%3D%22rgb%2850%25%2C16.05887%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5791667%22%20stop-color%3D%22rgb%2850%25%2C20.77945%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5833333%22%20stop-color%3D%22rgb%2850%25%2C26.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5875000%22%20stop-color%3D%22rgb%2850%25%2C31.63120%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5916667%22%20stop-color%3D%22rgb%2850%25%2C37.57669%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5958333%22%20stop-color%3D%22rgb%2850%25%2C43.73474%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6000000%22%20stop-color%3D%22rgb%2850%25%2C50.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6041667%22%20stop-color%3D%22rgb%2850%25%2C56.26526%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6083333%22%20stop-color%3D%22rgb%2850%25%2C62.42331%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6125000%22%20stop-color%3D%22rgb%2850%25%2C68.36880%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6166667%22%20stop-color%3D%22rgb%2850%25%2C74.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6208333%22%20stop-color%3D%22rgb%2850%25%2C79.22055%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6250000%22%20stop-color%3D%22rgb%2850%25%2C83.94113%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6291667%22%20stop-color%3D%22rgb%2850%25%2C88.08096%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6333333%22%20stop-color%3D%22rgb%2850%25%2C91.56922%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6375000%22%20stop-color%3D%22rgb%2850%25%2C94.34622%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6416667%22%20stop-color%3D%22rgb%2850%25%2C96.36444%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6458333%22%20stop-color%3D%22rgb%2850%25%2C97.58935%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6500000%22%20stop-color%3D%22rgb%2850%25%2C98.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6541667%22%20stop-color%3D%22rgb%2850%25%2C97.58935%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6583333%22%20stop-color%3D%22rgb%2850%25%2C96.36444%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6625000%22%20stop-color%3D%22rgb%2850%25%2C94.34622%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6666667%22%20stop-color%3D%22rgb%2850%25%2C91.56922%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6708333%22%20stop-color%3D%22rgb%2850%25%2C88.08096%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6750000%22%20stop-color%3D%22rgb%2850%25%2C83.94113%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6791667%22%20stop-color%3D%22rgb%2850%25%2C79.22055%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6833333%22%20stop-color%3D%22rgb%2850%25%2C74.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6875000%22%20stop-color%3D%22rgb%2850%25%2C68.36880%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6916667%22%20stop-color%3D%22rgb%2850%25%2C62.42331%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6958333%22%20stop-color%3D%22rgb%2850%25%2C56.26526%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7000000%22%20stop-color%3D%22rgb%2850%25%2C50.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7041667%22%20stop-color%3D%22rgb%2850%25%2C43.73474%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7083333%22%20stop-color%3D%22rgb%2850%25%2C37.57669%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7125000%22%20stop-color%3D%22rgb%2850%25%2C31.63120%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7166667%22%20stop-color%3D%22rgb%2850%25%2C26.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7208333%22%20stop-color%3D%22rgb%2850%25%2C20.77945%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7250000%22%20stop-color%3D%22rgb%2850%25%2C16.05887%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7291667%22%20stop-color%3D%22rgb%2850%25%2C11.91904%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7333333%22%20stop-color%3D%22rgb%2850%25%2C8.43078%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7375000%22%20stop-color%3D%22rgb%2850%25%2C5.65378%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7416667%22%20stop-color%3D%22rgb%2850%25%2C3.63556%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7458333%22%20stop-color%3D%22rgb%2850%25%2C2.41065%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7500000%22%20stop-color%3D%22rgb%2850%25%2C2.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7541667%22%20stop-color%3D%22rgb%2850%25%2C2.41065%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7583333%22%20stop-color%3D%22rgb%2850%25%2C3.63556%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7625000%22%20stop-color%3D%22rgb%2850%25%2C5.65378%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7666667%22%20stop-color%3D%22rgb%2850%25%2C8.43078%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7708333%22%20stop-color%3D%22rgb%2850%25%2C11.91904%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7750000%22%20stop-color%3D%22rgb%2850%25%2C16.05887%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7791667%22%20stop-color%3D%22rgb%2850%25%2C20.77945%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7833333%22%20stop-color%3D%22rgb%2850%25%2C26.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7875000%22%20stop-color%3D%22rgb%2850%25%2C31.63120%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7916667%22%20stop-color%3D%22rgb%2850%25%2C37.57669%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7958333%22%20stop-color%3D%22rgb%2850%25%2C43.73474%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8000000%22%20stop-color%3D%22rgb%2850%25%2C50.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8041667%22%20stop-color%3D%22rgb%2850%25%2C56.26526%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8083333%22%20stop-color%3D%22rgb%2850%25%2C62.42331%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8125000%22%20stop-color%3D%22rgb%2850%25%2C68.36880%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8166667%22%20stop-color%3D%22rgb%2850%25%2C74.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8208333%22%20stop-color%3D%22rgb%2850%25%2C79.22055%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8250000%22%20stop-color%3D%22rgb%2850%25%2C83.94113%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8291667%22%20stop-color%3D%22rgb%2850%25%2C88.08096%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8333333%22%20stop-color%3D%22rgb%2850%25%2C91.56922%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8375000%22%20stop-color%3D%22rgb%2850%25%2C94.34622%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8416667%22%20stop-color%3D%22rgb%2850%25%2C96.36444%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8458333%22%20stop-color%3D%22rgb%2850%25%2C97.58935%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8500000%22%20stop-color%3D%22rgb%2850%25%2C98.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8541667%22%20stop-color%3D%22rgb%2850%25%2C97.58935%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8583333%22%20stop-color%3D%22rgb%2850%25%2C96.36444%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8625000%22%20stop-color%3D%22rgb%2850%25%2C94.34622%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8666667%22%20stop-color%3D%22rgb%2850%25%2C91.56922%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8708333%22%20stop-color%3D%22rgb%2850%25%2C88.08096%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8750000%22%20stop-color%3D%22rgb%2850%25%2C83.94113%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8791667%22%20stop-color%3D%22rgb%2850%25%2C79.22055%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8833333%22%20stop-color%3D%22rgb%2850%25%2C74.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8875000%22%20stop-color%3D%22rgb%2850%25%2C68.36880%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8916667%22%20stop-color%3D%22rgb%2850%25%2C62.42331%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8958333%22%20stop-color%3D%22rgb%2850%25%2C56.26526%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9000000%22%20stop-color%3D%22rgb%2850%25%2C50.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9041667%22%20stop-color%3D%22rgb%2850%25%2C43.73474%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9083333%22%20stop-color%3D%22rgb%2850%25%2C37.57669%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9125000%22%20stop-color%3D%22rgb%2850%25%2C31.63120%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9166667%22%20stop-color%3D%22rgb%2850%25%2C26.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9208333%22%20stop-color%3D%22rgb%2850%25%2C20.77945%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9250000%22%20stop-color%3D%22rgb%2850%25%2C16.05887%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9291667%22%20stop-color%3D%22rgb%2850%25%2C11.91904%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9333333%22%20stop-color%3D%22rgb%2850%25%2C8.43078%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9375000%22%20stop-color%3D%22rgb%2850%25%2C5.65378%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9416667%22%20stop-color%3D%22rgb%2850%25%2C3.63556%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9458333%22%20stop-color%3D%22rgb%2850%25%2C2.41065%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9500000%22%20stop-color%3D%22rgb%2850%25%2C2.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9541667%22%20stop-color%3D%22rgb%2850%25%2C2.41065%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9583333%22%20stop-color%3D%22rgb%2850%25%2C3.63556%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9625000%22%20stop-color%3D%22rgb%2850%25%2C5.65378%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9666667%22%20stop-color%3D%22rgb%2850%25%2C8.43078%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9708333%22%20stop-color%3D%22rgb%2850%25%2C11.91904%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9750000%22%20stop-color%3D%22rgb%2850%25%2C16.05887%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9791667%22%20stop-color%3D%22rgb%2850%25%2C20.77945%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9833333%22%20stop-color%3D%22rgb%2850%25%2C26.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9875000%22%20stop-color%3D%22rgb%2850%25%2C31.63120%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9916667%22%20stop-color%3D%22rgb%2850%25%2C37.57669%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9958333%22%20stop-color%3D%22rgb%2850%25%2C43.73474%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%221.0000000%22%20stop-color%3D%22rgb%2850%25%2C50.00000%25%2C50%25%29%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%221200%22%20height%3D%22320%22%20fill%3D%22url%28%23s%29%22%2F%3E%3C%2Fsvg%3E", "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221200%22%20height%3D%22320%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22s%22%3E%3Cstop%20offset%3D%220.0000000%22%20stop-color%3D%22rgb%2850%25%2C50.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0104167%22%20stop-color%3D%22rgb%2850%25%2C56.26526%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0208333%22%20stop-color%3D%22rgb%2850%25%2C62.42331%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0312500%22%20stop-color%3D%22rgb%2850%25%2C68.36880%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0416667%22%20stop-color%3D%22rgb%2850%25%2C74.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0520833%22%20stop-color%3D%22rgb%2850%25%2C79.22055%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0625000%22%20stop-color%3D%22rgb%2850%25%2C83.94113%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0729167%22%20stop-color%3D%22rgb%2850%25%2C88.08096%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0833333%22%20stop-color%3D%22rgb%2850%25%2C91.56922%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.0937500%22%20stop-color%3D%22rgb%2850%25%2C94.34622%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1041667%22%20stop-color%3D%22rgb%2850%25%2C96.36444%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1145833%22%20stop-color%3D%22rgb%2850%25%2C97.58935%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1250000%22%20stop-color%3D%22rgb%2850%25%2C98.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1354167%22%20stop-color%3D%22rgb%2850%25%2C97.58935%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1458333%22%20stop-color%3D%22rgb%2850%25%2C96.36444%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1562500%22%20stop-color%3D%22rgb%2850%25%2C94.34622%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1666667%22%20stop-color%3D%22rgb%2850%25%2C91.56922%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1770833%22%20stop-color%3D%22rgb%2850%25%2C88.08096%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1875000%22%20stop-color%3D%22rgb%2850%25%2C83.94113%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.1979167%22%20stop-color%3D%22rgb%2850%25%2C79.22055%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2083333%22%20stop-color%3D%22rgb%2850%25%2C74.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2187500%22%20stop-color%3D%22rgb%2850%25%2C68.36880%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2291667%22%20stop-color%3D%22rgb%2850%25%2C62.42331%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2395833%22%20stop-color%3D%22rgb%2850%25%2C56.26526%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2500000%22%20stop-color%3D%22rgb%2850%25%2C50.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2604167%22%20stop-color%3D%22rgb%2850%25%2C43.73474%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2708333%22%20stop-color%3D%22rgb%2850%25%2C37.57669%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2812500%22%20stop-color%3D%22rgb%2850%25%2C31.63120%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.2916667%22%20stop-color%3D%22rgb%2850%25%2C26.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3020833%22%20stop-color%3D%22rgb%2850%25%2C20.77945%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3125000%22%20stop-color%3D%22rgb%2850%25%2C16.05887%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3229167%22%20stop-color%3D%22rgb%2850%25%2C11.91904%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3333333%22%20stop-color%3D%22rgb%2850%25%2C8.43078%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3437500%22%20stop-color%3D%22rgb%2850%25%2C5.65378%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3541667%22%20stop-color%3D%22rgb%2850%25%2C3.63556%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3645833%22%20stop-color%3D%22rgb%2850%25%2C2.41065%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3750000%22%20stop-color%3D%22rgb%2850%25%2C2.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3854167%22%20stop-color%3D%22rgb%2850%25%2C2.41065%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.3958333%22%20stop-color%3D%22rgb%2850%25%2C3.63556%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4062500%22%20stop-color%3D%22rgb%2850%25%2C5.65378%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4166667%22%20stop-color%3D%22rgb%2850%25%2C8.43078%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4270833%22%20stop-color%3D%22rgb%2850%25%2C11.91904%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4375000%22%20stop-color%3D%22rgb%2850%25%2C16.05887%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4479167%22%20stop-color%3D%22rgb%2850%25%2C20.77945%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4583333%22%20stop-color%3D%22rgb%2850%25%2C26.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4687500%22%20stop-color%3D%22rgb%2850%25%2C31.63120%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4791667%22%20stop-color%3D%22rgb%2850%25%2C37.57669%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.4895833%22%20stop-color%3D%22rgb%2850%25%2C43.73474%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5000000%22%20stop-color%3D%22rgb%2850%25%2C50.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5104167%22%20stop-color%3D%22rgb%2850%25%2C56.26526%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5208333%22%20stop-color%3D%22rgb%2850%25%2C62.42331%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5312500%22%20stop-color%3D%22rgb%2850%25%2C68.36880%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5416667%22%20stop-color%3D%22rgb%2850%25%2C74.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5520833%22%20stop-color%3D%22rgb%2850%25%2C79.22055%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5625000%22%20stop-color%3D%22rgb%2850%25%2C83.94113%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5729167%22%20stop-color%3D%22rgb%2850%25%2C88.08096%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5833333%22%20stop-color%3D%22rgb%2850%25%2C91.56922%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.5937500%22%20stop-color%3D%22rgb%2850%25%2C94.34622%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6041667%22%20stop-color%3D%22rgb%2850%25%2C96.36444%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6145833%22%20stop-color%3D%22rgb%2850%25%2C97.58935%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6250000%22%20stop-color%3D%22rgb%2850%25%2C98.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6354167%22%20stop-color%3D%22rgb%2850%25%2C97.58935%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6458333%22%20stop-color%3D%22rgb%2850%25%2C96.36444%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6562500%22%20stop-color%3D%22rgb%2850%25%2C94.34622%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6666667%22%20stop-color%3D%22rgb%2850%25%2C91.56922%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6770833%22%20stop-color%3D%22rgb%2850%25%2C88.08096%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6875000%22%20stop-color%3D%22rgb%2850%25%2C83.94113%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.6979167%22%20stop-color%3D%22rgb%2850%25%2C79.22055%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7083333%22%20stop-color%3D%22rgb%2850%25%2C74.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7187500%22%20stop-color%3D%22rgb%2850%25%2C68.36880%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7291667%22%20stop-color%3D%22rgb%2850%25%2C62.42331%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7395833%22%20stop-color%3D%22rgb%2850%25%2C56.26526%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7500000%22%20stop-color%3D%22rgb%2850%25%2C50.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7604167%22%20stop-color%3D%22rgb%2850%25%2C43.73474%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7708333%22%20stop-color%3D%22rgb%2850%25%2C37.57669%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7812500%22%20stop-color%3D%22rgb%2850%25%2C31.63120%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.7916667%22%20stop-color%3D%22rgb%2850%25%2C26.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8020833%22%20stop-color%3D%22rgb%2850%25%2C20.77945%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8125000%22%20stop-color%3D%22rgb%2850%25%2C16.05887%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8229167%22%20stop-color%3D%22rgb%2850%25%2C11.91904%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8333333%22%20stop-color%3D%22rgb%2850%25%2C8.43078%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8437500%22%20stop-color%3D%22rgb%2850%25%2C5.65378%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8541667%22%20stop-color%3D%22rgb%2850%25%2C3.63556%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8645833%22%20stop-color%3D%22rgb%2850%25%2C2.41065%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8750000%22%20stop-color%3D%22rgb%2850%25%2C2.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8854167%22%20stop-color%3D%22rgb%2850%25%2C2.41065%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.8958333%22%20stop-color%3D%22rgb%2850%25%2C3.63556%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9062500%22%20stop-color%3D%22rgb%2850%25%2C5.65378%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9166667%22%20stop-color%3D%22rgb%2850%25%2C8.43078%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9270833%22%20stop-color%3D%22rgb%2850%25%2C11.91904%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9375000%22%20stop-color%3D%22rgb%2850%25%2C16.05887%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9479167%22%20stop-color%3D%22rgb%2850%25%2C20.77945%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9583333%22%20stop-color%3D%22rgb%2850%25%2C26.00000%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9687500%22%20stop-color%3D%22rgb%2850%25%2C31.63120%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9791667%22%20stop-color%3D%22rgb%2850%25%2C37.57669%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%220.9895833%22%20stop-color%3D%22rgb%2850%25%2C43.73474%25%2C50%25%29%22%2F%3E%3Cstop%20offset%3D%221.0000000%22%20stop-color%3D%22rgb%2850%25%2C50.00000%25%2C50%25%29%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%221200%22%20height%3D%22320%22%20fill%3D%22url%28%23s%29%22%2F%3E%3C%2Fsvg%3E"];
const SD_MOTION_RECIPES = {
  "rising": {
    "title": "Upward currents",
    "description": "The noise field rises through the shape while the base stays planted.",
    "levels": [
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.009 0.0375\" numOctaves=\"2\" seed=\"7\" stitchTiles=\"stitch\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" result=\"noise\"/><feTile in=\"noise\" x=\"-120\" y=\"-640\" width=\"1440\" height=\"1600\" result=\"tiles\"/><feOffset in=\"tiles\" dx=\"0\" dy=\"0\" x=\"-120\" y=\"-320\" width=\"1440\" height=\"960\" result=\"flow\"><animate attributeName=\"dy\" values=\"0;-320\" dur=\"6.4s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-map\"/><feComposite in=\"flow\" in2=\"weight-map\" operator=\"in\" result=\"weighted-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-map\"/><feComposite in=\"weighted-map\" in2=\"neutral-map\" operator=\"over\" result=\"map\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"map\" scale=\"18\" xChannelSelector=\"R\" yChannelSelector=\"G\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ],
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.009 0.0375\" numOctaves=\"2\" seed=\"7\" stitchTiles=\"stitch\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" result=\"noise\"/><feTile in=\"noise\" x=\"-120\" y=\"-640\" width=\"1440\" height=\"1600\" result=\"tiles\"/><feOffset in=\"tiles\" dx=\"0\" dy=\"0\" x=\"-120\" y=\"-320\" width=\"1440\" height=\"960\" result=\"flow\"><animate attributeName=\"dy\" values=\"0;-320\" dur=\"4.4s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-map\"/><feComposite in=\"flow\" in2=\"weight-map\" operator=\"in\" result=\"weighted-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-map\"/><feComposite in=\"weighted-map\" in2=\"neutral-map\" operator=\"over\" result=\"map\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"map\" scale=\"32\" xChannelSelector=\"R\" yChannelSelector=\"G\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ],
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.009 0.0375\" numOctaves=\"2\" seed=\"7\" stitchTiles=\"stitch\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" result=\"noise\"/><feTile in=\"noise\" x=\"-120\" y=\"-640\" width=\"1440\" height=\"1600\" result=\"tiles\"/><feOffset in=\"tiles\" dx=\"0\" dy=\"0\" x=\"-120\" y=\"-320\" width=\"1440\" height=\"960\" result=\"flow\"><animate attributeName=\"dy\" values=\"0;-320\" dur=\"3.2s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-map\"/><feComposite in=\"flow\" in2=\"weight-map\" operator=\"in\" result=\"weighted-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-map\"/><feComposite in=\"weighted-map\" in2=\"neutral-map\" operator=\"over\" result=\"map\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"map\" scale=\"54\" xChannelSelector=\"R\" yChannelSelector=\"G\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ]
    ]
  },
  "side-current": {
    "title": "Sideways current",
    "description": "A tileable noise field drifts horizontally, with a smooth falloff before the fixed section.",
    "levels": [
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.005 0.025\" numOctaves=\"2\" seed=\"31\" stitchTiles=\"stitch\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" result=\"noise\"/><feTile in=\"noise\" x=\"-1280\" y=\"-320\" width=\"3760\" height=\"960\" result=\"tiles\"/><feOffset in=\"tiles\" dx=\"0\" dy=\"0\" result=\"flow\"><animate attributeName=\"dx\" values=\"0;-1200\" dur=\"15s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-map\"/><feComposite in=\"flow\" in2=\"weight-map\" operator=\"in\" result=\"weighted-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-map\"/><feComposite in=\"weighted-map\" in2=\"neutral-map\" operator=\"over\" result=\"map\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"map\" scale=\"14\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"first\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ],
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.005 0.025\" numOctaves=\"2\" seed=\"31\" stitchTiles=\"stitch\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" result=\"noise\"/><feTile in=\"noise\" x=\"-1280\" y=\"-320\" width=\"3760\" height=\"960\" result=\"tiles\"/><feOffset in=\"tiles\" dx=\"0\" dy=\"0\" result=\"flow\"><animate attributeName=\"dx\" values=\"0;-1200\" dur=\"10s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-map\"/><feComposite in=\"flow\" in2=\"weight-map\" operator=\"in\" result=\"weighted-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-map\"/><feComposite in=\"weighted-map\" in2=\"neutral-map\" operator=\"over\" result=\"map\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"map\" scale=\"28\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"first\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ],
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.005 0.025\" numOctaves=\"2\" seed=\"31\" stitchTiles=\"stitch\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" result=\"noise\"/><feTile in=\"noise\" x=\"-1280\" y=\"-320\" width=\"3760\" height=\"960\" result=\"tiles\"/><feOffset in=\"tiles\" dx=\"0\" dy=\"0\" result=\"flow\"><animate attributeName=\"dx\" values=\"0;-1200\" dur=\"7s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-map\"/><feComposite in=\"flow\" in2=\"weight-map\" operator=\"in\" result=\"weighted-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-map\"/><feComposite in=\"weighted-map\" in2=\"neutral-map\" operator=\"over\" result=\"map\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"map\" scale=\"46\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"first\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ]
    ]
  },
  "swell-map": {
    "title": "Travelling swell",
    "description": "A smooth repeating displacement wave travels sideways through the shape. No mirroring or fading.",
    "levels": [
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feImage href=\"@IMAGE1@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"noise\"/><feTile in=\"noise\" x=\"-1280\" y=\"-320\" width=\"3760\" height=\"960\" result=\"tiles\"/><feOffset in=\"tiles\" dx=\"0\" dy=\"0\" result=\"flow\"><animate attributeName=\"dx\" values=\"0;-1200\" dur=\"15s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-map\"/><feComposite in=\"flow\" in2=\"weight-map\" operator=\"in\" result=\"weighted-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-map\"/><feComposite in=\"weighted-map\" in2=\"neutral-map\" operator=\"over\" result=\"map\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"map\" scale=\"14\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"first\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ],
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feImage href=\"@IMAGE1@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"noise\"/><feTile in=\"noise\" x=\"-1280\" y=\"-320\" width=\"3760\" height=\"960\" result=\"tiles\"/><feOffset in=\"tiles\" dx=\"0\" dy=\"0\" result=\"flow\"><animate attributeName=\"dx\" values=\"0;-1200\" dur=\"10s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-map\"/><feComposite in=\"flow\" in2=\"weight-map\" operator=\"in\" result=\"weighted-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-map\"/><feComposite in=\"weighted-map\" in2=\"neutral-map\" operator=\"over\" result=\"map\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"map\" scale=\"30\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"first\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ],
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feImage href=\"@IMAGE1@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"noise\"/><feTile in=\"noise\" x=\"-1280\" y=\"-320\" width=\"3760\" height=\"960\" result=\"tiles\"/><feOffset in=\"tiles\" dx=\"0\" dy=\"0\" result=\"flow\"><animate attributeName=\"dx\" values=\"0;-1200\" dur=\"7s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-map\"/><feComposite in=\"flow\" in2=\"weight-map\" operator=\"in\" result=\"weighted-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-map\"/><feComposite in=\"weighted-map\" in2=\"neutral-map\" operator=\"over\" result=\"map\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"map\" scale=\"52\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"first\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ]
    ]
  },
  "css-rock": {
    "title": "Soft rocking",
    "description": "A slow lean and a quicker, small vertical pulse combine around the fixed boundary.",
    "levels": [
      [
        "",
        "<g transform=\"translate(0 296)\"><g class=\"new-motion pulse-motion motion-light\"><g class=\"new-motion rock-motion motion-light\"><g transform=\"translate(0 -296)\">@USE@</g></g></g></g>"
      ],
      [
        "",
        "<g transform=\"translate(0 296)\"><g class=\"new-motion pulse-motion motion-natural\"><g class=\"new-motion rock-motion motion-natural\"><g transform=\"translate(0 -296)\">@USE@</g></g></g></g>"
      ],
      [
        "",
        "<g transform=\"translate(0 296)\"><g class=\"new-motion pulse-motion motion-strong\"><g class=\"new-motion rock-motion motion-strong\"><g transform=\"translate(0 -296)\">@USE@</g></g></g></g>"
      ]
    ]
  },
  "surface-ripples": {
    "title": "Surface ripples",
    "description": "Small travelling ripples ride over a much broader swell.",
    "levels": [
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feImage href=\"@IMAGE2@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"a-seed\"/><feTile in=\"a-seed\" x=\"-1280\" y=\"-640\" width=\"3760\" height=\"1600\" result=\"a-tiles\"/><feOffset in=\"a-tiles\" result=\"a-flow\"><animate attributeName=\"dx\" values=\"0;-1200\" dur=\"18s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-a-map\"/><feComposite in=\"a-flow\" in2=\"weight-a-map\" operator=\"in\" result=\"weighted-a-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-a-map\"/><feComposite in=\"weighted-a-map\" in2=\"neutral-a-map\" operator=\"over\" result=\"a-map\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"a-map\" scale=\"9.799999999999999\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"a-result\"></feDisplacementMap><feImage href=\"@IMAGE3@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"b-seed\"/><feTile in=\"b-seed\" x=\"-1280\" y=\"-640\" width=\"3760\" height=\"1600\" result=\"b-tiles\"/><feOffset in=\"b-tiles\" result=\"b-flow\"><animate attributeName=\"dx\" values=\"0;-1200\" dur=\"13.193999999999999s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-b-map\"/><feComposite in=\"b-flow\" in2=\"weight-b-map\" operator=\"in\" result=\"weighted-b-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-b-map\"/><feComposite in=\"weighted-b-map\" in2=\"neutral-b-map\" operator=\"over\" result=\"b-map\"/><feDisplacementMap in=\"a-result\" in2=\"b-map\" scale=\"3.36\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"b-result\"></feDisplacementMap></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ],
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feImage href=\"@IMAGE2@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"a-seed\"/><feTile in=\"a-seed\" x=\"-1280\" y=\"-640\" width=\"3760\" height=\"1600\" result=\"a-tiles\"/><feOffset in=\"a-tiles\" result=\"a-flow\"><animate attributeName=\"dx\" values=\"0;-1200\" dur=\"12.7s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-a-map\"/><feComposite in=\"a-flow\" in2=\"weight-a-map\" operator=\"in\" result=\"weighted-a-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-a-map\"/><feComposite in=\"weighted-a-map\" in2=\"neutral-a-map\" operator=\"over\" result=\"a-map\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"a-map\" scale=\"19.599999999999998\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"a-result\"></feDisplacementMap><feImage href=\"@IMAGE3@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"b-seed\"/><feTile in=\"b-seed\" x=\"-1280\" y=\"-640\" width=\"3760\" height=\"1600\" result=\"b-tiles\"/><feOffset in=\"b-tiles\" result=\"b-flow\"><animate attributeName=\"dx\" values=\"0;-1200\" dur=\"9.309099999999999s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-b-map\"/><feComposite in=\"b-flow\" in2=\"weight-b-map\" operator=\"in\" result=\"weighted-b-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-b-map\"/><feComposite in=\"weighted-b-map\" in2=\"neutral-b-map\" operator=\"over\" result=\"b-map\"/><feDisplacementMap in=\"a-result\" in2=\"b-map\" scale=\"6.72\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"b-result\"></feDisplacementMap></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ],
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feImage href=\"@IMAGE2@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"a-seed\"/><feTile in=\"a-seed\" x=\"-1280\" y=\"-640\" width=\"3760\" height=\"1600\" result=\"a-tiles\"/><feOffset in=\"a-tiles\" result=\"a-flow\"><animate attributeName=\"dx\" values=\"0;-1200\" dur=\"9.1s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-a-map\"/><feComposite in=\"a-flow\" in2=\"weight-a-map\" operator=\"in\" result=\"weighted-a-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-a-map\"/><feComposite in=\"weighted-a-map\" in2=\"neutral-a-map\" operator=\"over\" result=\"a-map\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"a-map\" scale=\"32.199999999999996\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"a-result\"></feDisplacementMap><feImage href=\"@IMAGE3@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"b-seed\"/><feTile in=\"b-seed\" x=\"-1280\" y=\"-640\" width=\"3760\" height=\"1600\" result=\"b-tiles\"/><feOffset in=\"b-tiles\" result=\"b-flow\"><animate attributeName=\"dx\" values=\"0;-1200\" dur=\"6.670299999999999s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-b-map\"/><feComposite in=\"b-flow\" in2=\"weight-b-map\" operator=\"in\" result=\"weighted-b-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-b-map\"/><feComposite in=\"weighted-b-map\" in2=\"neutral-b-map\" operator=\"over\" result=\"b-map\"/><feDisplacementMap in=\"a-result\" in2=\"b-map\" scale=\"11.04\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"b-result\"></feDisplacementMap></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ]
    ]
  },
  "crossing-swells": {
    "title": "Crossing swells",
    "description": "Two smooth swells pass in opposite directions with different wavelengths and periods.",
    "levels": [
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feImage href=\"@IMAGE2@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"a-seed\"/><feTile in=\"a-seed\" x=\"-1280\" y=\"-640\" width=\"3760\" height=\"1600\" result=\"a-tiles\"/><feOffset in=\"a-tiles\" result=\"a-flow\"><animate attributeName=\"dx\" values=\"0;-1200\" dur=\"18s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-a-map\"/><feComposite in=\"a-flow\" in2=\"weight-a-map\" operator=\"in\" result=\"weighted-a-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-a-map\"/><feComposite in=\"weighted-a-map\" in2=\"neutral-a-map\" operator=\"over\" result=\"a-map\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"a-map\" scale=\"11.9\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"a-result\"></feDisplacementMap><feImage href=\"@IMAGE4@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"b-seed\"/><feTile in=\"b-seed\" x=\"-1280\" y=\"-640\" width=\"3760\" height=\"1600\" result=\"b-tiles\"/><feOffset in=\"b-tiles\" result=\"b-flow\"><animate attributeName=\"dx\" values=\"0;1200\" dur=\"24.714s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-b-map\"/><feComposite in=\"b-flow\" in2=\"weight-b-map\" operator=\"in\" result=\"weighted-b-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-b-map\"/><feComposite in=\"weighted-b-map\" in2=\"neutral-b-map\" operator=\"over\" result=\"b-map\"/><feDisplacementMap in=\"a-result\" in2=\"b-map\" scale=\"7.700000000000001\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"b-result\"></feDisplacementMap></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ],
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feImage href=\"@IMAGE2@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"a-seed\"/><feTile in=\"a-seed\" x=\"-1280\" y=\"-640\" width=\"3760\" height=\"1600\" result=\"a-tiles\"/><feOffset in=\"a-tiles\" result=\"a-flow\"><animate attributeName=\"dx\" values=\"0;-1200\" dur=\"12.7s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-a-map\"/><feComposite in=\"a-flow\" in2=\"weight-a-map\" operator=\"in\" result=\"weighted-a-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-a-map\"/><feComposite in=\"weighted-a-map\" in2=\"neutral-a-map\" operator=\"over\" result=\"a-map\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"a-map\" scale=\"23.8\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"a-result\"></feDisplacementMap><feImage href=\"@IMAGE4@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"b-seed\"/><feTile in=\"b-seed\" x=\"-1280\" y=\"-640\" width=\"3760\" height=\"1600\" result=\"b-tiles\"/><feOffset in=\"b-tiles\" result=\"b-flow\"><animate attributeName=\"dx\" values=\"0;1200\" dur=\"17.437099999999997s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-b-map\"/><feComposite in=\"b-flow\" in2=\"weight-b-map\" operator=\"in\" result=\"weighted-b-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-b-map\"/><feComposite in=\"weighted-b-map\" in2=\"neutral-b-map\" operator=\"over\" result=\"b-map\"/><feDisplacementMap in=\"a-result\" in2=\"b-map\" scale=\"15.400000000000002\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"b-result\"></feDisplacementMap></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ],
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feImage href=\"@IMAGE2@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"a-seed\"/><feTile in=\"a-seed\" x=\"-1280\" y=\"-640\" width=\"3760\" height=\"1600\" result=\"a-tiles\"/><feOffset in=\"a-tiles\" result=\"a-flow\"><animate attributeName=\"dx\" values=\"0;-1200\" dur=\"9.1s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-a-map\"/><feComposite in=\"a-flow\" in2=\"weight-a-map\" operator=\"in\" result=\"weighted-a-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-a-map\"/><feComposite in=\"weighted-a-map\" in2=\"neutral-a-map\" operator=\"over\" result=\"a-map\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"a-map\" scale=\"39.1\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"a-result\"></feDisplacementMap><feImage href=\"@IMAGE4@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"b-seed\"/><feTile in=\"b-seed\" x=\"-1280\" y=\"-640\" width=\"3760\" height=\"1600\" result=\"b-tiles\"/><feOffset in=\"b-tiles\" result=\"b-flow\"><animate attributeName=\"dx\" values=\"0;1200\" dur=\"12.494299999999999s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-b-map\"/><feComposite in=\"b-flow\" in2=\"weight-b-map\" operator=\"in\" result=\"weighted-b-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-b-map\"/><feComposite in=\"weighted-b-map\" in2=\"neutral-b-map\" operator=\"over\" result=\"b-map\"/><feDisplacementMap in=\"a-result\" in2=\"b-map\" scale=\"25.3\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"b-result\"></feDisplacementMap></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ]
    ]
  },
  "uneven-swells": {
    "title": "Uneven swells",
    "description": "A travelling swell gradually grows and softens on a separate rhythm.",
    "levels": [
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feImage href=\"@IMAGE4@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"a-seed\"/><feTile in=\"a-seed\" x=\"-1280\" y=\"-640\" width=\"3760\" height=\"1600\" result=\"a-tiles\"/><feOffset in=\"a-tiles\" result=\"a-flow\"><animate attributeName=\"dx\" values=\"0;-1200\" dur=\"18s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-a-map\"/><feComposite in=\"a-flow\" in2=\"weight-a-map\" operator=\"in\" result=\"weighted-a-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-a-map\"/><feComposite in=\"weighted-a-map\" in2=\"neutral-a-map\" operator=\"over\" result=\"a-map\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"a-map\" scale=\"14\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"a-result\"><animate attributeName=\"scale\" values=\"7.700000000000001;18.2;7.700000000000001\" dur=\"31.158s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feDisplacementMap></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ],
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feImage href=\"@IMAGE4@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"a-seed\"/><feTile in=\"a-seed\" x=\"-1280\" y=\"-640\" width=\"3760\" height=\"1600\" result=\"a-tiles\"/><feOffset in=\"a-tiles\" result=\"a-flow\"><animate attributeName=\"dx\" values=\"0;-1200\" dur=\"12.7s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-a-map\"/><feComposite in=\"a-flow\" in2=\"weight-a-map\" operator=\"in\" result=\"weighted-a-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-a-map\"/><feComposite in=\"weighted-a-map\" in2=\"neutral-a-map\" operator=\"over\" result=\"a-map\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"a-map\" scale=\"28\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"a-result\"><animate attributeName=\"scale\" values=\"15.400000000000002;36.4;15.400000000000002\" dur=\"21.9837s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feDisplacementMap></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ],
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feImage href=\"@IMAGE4@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"a-seed\"/><feTile in=\"a-seed\" x=\"-1280\" y=\"-640\" width=\"3760\" height=\"1600\" result=\"a-tiles\"/><feOffset in=\"a-tiles\" result=\"a-flow\"><animate attributeName=\"dx\" values=\"0;-1200\" dur=\"9.1s\" repeatCount=\"indefinite\"/></feOffset><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"weight-a-map\"/><feComposite in=\"a-flow\" in2=\"weight-a-map\" operator=\"in\" result=\"weighted-a-map\"/><feFlood flood-color=\"rgb(50%,50%,50%)\" flood-opacity=\"1\" result=\"neutral-a-map\"/><feComposite in=\"weighted-a-map\" in2=\"neutral-a-map\" operator=\"over\" result=\"a-map\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"a-map\" scale=\"46\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"a-result\"><animate attributeName=\"scale\" values=\"25.3;59.800000000000004;25.3\" dur=\"15.7521s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feDisplacementMap></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ]
    ]
  },
  "contour-pulse": {
    "title": "Contour pulse",
    "description": "The contour gently thickens and relaxes with rounded expansion, keeping the tips smooth.",
    "levels": [
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feColorMatrix in=\"SourceAlpha\" type=\"matrix\" values=\"0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 0 1\" result=\"alpha-map\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-0\"><animate attributeName=\"dx\" values=\"0;0.750000;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.000000;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"alpha-map\" in2=\"rounded-offset-0\" mode=\"lighten\" result=\"rounded-max-0\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-1\"><animate attributeName=\"dx\" values=\"0;0.692910;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.172208;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-0\" in2=\"rounded-offset-1\" mode=\"lighten\" result=\"rounded-max-1\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-2\"><animate attributeName=\"dx\" values=\"0;0.530330;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.318198;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-1\" in2=\"rounded-offset-2\" mode=\"lighten\" result=\"rounded-max-2\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-3\"><animate attributeName=\"dx\" values=\"0;0.287013;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.415746;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-2\" in2=\"rounded-offset-3\" mode=\"lighten\" result=\"rounded-max-3\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-4\"><animate attributeName=\"dx\" values=\"0;0.000000;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.450000;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-3\" in2=\"rounded-offset-4\" mode=\"lighten\" result=\"rounded-max-4\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-5\"><animate attributeName=\"dx\" values=\"0;-0.287013;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.415746;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-4\" in2=\"rounded-offset-5\" mode=\"lighten\" result=\"rounded-max-5\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-6\"><animate attributeName=\"dx\" values=\"0;-0.530330;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.318198;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-5\" in2=\"rounded-offset-6\" mode=\"lighten\" result=\"rounded-max-6\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-7\"><animate attributeName=\"dx\" values=\"0;-0.692910;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.172208;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-6\" in2=\"rounded-offset-7\" mode=\"lighten\" result=\"rounded-max-7\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-8\"><animate attributeName=\"dx\" values=\"0;-0.750000;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.000000;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-7\" in2=\"rounded-offset-8\" mode=\"lighten\" result=\"rounded-max-8\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-9\"><animate attributeName=\"dx\" values=\"0;-0.692910;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-0.172208;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-8\" in2=\"rounded-offset-9\" mode=\"lighten\" result=\"rounded-max-9\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-10\"><animate attributeName=\"dx\" values=\"0;-0.530330;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-0.318198;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-9\" in2=\"rounded-offset-10\" mode=\"lighten\" result=\"rounded-max-10\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-11\"><animate attributeName=\"dx\" values=\"0;-0.287013;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-0.415746;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-10\" in2=\"rounded-offset-11\" mode=\"lighten\" result=\"rounded-max-11\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-12\"><animate attributeName=\"dx\" values=\"0;-0.000000;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-0.450000;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-11\" in2=\"rounded-offset-12\" mode=\"lighten\" result=\"rounded-max-12\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-13\"><animate attributeName=\"dx\" values=\"0;0.287013;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-0.415746;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-12\" in2=\"rounded-offset-13\" mode=\"lighten\" result=\"rounded-max-13\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-14\"><animate attributeName=\"dx\" values=\"0;0.530330;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-0.318198;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-13\" in2=\"rounded-offset-14\" mode=\"lighten\" result=\"rounded-max-14\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-15\"><animate attributeName=\"dx\" values=\"0;0.692910;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-0.172208;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-14\" in2=\"rounded-offset-15\" mode=\"lighten\" result=\"rounded-max-15\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-16\"><animate attributeName=\"dx\" values=\"0;0.375000;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.000000;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-15\" in2=\"rounded-offset-16\" mode=\"lighten\" result=\"rounded-max-16\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-17\"><animate attributeName=\"dx\" values=\"0;0.265165;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.159099;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-16\" in2=\"rounded-offset-17\" mode=\"lighten\" result=\"rounded-max-17\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-18\"><animate attributeName=\"dx\" values=\"0;0.000000;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.225000;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-17\" in2=\"rounded-offset-18\" mode=\"lighten\" result=\"rounded-max-18\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-19\"><animate attributeName=\"dx\" values=\"0;-0.265165;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.159099;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-18\" in2=\"rounded-offset-19\" mode=\"lighten\" result=\"rounded-max-19\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-20\"><animate attributeName=\"dx\" values=\"0;-0.375000;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.000000;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-19\" in2=\"rounded-offset-20\" mode=\"lighten\" result=\"rounded-max-20\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-21\"><animate attributeName=\"dx\" values=\"0;-0.265165;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-0.159099;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-20\" in2=\"rounded-offset-21\" mode=\"lighten\" result=\"rounded-max-21\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-22\"><animate attributeName=\"dx\" values=\"0;-0.000000;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-0.225000;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-21\" in2=\"rounded-offset-22\" mode=\"lighten\" result=\"rounded-max-22\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-23\"><animate attributeName=\"dx\" values=\"0;0.265165;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-0.159099;0\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-22\" in2=\"rounded-offset-23\" mode=\"lighten\" result=\"rounded-max-23\"/><feGaussianBlur in=\"rounded-max-23\" stdDeviation=\"0.01\" result=\"smooth-expansion\"><animate attributeName=\"stdDeviation\" values=\"0.01;0.85;0.01\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feGaussianBlur><feBlend in=\"alpha-map\" in2=\"smooth-expansion\" mode=\"lighten\" result=\"tip-safe-map\"/><feColorMatrix in=\"tip-safe-map\" type=\"matrix\" values=\"0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0\" result=\"rounded-alpha\"/><feFlood flood-color=\"currentColor\" result=\"contour-paint\"/><feComposite in=\"contour-paint\" in2=\"rounded-alpha\" operator=\"in\" result=\"thick\"/><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"pin-weight\"/><feComposite in=\"thick\" in2=\"pin-weight\" operator=\"in\" result=\"upper\"/><feComposite in=\"SourceGraphic\" in2=\"pin-weight\" operator=\"out\" result=\"lower\"/><feComposite in=\"upper\" in2=\"lower\" operator=\"arithmetic\" k2=\"1\" k3=\"1\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ],
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feColorMatrix in=\"SourceAlpha\" type=\"matrix\" values=\"0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 0 1\" result=\"alpha-map\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-0\"><animate attributeName=\"dx\" values=\"0;2.000000;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.000000;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"alpha-map\" in2=\"rounded-offset-0\" mode=\"lighten\" result=\"rounded-max-0\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-1\"><animate attributeName=\"dx\" values=\"0;1.847759;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.459220;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-0\" in2=\"rounded-offset-1\" mode=\"lighten\" result=\"rounded-max-1\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-2\"><animate attributeName=\"dx\" values=\"0;1.414214;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.848528;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-1\" in2=\"rounded-offset-2\" mode=\"lighten\" result=\"rounded-max-2\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-3\"><animate attributeName=\"dx\" values=\"0;0.765367;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;1.108655;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-2\" in2=\"rounded-offset-3\" mode=\"lighten\" result=\"rounded-max-3\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-4\"><animate attributeName=\"dx\" values=\"0;0.000000;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;1.200000;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-3\" in2=\"rounded-offset-4\" mode=\"lighten\" result=\"rounded-max-4\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-5\"><animate attributeName=\"dx\" values=\"0;-0.765367;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;1.108655;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-4\" in2=\"rounded-offset-5\" mode=\"lighten\" result=\"rounded-max-5\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-6\"><animate attributeName=\"dx\" values=\"0;-1.414214;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.848528;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-5\" in2=\"rounded-offset-6\" mode=\"lighten\" result=\"rounded-max-6\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-7\"><animate attributeName=\"dx\" values=\"0;-1.847759;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.459220;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-6\" in2=\"rounded-offset-7\" mode=\"lighten\" result=\"rounded-max-7\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-8\"><animate attributeName=\"dx\" values=\"0;-2.000000;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.000000;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-7\" in2=\"rounded-offset-8\" mode=\"lighten\" result=\"rounded-max-8\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-9\"><animate attributeName=\"dx\" values=\"0;-1.847759;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-0.459220;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-8\" in2=\"rounded-offset-9\" mode=\"lighten\" result=\"rounded-max-9\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-10\"><animate attributeName=\"dx\" values=\"0;-1.414214;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-0.848528;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-9\" in2=\"rounded-offset-10\" mode=\"lighten\" result=\"rounded-max-10\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-11\"><animate attributeName=\"dx\" values=\"0;-0.765367;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-1.108655;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-10\" in2=\"rounded-offset-11\" mode=\"lighten\" result=\"rounded-max-11\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-12\"><animate attributeName=\"dx\" values=\"0;-0.000000;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-1.200000;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-11\" in2=\"rounded-offset-12\" mode=\"lighten\" result=\"rounded-max-12\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-13\"><animate attributeName=\"dx\" values=\"0;0.765367;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-1.108655;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-12\" in2=\"rounded-offset-13\" mode=\"lighten\" result=\"rounded-max-13\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-14\"><animate attributeName=\"dx\" values=\"0;1.414214;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-0.848528;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-13\" in2=\"rounded-offset-14\" mode=\"lighten\" result=\"rounded-max-14\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-15\"><animate attributeName=\"dx\" values=\"0;1.847759;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-0.459220;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-14\" in2=\"rounded-offset-15\" mode=\"lighten\" result=\"rounded-max-15\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-16\"><animate attributeName=\"dx\" values=\"0;1.000000;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.000000;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-15\" in2=\"rounded-offset-16\" mode=\"lighten\" result=\"rounded-max-16\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-17\"><animate attributeName=\"dx\" values=\"0;0.707107;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.424264;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-16\" in2=\"rounded-offset-17\" mode=\"lighten\" result=\"rounded-max-17\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-18\"><animate attributeName=\"dx\" values=\"0;0.000000;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.600000;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-17\" in2=\"rounded-offset-18\" mode=\"lighten\" result=\"rounded-max-18\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-19\"><animate attributeName=\"dx\" values=\"0;-0.707107;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.424264;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-18\" in2=\"rounded-offset-19\" mode=\"lighten\" result=\"rounded-max-19\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-20\"><animate attributeName=\"dx\" values=\"0;-1.000000;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.000000;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-19\" in2=\"rounded-offset-20\" mode=\"lighten\" result=\"rounded-max-20\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-21\"><animate attributeName=\"dx\" values=\"0;-0.707107;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-0.424264;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-20\" in2=\"rounded-offset-21\" mode=\"lighten\" result=\"rounded-max-21\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-22\"><animate attributeName=\"dx\" values=\"0;-0.000000;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-0.600000;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-21\" in2=\"rounded-offset-22\" mode=\"lighten\" result=\"rounded-max-22\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-23\"><animate attributeName=\"dx\" values=\"0;0.707107;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-0.424264;0\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-22\" in2=\"rounded-offset-23\" mode=\"lighten\" result=\"rounded-max-23\"/><feGaussianBlur in=\"rounded-max-23\" stdDeviation=\"0.01\" result=\"smooth-expansion\"><animate attributeName=\"stdDeviation\" values=\"0.01;0.85;0.01\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feGaussianBlur><feBlend in=\"alpha-map\" in2=\"smooth-expansion\" mode=\"lighten\" result=\"tip-safe-map\"/><feColorMatrix in=\"tip-safe-map\" type=\"matrix\" values=\"0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0\" result=\"rounded-alpha\"/><feFlood flood-color=\"currentColor\" result=\"contour-paint\"/><feComposite in=\"contour-paint\" in2=\"rounded-alpha\" operator=\"in\" result=\"thick\"/><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"pin-weight\"/><feComposite in=\"thick\" in2=\"pin-weight\" operator=\"in\" result=\"upper\"/><feComposite in=\"SourceGraphic\" in2=\"pin-weight\" operator=\"out\" result=\"lower\"/><feComposite in=\"upper\" in2=\"lower\" operator=\"arithmetic\" k2=\"1\" k3=\"1\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ],
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feColorMatrix in=\"SourceAlpha\" type=\"matrix\" values=\"0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 0 1\" result=\"alpha-map\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-0\"><animate attributeName=\"dx\" values=\"0;3.500000;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.000000;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"alpha-map\" in2=\"rounded-offset-0\" mode=\"lighten\" result=\"rounded-max-0\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-1\"><animate attributeName=\"dx\" values=\"0;3.233578;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.803635;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-0\" in2=\"rounded-offset-1\" mode=\"lighten\" result=\"rounded-max-1\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-2\"><animate attributeName=\"dx\" values=\"0;2.474874;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;1.484924;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-1\" in2=\"rounded-offset-2\" mode=\"lighten\" result=\"rounded-max-2\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-3\"><animate attributeName=\"dx\" values=\"0;1.339392;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;1.940147;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-2\" in2=\"rounded-offset-3\" mode=\"lighten\" result=\"rounded-max-3\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-4\"><animate attributeName=\"dx\" values=\"0;0.000000;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;2.100000;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-3\" in2=\"rounded-offset-4\" mode=\"lighten\" result=\"rounded-max-4\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-5\"><animate attributeName=\"dx\" values=\"0;-1.339392;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;1.940147;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-4\" in2=\"rounded-offset-5\" mode=\"lighten\" result=\"rounded-max-5\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-6\"><animate attributeName=\"dx\" values=\"0;-2.474874;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;1.484924;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-5\" in2=\"rounded-offset-6\" mode=\"lighten\" result=\"rounded-max-6\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-7\"><animate attributeName=\"dx\" values=\"0;-3.233578;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.803635;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-6\" in2=\"rounded-offset-7\" mode=\"lighten\" result=\"rounded-max-7\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-8\"><animate attributeName=\"dx\" values=\"0;-3.500000;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.000000;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-7\" in2=\"rounded-offset-8\" mode=\"lighten\" result=\"rounded-max-8\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-9\"><animate attributeName=\"dx\" values=\"0;-3.233578;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-0.803635;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-8\" in2=\"rounded-offset-9\" mode=\"lighten\" result=\"rounded-max-9\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-10\"><animate attributeName=\"dx\" values=\"0;-2.474874;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-1.484924;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-9\" in2=\"rounded-offset-10\" mode=\"lighten\" result=\"rounded-max-10\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-11\"><animate attributeName=\"dx\" values=\"0;-1.339392;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-1.940147;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-10\" in2=\"rounded-offset-11\" mode=\"lighten\" result=\"rounded-max-11\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-12\"><animate attributeName=\"dx\" values=\"0;-0.000000;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-2.100000;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-11\" in2=\"rounded-offset-12\" mode=\"lighten\" result=\"rounded-max-12\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-13\"><animate attributeName=\"dx\" values=\"0;1.339392;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-1.940147;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-12\" in2=\"rounded-offset-13\" mode=\"lighten\" result=\"rounded-max-13\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-14\"><animate attributeName=\"dx\" values=\"0;2.474874;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-1.484924;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-13\" in2=\"rounded-offset-14\" mode=\"lighten\" result=\"rounded-max-14\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-15\"><animate attributeName=\"dx\" values=\"0;3.233578;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-0.803635;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-14\" in2=\"rounded-offset-15\" mode=\"lighten\" result=\"rounded-max-15\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-16\"><animate attributeName=\"dx\" values=\"0;1.750000;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.000000;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-15\" in2=\"rounded-offset-16\" mode=\"lighten\" result=\"rounded-max-16\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-17\"><animate attributeName=\"dx\" values=\"0;1.237437;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.742462;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-16\" in2=\"rounded-offset-17\" mode=\"lighten\" result=\"rounded-max-17\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-18\"><animate attributeName=\"dx\" values=\"0;0.000000;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;1.050000;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-17\" in2=\"rounded-offset-18\" mode=\"lighten\" result=\"rounded-max-18\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-19\"><animate attributeName=\"dx\" values=\"0;-1.237437;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.742462;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-18\" in2=\"rounded-offset-19\" mode=\"lighten\" result=\"rounded-max-19\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-20\"><animate attributeName=\"dx\" values=\"0;-1.750000;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;0.000000;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-19\" in2=\"rounded-offset-20\" mode=\"lighten\" result=\"rounded-max-20\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-21\"><animate attributeName=\"dx\" values=\"0;-1.237437;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-0.742462;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-20\" in2=\"rounded-offset-21\" mode=\"lighten\" result=\"rounded-max-21\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-22\"><animate attributeName=\"dx\" values=\"0;-0.000000;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-1.050000;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-21\" in2=\"rounded-offset-22\" mode=\"lighten\" result=\"rounded-max-22\"/><feOffset in=\"alpha-map\" dx=\"0\" dy=\"0\" result=\"rounded-offset-23\"><animate attributeName=\"dx\" values=\"0;1.237437;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"dy\" values=\"0;-0.742462;0\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feOffset><feBlend in=\"rounded-max-22\" in2=\"rounded-offset-23\" mode=\"lighten\" result=\"rounded-max-23\"/><feGaussianBlur in=\"rounded-max-23\" stdDeviation=\"0.01\" result=\"smooth-expansion\"><animate attributeName=\"stdDeviation\" values=\"0.01;0.85;0.01\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feGaussianBlur><feBlend in=\"alpha-map\" in2=\"smooth-expansion\" mode=\"lighten\" result=\"tip-safe-map\"/><feColorMatrix in=\"tip-safe-map\" type=\"matrix\" values=\"0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0\" result=\"rounded-alpha\"/><feFlood flood-color=\"currentColor\" result=\"contour-paint\"/><feComposite in=\"contour-paint\" in2=\"rounded-alpha\" operator=\"in\" result=\"thick\"/><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"pin-weight\"/><feComposite in=\"thick\" in2=\"pin-weight\" operator=\"in\" result=\"upper\"/><feComposite in=\"SourceGraphic\" in2=\"pin-weight\" operator=\"out\" result=\"lower\"/><feComposite in=\"upper\" in2=\"lower\" operator=\"arithmetic\" k2=\"1\" k3=\"1\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ]
    ]
  },
  "variation-contour-double": {
    "title": "Double breath",
    "description": "A small breath followed by a deeper one, joined by smooth curves.",
    "levels": [
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"1.1 0.77\" result=\"breathing-field\"/><feComponentTransfer in=\"breathing-field\" result=\"breath\"><feFuncA type=\"gamma\" amplitude=\"1\" exponent=\"1.8\" offset=\"0\"><animate attributeName=\"exponent\" values=\"1.8;0.9750000000000001;1.3;0.65;1.8\" dur=\"14.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.2;0.43;0.7;1\" keySplines=\"0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1\"/></feFuncA></feComponentTransfer><feColorMatrix in=\"SourceAlpha\" type=\"matrix\" values=\"0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 0 1\" result=\"original-map\"/><feColorMatrix in=\"breath\" type=\"matrix\" values=\"0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 0 1\" result=\"breath-map\"/><feBlend in=\"original-map\" in2=\"breath-map\" mode=\"lighten\" result=\"safe-map\"/><feColorMatrix in=\"safe-map\" type=\"matrix\" values=\"0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0\" result=\"safe-alpha\"/><feFlood flood-color=\"currentColor\" result=\"color\"/><feComposite in=\"color\" in2=\"safe-alpha\" operator=\"in\" result=\"breathing-paint\"/><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"pin-weight\"/><feComposite in=\"breathing-paint\" in2=\"pin-weight\" operator=\"in\" result=\"upper\"/><feComposite in=\"SourceGraphic\" in2=\"pin-weight\" operator=\"out\" result=\"lower\"/><feComposite in=\"upper\" in2=\"lower\" operator=\"arithmetic\" k2=\"1\" k3=\"1\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ],
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"2.2 1.54\" result=\"breathing-field\"/><feComponentTransfer in=\"breathing-field\" result=\"breath\"><feFuncA type=\"gamma\" amplitude=\"1\" exponent=\"1.8\" offset=\"0\"><animate attributeName=\"exponent\" values=\"1.8;0.675;1.3;0.45;1.8\" dur=\"14.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.2;0.43;0.7;1\" keySplines=\"0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1\"/></feFuncA></feComponentTransfer><feColorMatrix in=\"SourceAlpha\" type=\"matrix\" values=\"0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 0 1\" result=\"original-map\"/><feColorMatrix in=\"breath\" type=\"matrix\" values=\"0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 0 1\" result=\"breath-map\"/><feBlend in=\"original-map\" in2=\"breath-map\" mode=\"lighten\" result=\"safe-map\"/><feColorMatrix in=\"safe-map\" type=\"matrix\" values=\"0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0\" result=\"safe-alpha\"/><feFlood flood-color=\"currentColor\" result=\"color\"/><feComposite in=\"color\" in2=\"safe-alpha\" operator=\"in\" result=\"breathing-paint\"/><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"pin-weight\"/><feComposite in=\"breathing-paint\" in2=\"pin-weight\" operator=\"in\" result=\"upper\"/><feComposite in=\"SourceGraphic\" in2=\"pin-weight\" operator=\"out\" result=\"lower\"/><feComposite in=\"upper\" in2=\"lower\" operator=\"arithmetic\" k2=\"1\" k3=\"1\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ],
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"3.4 2.38\" result=\"breathing-field\"/><feComponentTransfer in=\"breathing-field\" result=\"breath\"><feFuncA type=\"gamma\" amplitude=\"1\" exponent=\"1.8\" offset=\"0\"><animate attributeName=\"exponent\" values=\"1.8;0.44999999999999996;1.3;0.3;1.8\" dur=\"14.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.2;0.43;0.7;1\" keySplines=\"0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1\"/></feFuncA></feComponentTransfer><feColorMatrix in=\"SourceAlpha\" type=\"matrix\" values=\"0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 0 1\" result=\"original-map\"/><feColorMatrix in=\"breath\" type=\"matrix\" values=\"0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 0 1\" result=\"breath-map\"/><feBlend in=\"original-map\" in2=\"breath-map\" mode=\"lighten\" result=\"safe-map\"/><feColorMatrix in=\"safe-map\" type=\"matrix\" values=\"0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0\" result=\"safe-alpha\"/><feFlood flood-color=\"currentColor\" result=\"color\"/><feComposite in=\"color\" in2=\"safe-alpha\" operator=\"in\" result=\"breathing-paint\"/><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"pin-weight\"/><feComposite in=\"breathing-paint\" in2=\"pin-weight\" operator=\"in\" result=\"upper\"/><feComposite in=\"SourceGraphic\" in2=\"pin-weight\" operator=\"out\" result=\"lower\"/><feComposite in=\"upper\" in2=\"lower\" operator=\"arithmetic\" k2=\"1\" k3=\"1\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ]
    ]
  },
  "molten-edge": {
    "title": "Molten edge",
    "description": "Animated smoothing and alpha contrast round and release small tips, like softened wax. Best on opaque shapes.",
    "levels": [
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"1\" result=\"soft\"><animate attributeName=\"stdDeviation\" values=\"1;3;1\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feGaussianBlur><feComponentTransfer in=\"soft\" result=\"melt-mask\"><feFuncA type=\"linear\" slope=\"12\" intercept=\"-5.5\"/></feComponentTransfer><feFlood flood-color=\"currentColor\" result=\"paint\"/><feComposite in=\"paint\" in2=\"melt-mask\" operator=\"in\" result=\"molten\"/><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"pin-weight\"/><feComposite in=\"molten\" in2=\"pin-weight\" operator=\"in\" result=\"upper\"/><feComposite in=\"SourceGraphic\" in2=\"pin-weight\" operator=\"out\" result=\"lower\"/><feComposite in=\"upper\" in2=\"lower\" operator=\"arithmetic\" k2=\"1\" k3=\"1\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ],
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"1\" result=\"soft\"><animate attributeName=\"stdDeviation\" values=\"1;7;1\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feGaussianBlur><feComponentTransfer in=\"soft\" result=\"melt-mask\"><feFuncA type=\"linear\" slope=\"12\" intercept=\"-5.5\"/></feComponentTransfer><feFlood flood-color=\"currentColor\" result=\"paint\"/><feComposite in=\"paint\" in2=\"melt-mask\" operator=\"in\" result=\"molten\"/><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"pin-weight\"/><feComposite in=\"molten\" in2=\"pin-weight\" operator=\"in\" result=\"upper\"/><feComposite in=\"SourceGraphic\" in2=\"pin-weight\" operator=\"out\" result=\"lower\"/><feComposite in=\"upper\" in2=\"lower\" operator=\"arithmetic\" k2=\"1\" k3=\"1\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ],
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"1\" result=\"soft\"><animate attributeName=\"stdDeviation\" values=\"1;13;1\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></feGaussianBlur><feComponentTransfer in=\"soft\" result=\"melt-mask\"><feFuncA type=\"linear\" slope=\"12\" intercept=\"-5.5\"/></feComponentTransfer><feFlood flood-color=\"currentColor\" result=\"paint\"/><feComposite in=\"paint\" in2=\"melt-mask\" operator=\"in\" result=\"molten\"/><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"pin-weight\"/><feComposite in=\"molten\" in2=\"pin-weight\" operator=\"in\" result=\"upper\"/><feComposite in=\"SourceGraphic\" in2=\"pin-weight\" operator=\"out\" result=\"lower\"/><feComposite in=\"upper\" in2=\"lower\" operator=\"arithmetic\" k2=\"1\" k3=\"1\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ]
    ]
  },
  "moving-light": {
    "title": "Moving light",
    "description": "A travelling light catches the existing contour. The silhouette stays still; its surface highlight moves.",
    "levels": [
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"4\" result=\"bump\"/><feSpecularLighting in=\"bump\" surfaceScale=\"25\" specularConstant=\"1.7\" specularExponent=\"6\" lighting-color=\"#ffffff\" result=\"shine\"><fePointLight x=\"-200\" y=\"-30\" z=\"160\"><animate attributeName=\"x\" values=\"-200;1400;-200\" dur=\"12.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"y\" values=\"-30;180;-30\" dur=\"17.665699999999998s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></fePointLight></feSpecularLighting><feComponentTransfer in=\"shine\" result=\"gentle-shine\"><feFuncR type=\"linear\" slope=\"0.3\"/><feFuncG type=\"linear\" slope=\"0.3\"/><feFuncB type=\"linear\" slope=\"0.3\"/></feComponentTransfer><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"light-weight\"/><feComposite in=\"gentle-shine\" in2=\"light-weight\" operator=\"in\" result=\"upper-shine\"/><feBlend in=\"SourceGraphic\" in2=\"upper-shine\" mode=\"screen\" result=\"lit\"/><feColorMatrix in=\"lit\" type=\"matrix\" values=\"1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 1\" result=\"opaque-paint\"/><feComposite in=\"opaque-paint\" in2=\"SourceAlpha\" operator=\"in\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ],
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"4\" result=\"bump\"/><feSpecularLighting in=\"bump\" surfaceScale=\"25\" specularConstant=\"1.7\" specularExponent=\"6\" lighting-color=\"#ffffff\" result=\"shine\"><fePointLight x=\"-200\" y=\"-30\" z=\"160\"><animate attributeName=\"x\" values=\"-200;1400;-200\" dur=\"9.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"y\" values=\"-30;180;-30\" dur=\"12.936300000000001s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></fePointLight></feSpecularLighting><feComponentTransfer in=\"shine\" result=\"gentle-shine\"><feFuncR type=\"linear\" slope=\"0.6\"/><feFuncG type=\"linear\" slope=\"0.6\"/><feFuncB type=\"linear\" slope=\"0.6\"/></feComponentTransfer><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"light-weight\"/><feComposite in=\"gentle-shine\" in2=\"light-weight\" operator=\"in\" result=\"upper-shine\"/><feBlend in=\"SourceGraphic\" in2=\"upper-shine\" mode=\"screen\" result=\"lit\"/><feColorMatrix in=\"lit\" type=\"matrix\" values=\"1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 1\" result=\"opaque-paint\"/><feComposite in=\"opaque-paint\" in2=\"SourceAlpha\" operator=\"in\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ],
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"4\" result=\"bump\"/><feSpecularLighting in=\"bump\" surfaceScale=\"25\" specularConstant=\"1.7\" specularExponent=\"6\" lighting-color=\"#ffffff\" result=\"shine\"><fePointLight x=\"-200\" y=\"-30\" z=\"160\"><animate attributeName=\"x\" values=\"-200;1400;-200\" dur=\"6.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/><animate attributeName=\"y\" values=\"-30;180;-30\" dur=\"9.319700000000001s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.45 0 0.55 1;0.45 0 0.55 1\"/></fePointLight></feSpecularLighting><feComponentTransfer in=\"shine\" result=\"gentle-shine\"><feFuncR type=\"linear\" slope=\"1\"/><feFuncG type=\"linear\" slope=\"1\"/><feFuncB type=\"linear\" slope=\"1\"/></feComponentTransfer><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"light-weight\"/><feComposite in=\"gentle-shine\" in2=\"light-weight\" operator=\"in\" result=\"upper-shine\"/><feBlend in=\"SourceGraphic\" in2=\"upper-shine\" mode=\"screen\" result=\"lit\"/><feColorMatrix in=\"lit\" type=\"matrix\" values=\"1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 1\" result=\"opaque-paint\"/><feComposite in=\"opaque-paint\" in2=\"SourceAlpha\" operator=\"in\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ]
    ]
  },
  "variation-light-moon": {
    "title": "Distant light",
    "description": "A broad distant light changes its angle and elevation.",
    "levels": [
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"3\" result=\"bump\"/><feSpecularLighting in=\"bump\" surfaceScale=\"18\" specularConstant=\"1.8\" specularExponent=\"4\" lighting-color=\"#9bceff\" result=\"light\"><feDistantLight azimuth=\"40\" elevation=\"35\"><animate attributeName=\"azimuth\" values=\"40;320;40\" dur=\"20.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.42 0 0.58 1;0.42 0 0.58 1\"/><animate attributeName=\"elevation\" values=\"20;48;20\" dur=\"13.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.42 0 0.58 1;0.42 0 0.58 1\"/></feDistantLight></feSpecularLighting><feComponentTransfer in=\"light\" result=\"scaled-light\"><feFuncR type=\"linear\" slope=\"0.32\"/><feFuncG type=\"linear\" slope=\"0.32\"/><feFuncB type=\"linear\" slope=\"0.32\"/></feComponentTransfer><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"light-weight\"/><feComposite in=\"scaled-light\" in2=\"light-weight\" operator=\"in\" result=\"upper-light\"/><feBlend in=\"SourceGraphic\" in2=\"upper-light\" mode=\"screen\" result=\"lit\"/><feColorMatrix in=\"lit\" type=\"matrix\" values=\"1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 1\" result=\"opaque-paint\"/><feComposite in=\"opaque-paint\" in2=\"SourceAlpha\" operator=\"in\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ],
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"3\" result=\"bump\"/><feSpecularLighting in=\"bump\" surfaceScale=\"18\" specularConstant=\"1.8\" specularExponent=\"4\" lighting-color=\"#9bceff\" result=\"light\"><feDistantLight azimuth=\"40\" elevation=\"35\"><animate attributeName=\"azimuth\" values=\"40;320;40\" dur=\"20.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.42 0 0.58 1;0.42 0 0.58 1\"/><animate attributeName=\"elevation\" values=\"20;48;20\" dur=\"13.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.42 0 0.58 1;0.42 0 0.58 1\"/></feDistantLight></feSpecularLighting><feComponentTransfer in=\"light\" result=\"scaled-light\"><feFuncR type=\"linear\" slope=\"0.65\"/><feFuncG type=\"linear\" slope=\"0.65\"/><feFuncB type=\"linear\" slope=\"0.65\"/></feComponentTransfer><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"light-weight\"/><feComposite in=\"scaled-light\" in2=\"light-weight\" operator=\"in\" result=\"upper-light\"/><feBlend in=\"SourceGraphic\" in2=\"upper-light\" mode=\"screen\" result=\"lit\"/><feColorMatrix in=\"lit\" type=\"matrix\" values=\"1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 1\" result=\"opaque-paint\"/><feComposite in=\"opaque-paint\" in2=\"SourceAlpha\" operator=\"in\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ],
      [
        "<filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"3\" result=\"bump\"/><feSpecularLighting in=\"bump\" surfaceScale=\"18\" specularConstant=\"1.8\" specularExponent=\"4\" lighting-color=\"#9bceff\" result=\"light\"><feDistantLight azimuth=\"40\" elevation=\"35\"><animate attributeName=\"azimuth\" values=\"40;320;40\" dur=\"20.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.42 0 0.58 1;0.42 0 0.58 1\"/><animate attributeName=\"elevation\" values=\"20;48;20\" dur=\"13.7s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0;0.5;1\" keySplines=\"0.42 0 0.58 1;0.42 0 0.58 1\"/></feDistantLight></feSpecularLighting><feComponentTransfer in=\"light\" result=\"scaled-light\"><feFuncR type=\"linear\" slope=\"1\"/><feFuncG type=\"linear\" slope=\"1\"/><feFuncB type=\"linear\" slope=\"1\"/></feComponentTransfer><feImage href=\"@IMAGE0@\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" preserveAspectRatio=\"none\" result=\"light-weight\"/><feComposite in=\"scaled-light\" in2=\"light-weight\" operator=\"in\" result=\"upper-light\"/><feBlend in=\"SourceGraphic\" in2=\"upper-light\" mode=\"screen\" result=\"lit\"/><feColorMatrix in=\"lit\" type=\"matrix\" values=\"1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 1\" result=\"opaque-paint\"/><feComposite in=\"opaque-paint\" in2=\"SourceAlpha\" operator=\"in\"/></filter>",
        "<g filter=\"url(#@ID@)\">@USE@</g>"
      ]
    ]
  },
  "creative-iridescent": {
    "title": "Iridescent ribbon",
    "description": "A broad ribbon of shifting color rolls across the surface.",
    "levels": [
      [
        "<linearGradient id=\"@ID@-fade\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"white\"/><stop offset=\"0.38\" stop-color=\"white\"/><stop offset=\"0.925\" stop-color=\"white\" stop-opacity=\"0\"/></linearGradient><mask id=\"@ID@-surface\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" style=\"mask-type:alpha\">@USE@</mask><mask id=\"@ID@-upper\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" style=\"mask-type:alpha\"><rect width=\"1200\" height=\"320\" fill=\"url(#@ID@-fade)\"/></mask><linearGradient id=\"@ID@-ribbon\" gradientUnits=\"userSpaceOnUse\" x1=\"0\" y1=\"0\" x2=\"500\" y2=\"180\" spreadMethod=\"reflect\"><stop stop-color=\"#66ddff\" stop-opacity=\"0\"/><stop offset=\"0.35\" stop-color=\"#a3e9ff\"/><stop offset=\"0.5\" stop-color=\"#f5c4ff\"/><stop offset=\"0.65\" stop-color=\"#ffe4a2\"/><stop offset=\"1\" stop-color=\"#ffe4a2\" stop-opacity=\"0\"/><animateTransform attributeName=\"gradientTransform\" type=\"translate\" values=\"-600 0;600 0;-600 0\" dur=\"17.1s\" repeatCount=\"indefinite\"/></linearGradient>",
        "<g mask=\"url(#@ID@-surface)\"><rect width=\"1200\" height=\"320\" fill=\"currentColor\"/><g mask=\"url(#@ID@-upper)\"><rect width=\"1200\" height=\"320\" fill=\"url(#@ID@-ribbon)\" opacity=\"0.18200000000000002\"/></g></g>"
      ],
      [
        "<linearGradient id=\"@ID@-fade\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"white\"/><stop offset=\"0.38\" stop-color=\"white\"/><stop offset=\"0.925\" stop-color=\"white\" stop-opacity=\"0\"/></linearGradient><mask id=\"@ID@-surface\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" style=\"mask-type:alpha\">@USE@</mask><mask id=\"@ID@-upper\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" style=\"mask-type:alpha\"><rect width=\"1200\" height=\"320\" fill=\"url(#@ID@-fade)\"/></mask><linearGradient id=\"@ID@-ribbon\" gradientUnits=\"userSpaceOnUse\" x1=\"0\" y1=\"0\" x2=\"500\" y2=\"180\" spreadMethod=\"reflect\"><stop stop-color=\"#66ddff\" stop-opacity=\"0\"/><stop offset=\"0.35\" stop-color=\"#a3e9ff\"/><stop offset=\"0.5\" stop-color=\"#f5c4ff\"/><stop offset=\"0.65\" stop-color=\"#ffe4a2\"/><stop offset=\"1\" stop-color=\"#ffe4a2\" stop-opacity=\"0\"/><animateTransform attributeName=\"gradientTransform\" type=\"translate\" values=\"-600 0;600 0;-600 0\" dur=\"17.1s\" repeatCount=\"indefinite\"/></linearGradient>",
        "<g mask=\"url(#@ID@-surface)\"><rect width=\"1200\" height=\"320\" fill=\"currentColor\"/><g mask=\"url(#@ID@-upper)\"><rect width=\"1200\" height=\"320\" fill=\"url(#@ID@-ribbon)\" opacity=\"0.325\"/></g></g>"
      ],
      [
        "<linearGradient id=\"@ID@-fade\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"white\"/><stop offset=\"0.38\" stop-color=\"white\"/><stop offset=\"0.925\" stop-color=\"white\" stop-opacity=\"0\"/></linearGradient><mask id=\"@ID@-surface\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" style=\"mask-type:alpha\">@USE@</mask><mask id=\"@ID@-upper\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" style=\"mask-type:alpha\"><rect width=\"1200\" height=\"320\" fill=\"url(#@ID@-fade)\"/></mask><linearGradient id=\"@ID@-ribbon\" gradientUnits=\"userSpaceOnUse\" x1=\"0\" y1=\"0\" x2=\"500\" y2=\"180\" spreadMethod=\"reflect\"><stop stop-color=\"#66ddff\" stop-opacity=\"0\"/><stop offset=\"0.35\" stop-color=\"#a3e9ff\"/><stop offset=\"0.5\" stop-color=\"#f5c4ff\"/><stop offset=\"0.65\" stop-color=\"#ffe4a2\"/><stop offset=\"1\" stop-color=\"#ffe4a2\" stop-opacity=\"0\"/><animateTransform attributeName=\"gradientTransform\" type=\"translate\" values=\"-600 0;600 0;-600 0\" dur=\"17.1s\" repeatCount=\"indefinite\"/></linearGradient>",
        "<g mask=\"url(#@ID@-surface)\"><rect width=\"1200\" height=\"320\" fill=\"currentColor\"/><g mask=\"url(#@ID@-upper)\"><rect width=\"1200\" height=\"320\" fill=\"url(#@ID@-ribbon)\" opacity=\"0.48750000000000004\"/></g></g>"
      ]
    ]
  },
  "creative-echo": {
    "title": "Directional echo",
    "description": "A small convolution kernel leans the edge in changing directions.",
    "levels": [
      [
        "<linearGradient id=\"@ID@-fade\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"white\"/><stop offset=\"0.38\" stop-color=\"white\"/><stop offset=\"0.925\" stop-color=\"white\" stop-opacity=\"0\"/></linearGradient><mask id=\"@ID@-surface\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" style=\"mask-type:alpha\">@USE@</mask><mask id=\"@ID@-upper\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" style=\"mask-type:alpha\"><rect width=\"1200\" height=\"320\" fill=\"url(#@ID@-fade)\"/></mask><filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feConvolveMatrix in=\"SourceGraphic\" order=\"3\" divisor=\"1\" bias=\"0\" edgeMode=\"none\" result=\"echo\"><animate attributeName=\"kernelMatrix\" values=\"0.3 0 0 0 0.7 0 0 0 0;0 0 0 0 0.7 0 0 0 0.3;0.3 0 0 0 0.7 0 0 0 0\" dur=\"8.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0.0;0.5;1.0\" keySplines=\"0.42 0 0.58 1;0.42 0 0.58 1\"/></feConvolveMatrix></filter><linearGradient id=\"@ID@-inverse\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"white\" stop-opacity=\"0\"/><stop offset=\"0.38\" stop-color=\"white\" stop-opacity=\"0\"/><stop offset=\"0.925\" stop-color=\"white\" stop-opacity=\"1\"/></linearGradient><mask id=\"@ID@-lower\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" style=\"mask-type:alpha\"><rect width=\"1200\" height=\"320\" fill=\"url(#@ID@-inverse)\"/></mask>",
        "<g style=\"isolation:isolate\"><g mask=\"url(#@ID@-lower)\">@USE@</g><g mask=\"url(#@ID@-upper)\" style=\"mix-blend-mode:plus-lighter\"><g class=\"cp-echo-x\" style=\"--echo-x:3.5px\"><g class=\"cp-echo-y\" style=\"--echo-y:-2.0px\"><g filter=\"url(#@ID@)\">@USE@</g></g></g></g></g>"
      ],
      [
        "<linearGradient id=\"@ID@-fade\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"white\"/><stop offset=\"0.38\" stop-color=\"white\"/><stop offset=\"0.925\" stop-color=\"white\" stop-opacity=\"0\"/></linearGradient><mask id=\"@ID@-surface\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" style=\"mask-type:alpha\">@USE@</mask><mask id=\"@ID@-upper\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" style=\"mask-type:alpha\"><rect width=\"1200\" height=\"320\" fill=\"url(#@ID@-fade)\"/></mask><filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feConvolveMatrix in=\"SourceGraphic\" order=\"3\" divisor=\"1\" bias=\"0\" edgeMode=\"none\" result=\"echo\"><animate attributeName=\"kernelMatrix\" values=\"0.3 0 0 0 0.7 0 0 0 0;0 0 0 0 0.7 0 0 0 0.3;0.3 0 0 0 0.7 0 0 0 0\" dur=\"8.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0.0;0.5;1.0\" keySplines=\"0.42 0 0.58 1;0.42 0 0.58 1\"/></feConvolveMatrix></filter><linearGradient id=\"@ID@-inverse\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"white\" stop-opacity=\"0\"/><stop offset=\"0.38\" stop-color=\"white\" stop-opacity=\"0\"/><stop offset=\"0.925\" stop-color=\"white\" stop-opacity=\"1\"/></linearGradient><mask id=\"@ID@-lower\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" style=\"mask-type:alpha\"><rect width=\"1200\" height=\"320\" fill=\"url(#@ID@-inverse)\"/></mask>",
        "<g style=\"isolation:isolate\"><g mask=\"url(#@ID@-lower)\">@USE@</g><g mask=\"url(#@ID@-upper)\" style=\"mix-blend-mode:plus-lighter\"><g class=\"cp-echo-x\" style=\"--echo-x:7.699999999999999px\"><g class=\"cp-echo-y\" style=\"--echo-y:-4.4px\"><g filter=\"url(#@ID@)\">@USE@</g></g></g></g></g>"
      ],
      [
        "<linearGradient id=\"@ID@-fade\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"white\"/><stop offset=\"0.38\" stop-color=\"white\"/><stop offset=\"0.925\" stop-color=\"white\" stop-opacity=\"0\"/></linearGradient><mask id=\"@ID@-surface\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" style=\"mask-type:alpha\">@USE@</mask><mask id=\"@ID@-upper\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" style=\"mask-type:alpha\"><rect width=\"1200\" height=\"320\" fill=\"url(#@ID@-fade)\"/></mask><filter id=\"@ID@\" filterUnits=\"userSpaceOnUse\" primitiveUnits=\"userSpaceOnUse\" x=\"-80\" y=\"-48\" width=\"1360\" height=\"416\" color-interpolation-filters=\"sRGB\"><feConvolveMatrix in=\"SourceGraphic\" order=\"3\" divisor=\"1\" bias=\"0\" edgeMode=\"none\" result=\"echo\"><animate attributeName=\"kernelMatrix\" values=\"0.3 0 0 0 0.7 0 0 0 0;0 0 0 0 0.7 0 0 0 0.3;0.3 0 0 0 0.7 0 0 0 0\" dur=\"8.3s\" repeatCount=\"indefinite\" calcMode=\"spline\" keyTimes=\"0.0;0.5;1.0\" keySplines=\"0.42 0 0.58 1;0.42 0 0.58 1\"/></feConvolveMatrix></filter><linearGradient id=\"@ID@-inverse\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"white\" stop-opacity=\"0\"/><stop offset=\"0.38\" stop-color=\"white\" stop-opacity=\"0\"/><stop offset=\"0.925\" stop-color=\"white\" stop-opacity=\"1\"/></linearGradient><mask id=\"@ID@-lower\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"1200\" height=\"320\" style=\"mask-type:alpha\"><rect width=\"1200\" height=\"320\" fill=\"url(#@ID@-inverse)\"/></mask>",
        "<g style=\"isolation:isolate\"><g mask=\"url(#@ID@-lower)\">@USE@</g><g mask=\"url(#@ID@-upper)\" style=\"mix-blend-mode:plus-lighter\"><g class=\"cp-echo-x\" style=\"--echo-x:12.6px\"><g class=\"cp-echo-y\" style=\"--echo-y:-7.2px\"><g filter=\"url(#@ID@)\">@USE@</g></g></g></g></g>"
      ]
    ]
  },
  "creative-sparks": {
    "title": "Lifted sparks",
    "description": "Small glowing sparks rise through and above the shape. Most suited to flames.",
    "counts": [36,52,72],
    "sizes": [2.4,3.2,4]
  }
};
const SD_MOTION_CSS = "\n.new-motion{transform-origin:0 0;--amplitude:.045;--lean:1deg;--period:8s;--tempo:1}\n.motion-light{--amplitude:.022;--lean:.5deg;--period:11s}\n.motion-strong{--amplitude:.075;--lean:1.6deg;--period:5.5s}\n.rock-motion{animation:water-rock calc(var(--period)*var(--tempo)) ease-in-out infinite}\n.pulse-motion{animation:water-pulse calc(var(--period)*.63*var(--tempo)) ease-in-out infinite}\n@keyframes water-rock{0%,100%{transform:skewX(calc(-1*var(--lean)))}50%{transform:skewX(var(--lean))}}\n@keyframes water-pulse{0%,100%{transform:scaleY(1)}50%{transform:scaleY(calc(1 + var(--amplitude)*.5))}}\n\n\n.cp-echo-x{animation:cp-echo-x calc(11.9s * var(--cp-tempo,1)) cubic-bezier(.42,0,.58,1) infinite}\n.cp-echo-y{animation:cp-echo-y calc(7.1s * var(--cp-tempo,1)) cubic-bezier(.42,0,.58,1) infinite}\n@keyframes cp-echo-x{0%,100%{transform:translateX(calc(-1 * var(--echo-x)))}50%{transform:translateX(var(--echo-x))}}\n@keyframes cp-echo-y{0%,100%{transform:translateY(0)}50%{transform:translateY(var(--echo-y))}}\n\n";

function initShapeDividersApp() {
    if (window.__shapeDividersAppInitialized) {
        return;
    }
    // All previews, canvas rasterizers and exports consume these SVG strings.
    // Prepare them before any UI state or bitmap cache reads the source data.
    prepareShapeDividerSvgs(svgDividers);
    window.__shapeDividersAppInitialized = true;
    // Resolve only after the first successful preview draw, including animation.
    let resolveInitialPreview;
    let rejectInitialPreview;
    const initialPreviewReady = new Promise((resolve, reject) => {
        resolveInitialPreview = resolve;
        rejectInitialPreview = reject;
    });
/* Runtime preview stylesheet */
const previewHost = document.querySelector('.htmlpreview > div');
if (!previewHost) {
    throw new Error('ShapeDividers: preview host was not found.');
}


// Shared links override local preview preferences; older links keep the local choice.
function normalizePreviewBackground(value) {
    return {
        mode:value?.mode === 'color' ? 'color' : 'image',
        image:Number.isInteger(value?.image) && value.image >= 0 && value.image < 6 ? value.image : 0,
        color:/^#[a-f\d]{6}$/i.test(value?.color || '') ? value.color.toLowerCase() : '#151a21'
    };
}
function readPreviewBackground(params, saved) {
    if (params.has('background')) {
        try { return normalizePreviewBackground(JSON.parse(params.get('background'))); }
        catch (_) { return normalizePreviewBackground(null); }
    }
    return normalizePreviewBackground(saved);
}
let previewBackgroundState = normalizePreviewBackground(null);

function buildShareUrl() {
    const params = new URLSearchParams();
    const keys = {
        long_axis:['longAxisValue','LongAxisValue'],
        short_axis:['shortAxisValue','ShortAxisValue'],
        position:['positionValue','PositionValue'],
        'flipped-checkbox':['flipped','Flipped'],
        'animate-checkbox':['animate','Animate'],
        animation_length:['animLength','AnimLength'],
        animation_long_axis:['animLongAxis','AnimLongAxis'],
        'one-direction-checkbox':['oneDirection','OneDirection'],
        'mirror-loop-checkbox':['mirrorLoop','MirrorLoop'],
        'depth-layers-checkbox':['depthLayers','DepthLayers'],
        'shape-color':['shapeColor','ShapeColor'],
        'gradient-checkbox':['gradient','Gradient'],
        'gradient-color':['gradientColor','GradientColor']
    };
    // Read controls directly: inactive viewport globals can be stale after
    // Responsive is switched off. Keep every viewport's settings in the link.
    ['', 'tablet', 'mobile'].forEach((prefix,index) => {
        params.set(prefix ? prefix+'DividerDirection' : 'dividerDirection',getCheckedDirection(prefix));
        Object.entries(keys).forEach(([field,names]) => {
            const input = document.getElementById(prefixedId(prefix,field));
            const value = input.type === 'checkbox' ? input.checked
                : input.type === 'color' ? input.value.slice(1) : input.value;
            params.set(prefix ? prefix+names[1] : names[0],value);
        });
        const shape = svgDividers[[shapeIndex,tabletShapeIndex,mobileShapeIndex][index]];
        params.set(['si','tsi','msi'][index],shape.si);
        params.set(prefix ? prefix+'ShapeRatio' : 'shapeRatio',String(shape.ratio).toUpperCase() === 'TRUE');
        const effects = readMotionEffects(prefix,{effective:false});
        const changed = Object.fromEntries(Object.entries(effects).filter(([field,value])=>value !== motionFields[field]));
        if (Object.keys(changed).length) params.set(prefix ? prefix+'Effects' : 'effects',JSON.stringify(changed));
    });
    const responsive = document.getElementById('mobile-ready').checked;
    params.set('background',JSON.stringify(previewBackgroundState));
    params.set('mobileReady',responsive);
    params.set('responsiveConfigured',alreadyChangedView);
    params.set('view',responsive ? ['desktop','tablet','mobile'][Math.max(0,getActiveViewIndex())] : 'desktop');
    return (window.location.pathname || '/')+'?'+params.toString()+window.location.hash;
}

async function updateURL(copyToClipboard = false) {
    const shareUrl = buildShareUrl();
    window.history.replaceState(window.history.state, 'shape', shareUrl);

    if (!copyToClipboard) {
        return true;
    }

    return writeClipboard(window.location.origin + shareUrl);
}

const queryString = window.location.search;

const urlParams = new URLSearchParams(queryString);
let urlStylesLoaded = false;

function checkRadioByValue(group, value) {
    const radio = [...group].find((item) => item.value === value);
    if (radio) {
        radio.checked = true;
    }
}



function setInputValueFromParam(id, param, transform = (value) => value) {
    if (!urlParams.has(param)) return;

    const input = document.getElementById(id);
    if (!input) return;

    input.value = transform(urlParams.get(param));
}

function setCheckboxFromParam(id, param) {
    if (!urlParams.has(param)) return;

    const input = document.getElementById(id);
    if (!input) return;

    input.checked = urlParams.get(param) === 'true';
}

function restoreViewportFromURL(prefix, paramPrefix, shapeParam) {
    const groupName = prefix ? prefix + 'dividerdirection' : 'dividerdirection';
    const key = (desktopKey, responsiveKey) =>
        prefix ? paramPrefix + responsiveKey : desktopKey;
    const directionParam = key('dividerDirection', 'DividerDirection');

    if (urlParams.has(directionParam) && genform[groupName]) {
        checkRadioByValue(
            genform[groupName],
            urlParams.get(directionParam)
        );
    }

    setInputValueFromParam(
        prefixedId(prefix, 'long_axis'),
        key('longAxisValue', 'LongAxisValue')
    );
    setInputValueFromParam(
        prefixedId(prefix, 'short_axis'),
        key('shortAxisValue', 'ShortAxisValue')
    );
    setInputValueFromParam(
        prefixedId(prefix, 'position'),
        key('positionValue', 'PositionValue')
    );
    setCheckboxFromParam(
        prefixedId(prefix, 'flipped-checkbox'),
        key('flipped', 'Flipped')
    );
    setCheckboxFromParam(
        prefixedId(prefix, 'animate-checkbox'),
        key('animate', 'Animate')
    );
    setCheckboxFromParam(prefixedId(prefix, 'depth-layers-checkbox'), key('depthLayers', 'DepthLayers'));
    setCheckboxFromParam(prefixedId(prefix, 'mirror-loop-checkbox'), key('mirrorLoop', 'MirrorLoop'));
    setCheckboxFromParam(
        prefixedId(prefix, 'one-direction-checkbox'),
        key('oneDirection', 'OneDirection')
    );
    setInputValueFromParam(
        prefixedId(prefix, 'animation_length'),
        key('animLength', 'AnimLength')
    );
    setInputValueFromParam(
        prefixedId(prefix, 'animation_long_axis'),
        key('animLongAxis', 'AnimLongAxis')
    );
    setInputValueFromParam(
        prefixedId(prefix, 'shape-color'),
        key('shapeColor', 'ShapeColor'),
        (value) => '#' + value
    );
    setInputValueFromParam(
        prefixedId(prefix, 'shape-color-code'),
        key('shapeColor', 'ShapeColor'),
        (value) => '#' + value
    );
    setCheckboxFromParam(
        prefixedId(prefix, 'gradient-checkbox'),
        key('gradient', 'Gradient')
    );
    setInputValueFromParam(
        prefixedId(prefix, 'gradient-color'),
        key('gradientColor', 'GradientColor'),
        (value) => '#' + value
    );
    setInputValueFromParam(
        prefixedId(prefix, 'gradient-color-code'),
        key('gradientColor', 'GradientColor'),
        (value) => '#' + value
    );

    if (urlParams.has(shapeParam)) {
        const restoredIndex = getShapeIndex(shapeParam);

        if (prefix === 'tablet') {
            tabletShapeIndex = restoredIndex;
        } else if (prefix === 'mobile') {
            mobileShapeIndex = restoredIndex;
        } else {
            shapeIndex = restoredIndex;
        }
    }

    const effectParam = urlParams.get(prefix ? prefix+'Effects' : 'effects');
    if (effectParam) {
        try {
            const effects = normalizeMotionEffects(JSON.parse(effectParam));
            Object.entries(effects).forEach(([field,value]) => {
                const input = document.getElementById(motionControlId(prefix,field));
                if (!input) return;
                if (typeof motionFields[field] === 'boolean') input.checked = value;
                else {
                    input.value = value;
                    const hex = document.getElementById(input.id+'-hex');
                    if (hex) hex.value = input.value;
                }
                if (input.tagName === 'SELECT') syncMotionChoice(input);
            });
        } catch (_) { /* Malformed share data leaves safe defaults in place. */ }
    }
    syncGradientControl(prefix);
}

function updateSettingsfromURL() {
    if (urlStylesLoaded) return;

    restoreViewportFromURL('', 'divider', 'si');
    restoreViewportFromURL('tablet', 'tablet', 'tsi');
    restoreViewportFromURL('mobile', 'mobile', 'msi');
    setCheckboxFromParam('mobile-ready','mobileReady');

    urlStylesLoaded = true;

    const responsiveEnabled =
        document.getElementById('mobile-ready').checked;

    viewsSelect.style.display = responsiveEnabled ? 'flex' : 'none';
    const selectedView = ['desktop','tablet','mobile'].indexOf(urlParams.get('view'));
    if (responsiveEnabled && selectedView >= 0) {
        views.forEach((view,index)=>view.classList.toggle('active',index === selectedView));
        viewsSettings.forEach((settings,index)=>{ settings.style.display = index === selectedView ? 'block' : 'none'; });
        previewerFrame.className = previewClasses[selectedView];
    }
    refreshRangeSliders();
}



function getShapeIndex(param) {
    const shapeId = urlParams.get(param);
    const index = svgDividers.findIndex((divider) => String(divider.si) === String(shapeId));
    return index >= 0 ? index : 0;
}

/* Form styling in part from https://codepen.io/dapacreative/pen/bdzYEe */
   
let oneDirection = false;
let dividerDirection, longAxisValue, shortAxisValue, positionValue, flipped, animate, animLength, animLongAxis, animHorName, animVerName, shapeDiv, shapeColor, gradient, gradientColor, shapeIndex, selectedShape, shapeRatio;

let tabletOneDirection = false;
let tabletDividerDirection, tabletLongAxisValue, tabletShortAxisValue, tabletPositionValue, tabletFlipped, tabletAnimate, tabletAnimLength, tabletAnimLongAxis, tabletShapeDiv, tabletShapeColor, tabletGradient, tabletGradientColor, tabletShapeIndex, tabletSelectedShape, tabletShapeRatio;

let mobileOneDirection = false;
let mobileDividerDirection, mobileLongAxisValue, mobileShortAxisValue, mobilePositionValue, mobileFlipped, mobileAnimate, mobileAnimLength, mobileAnimLongAxis, mobileShapeDiv, mobileShapeColor, mobileGradient, mobileGradientColor, mobileShapeIndex, mobileSelectedShape, mobileShapeRatio;

let mobileReady;


const genform = document.getElementById('genform');
if (!genform) {
    throw new Error('ShapeDividers: #genform was not found.');
}

// Insert beside the existing duration controls so embedded creator markup also
// receives the option without requiring its host page to be republished.
['', 'tablet', 'mobile'].forEach((prefix) => {
    const duration = document.getElementById(prefixedId(prefix, 'animation_length'));
    const id = prefixedId(prefix, 'one-direction-checkbox');
    if (!duration || document.getElementById(id)) return;
    duration.closest('.animation-length-container').insertAdjacentHTML('afterend',
        '<div class="row animation-direction-container">' +
        '<label for="' + id + '"><input type="checkbox" id="' + id + '"> ' +
        'One direction</label></div>' +
        '<div class="row animation-direction-container animation-mirror-container">' +
        '<label for="' + prefixedId(prefix, 'mirror-loop-checkbox') + '"><input type="checkbox" id="' + prefixedId(prefix, 'mirror-loop-checkbox') + '"> ' +
        'Seamless mirror</label></div>' +
        '<div class="row animation-direction-container animation-depth-container">' +
        '<label for="' + prefixedId(prefix, 'depth-layers-checkbox') + '"><input type="checkbox" id="' + prefixedId(prefix, 'depth-layers-checkbox') + '"> ' +
        'Depth layers</label></div>');
});
// One deformation, one edge treatment, and independent surface layers. Keeping
// the original artwork in a symbol lets every pass reference the previous pass.
const motionFields = {
    motion: 'scroll', edge: 'none', light: 'none', ribbon: false, sparks: false,
    intensity: '1', lightColor: '#9bceff', ribbonA: '#a3e9ff',
    ribbonB: '#f5c4ff', ribbonC: '#ffe4a2', sparkColor: '#ffdba0'
};
const motionChoices = {
    motion: ['none', 'scroll', 'rising', 'side-current', 'swell-map', 'surface-ripples', 'crossing-swells', 'uneven-swells', 'css-rock'],
    edge: ['none', 'contour-pulse', 'variation-contour-double', 'molten-edge', 'creative-echo'],
    light: ['none', 'moving-light', 'variation-light-moon']
};
const motionChoiceWidgets = new Map();
function describeMotionChoice(field, value) {
    if (field === 'intensity') return {
        '0':'Gentle movement and softer surface effects.',
        '1':'Balanced movement and surface effects.',
        '2':'Larger movement and stronger surface effects.'
    }[value] || '';
    return SD_MOTION_RECIPES[value]?.description || (value === 'scroll'
        ? 'Move the shape along its long axis. One direction, Seamless mirror and Depth layers can also use lighting, ribbons and sparks.'
        : {motion:'Keep the shape still while adding optional edge or surface effects.',edge:'Keep the original contour without an edge treatment.',light:'Keep the shape colors without an animated light.'}[field] || '');
}
function syncMotionChoice(select) {
    const widget = motionChoiceWidgets.get(select.id);
    if (!widget) return;
    const value = select.value;
    const disabled = select.disabled;
    if (widget.choices.getValue(true) !== value) {
        widget.tooltip?.hide();
        widget.choices.setChoiceByValue(value);
    }
    if (disabled !== widget.disabled) {
        widget.tooltip?.hide();
        if (disabled) widget.choices.disable();
        else widget.choices.enable();
        widget.disabled = disabled;
    }
}
function enhanceMotionChoices(stack) {
    Promise.all([loadShapeChoicesLibrary(),loadShapeTooltipLibrary()]).then(([Choices,tippy]) => {
        if (!Choices || !stack.isConnected) return;
        stack.querySelectorAll('select').forEach(select => {
            if (motionChoiceWidgets.has(select.id)) return;
            const field = select.dataset.motionField;
            const choices = new Choices(select, {
                searchEnabled:false,
                shouldSort:false,
                allowHTML:false,
                itemSelectText:'',
                labelId:select.id+'-label',
                position:'auto',
                callbackOnCreateTemplates:function() {
                    return {
                        choice:function(...args) {
                            const node = Choices.defaults.templates.choice.call(this,...args);
                            const description = describeMotionChoice(field,args[1].value);
                            node.dataset.sdChoiceHelp = description;
                            node.setAttribute('aria-description',description);
                            return node;
                        }
                    };
                }
            });
            const host = choices.containerOuter.element;
            const widget = {choices,tooltip:null,option:null,disabled:select.disabled};
            motionChoiceWidgets.set(select.id,widget);
            if (tippy) widget.tooltip = tippy(host, {
                content:'',allowHTML:false,ignoreAttributes:true,
                trigger:'manual',theme:'shapedividers',placement:'right',
                appendTo:()=>document.body,delay:0,duration:[120,90],
                maxWidth:300,offset:[0,10],zIndex:2147483647,
                aria:{content:'describedby',expanded:false},
                getReferenceClientRect:()=> (widget.option || host).getBoundingClientRect(),
                popperOptions:{modifiers:[{name:'preventOverflow',options:{padding:12}}]},
                onShow(instance) { visibleControlTooltips.add(instance); },
                onHide(instance) { visibleControlTooltips.delete(instance); },
                onDestroy(instance) { visibleControlTooltips.delete(instance); }
            });
            const show = option => {
                if (select.disabled || stack.hidden) return;
                widget.option = option || null;
                const description = option?.dataset.sdChoiceHelp || describeMotionChoice(field,select.value);
                widget.tooltip?.setContent(description);
                widget.tooltip?.show();
                widget.tooltip?.popperInstance?.update();
            };
            const hide = () => { widget.tooltip?.hide(); widget.option = null; };
            host.addEventListener('mouseenter',()=> { if (!choices.dropdown.isActive) show(null); });
            host.addEventListener('mouseleave',hide);
            host.addEventListener('focusin',()=> { if (!choices.dropdown.isActive) show(null); });
            host.addEventListener('focusout',event=> { if (!host.contains(event.relatedTarget)) hide(); });
            select.addEventListener('highlightChoice',event=> {
                if (choices.dropdown.isActive) show(event.detail.el);
            });
            select.addEventListener('showDropdown',()=> {
                // Respect the settings panel's viewport as well as the window:
                // Choices' default flip calculation only considers the window.
                const panel = stack.closest('.settings-panel');
                if (panel) {
                    const rect = host.getBoundingClientRect();
                    const bounds = panel.getBoundingClientRect();
                    const below = Math.min(bounds.bottom,window.innerHeight)-rect.bottom-12;
                    const above = rect.top-Math.max(bounds.top,0)-12;
                    const flip = below < 180 && above > below;
                    host.classList.toggle('is-flipped',flip);
                    choices.choiceList.element.style.maxHeight = Math.max(60,Math.min(250,flip ? above : below))+'px';
                }
                show(choices.dropdown.element.querySelector('.is-highlighted[data-choice]'));
            });
            select.addEventListener('hideDropdown',hide);
            select.addEventListener('change',hide);
            // Restore labels to the replacement combobox instead of focusing
            // the now-hidden native select when the label is clicked.
            const label = document.getElementById(select.id+'-label');
            label?.addEventListener('click',event=> {
                if (select.disabled) return;
                event.preventDefault();
                host.focus();
            });
            syncMotionChoice(select);
        });
    });
}

function motionControlId(prefix, field) { return prefixedId(prefix, 'motion-' + field); }
function normalizeMotionEffects(values) {
    const source = values && typeof values === 'object' && !Array.isArray(values) ? values : {};
    return Object.fromEntries(Object.entries(motionFields).map(([field,fallback])=> {
        const value = Object.hasOwn(source,field) ? source[field] : fallback;
        const valid = typeof fallback === 'boolean' ? typeof value === 'boolean'
            : motionChoices[field] ? motionChoices[field].includes(value)
            : field === 'intensity' ? ['0','1','2'].includes(value)
            : typeof value === 'string' && /^#[a-f\d]{6}$/i.test(value);
        return [field,valid ? value : fallback];
    }));
}
function readMotionEffects(prefix, {effective = true} = {}) {
    const result = {};
    Object.entries(motionFields).forEach(([field, fallback]) => {
        const input = document.getElementById(motionControlId(prefix, field));
        let value = typeof fallback === 'boolean' ? Boolean(input?.checked) : (input?.value || fallback);
        if (motionChoices[field] && !motionChoices[field].includes(value)) value = fallback;
        if (field === 'intensity' && !['0','1','2'].includes(value)) value = fallback;
        if (field.endsWith('Color') || /^ribbon[A-C]$/.test(field)) {
            if (!/^#[a-f\d]{6}$/i.test(value)) value = fallback;
        }
        result[field] = value;
    });
    const legacy = ['one-direction-checkbox','depth-layers-checkbox'].some(field => document.getElementById(prefixedId(prefix,field))?.checked);
    return effective && legacy ? {...result,motion:'scroll',edge:'none'} : result;
}
function hasMotionEffects(state) {
    const e = state.effects;
    return Boolean(state.animate && e && (e.motion !== 'scroll' || e.edge !== 'none' || e.light !== 'none' || e.ribbon || e.sparks));
}
function usesMotionEffects() { return getSvgExportStates().some(hasMotionEffects); }
function hasColoredMotionEffects() {
    return getSvgExportStates().some(s => hasMotionEffects(s) && (s.effects.light !== 'none' || s.effects.ribbon || s.effects.sparks));
}
function motionSelect(prefix, field, label) {
    const id = motionControlId(prefix, field);
    return '<div class="sd-motion-field"><label id="'+id+'-label" for="'+id+'">'+label+'</label><select id="'+id+'" data-motion-field="'+field+'">' +
        motionChoices[field].map(key => '<option value="'+key+'"'+(motionFields[field] === key ? ' selected' : '')+'>'+({none:'None',scroll:'Scrolling'}[key] || SD_MOTION_RECIPES[key].title)+'</option>').join('')+'</select></div>';
}
function motionColor(prefix, field, label) {
    const id = motionControlId(prefix, field);
    return '<div class="sd-motion-color-pair"><label class="sd-motion-color" for="'+id+'"><input type="color" id="'+id+'" value="'+motionFields[field]+'"><span>'+label+'</span></label><input class="sd-motion-hex" type="text" id="'+id+'-hex" value="'+motionFields[field]+'" aria-label="'+label+' hex code" maxlength="7" spellcheck="false"></div>';
}
function mountMotionControls(prefix) {
    const duration = document.getElementById(prefixedId(prefix, 'animation_length'));
    if (!duration) return;
    setControlTooltip(duration.closest('.animation-length-container'),
        'Speed of the animation. Lower is faster.',{focusable:false});
    if (document.getElementById(prefixedId(prefix, 'motion-stack'))) return;
    const id = prefixedId(prefix, 'motion-stack');
    const label = prefix || 'desktop';
    const html = '<fieldset class="sd-motion-stack" id="'+id+'" aria-label="'+label+' animation layers" hidden><legend>Animation layers <button type="button" class="sd-motion-info" aria-label="About animation layers">i</button></legend>'+
        motionSelect(prefix,'motion','Motion')+motionSelect(prefix,'edge','Edge')+motionSelect(prefix,'light','Lighting')+
        '<div class="sd-motion-light-colors">'+motionColor(prefix,'lightColor','Light color')+'</div>'+
        '<label class="sd-motion-check"><input type="checkbox" id="'+motionControlId(prefix,'ribbon')+'"> Iridescent ribbon</label>'+
        '<div class="sd-motion-ribbon-colors">'+motionColor(prefix,'ribbonA','Ribbon start')+motionColor(prefix,'ribbonB','Ribbon middle')+motionColor(prefix,'ribbonC','Ribbon end')+'</div>'+
        '<label class="sd-motion-check"><input type="checkbox" id="'+motionControlId(prefix,'sparks')+'"> Lifted sparks</label>'+
        '<div class="sd-motion-spark-colors">'+motionColor(prefix,'sparkColor','Spark color')+'</div>'+
        '<div class="sd-motion-field"><label id="'+motionControlId(prefix,'intensity')+'-label" for="'+motionControlId(prefix,'intensity')+'">Intensity</label><select id="'+motionControlId(prefix,'intensity')+'" data-motion-field="intensity"><option value="0">Light</option><option value="1" selected>Natural</option><option value="2">Strong</option></select></div></fieldset>';
    const mount = genform.querySelector('[data-motion-prefix="'+prefix+'"]');
    if (mount) mount.innerHTML = html;
    else duration.closest('.animation-length-container').insertAdjacentHTML('afterend',html);
    const stack = document.getElementById(id);
    stack.querySelectorAll('input[type="color"]').forEach(input => {
        const hex = document.getElementById(input.id+'-hex');
        input.addEventListener('input',()=>{ hex.value = input.value; });
        hex.addEventListener('input',()=>{
            const valid = /^#[a-f\d]{6}$/i.test(hex.value);
            hex.setAttribute('aria-invalid',String(!valid));
            if (valid) input.value = hex.value;
        });
    });
    // Choices dispatches change on the backing select; inputs use the form handlers.
    stack.querySelectorAll('select').forEach(input => input.addEventListener('change',updateShape));
    setControlTooltip(stack.querySelector('.sd-motion-info'),'Combine one motion, one edge treatment and optional surface effects.');
    enhanceMotionChoices(stack);
}
const controlTooltips = new WeakMap();
const visibleControlTooltips = new Set();
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') visibleControlTooltips.forEach(instance => instance.hide());
});
function setControlTooltip(target, message, {focusable = true} = {}) {
    if (!target) return;
    target.removeAttribute('title');
    let record = controlTooltips.get(target);
    if (!record && !message) return;
    if (!record) {
        record = {message:'', instance:null, previousTabIndex:target.getAttribute('tabindex'), pending:false};
        controlTooltips.set(target, record);
    }
    record.message = message;
    target.classList.toggle('sd-tooltip-target', Boolean(message));
    if (!message) {
        record.instance?.destroy();
        record.instance = null;
        if (record.previousTabIndex === null) target.removeAttribute('tabindex');
        else target.setAttribute('tabindex',record.previousTabIndex);
        return;
    }
    // Disabled inputs/buttons cannot receive pointer or focus events. Their
    // wrappers receive both, while the actual controls stay disabled.
    if (focusable) target.tabIndex = 0;
    else if (record.previousTabIndex === null) target.removeAttribute('tabindex');
    else target.setAttribute('tabindex',record.previousTabIndex);
    if (record.instance) {
        record.instance.setContent(message);
        return;
    }
    if (record.pending) return;
    record.pending = true;
    loadShapeTooltipLibrary().then(tippy => {
        record.pending = false;
        if (!tippy || !record.message || !target.isConnected) return;
        record.instance = tippy(target, {
            content:record.message,
            allowHTML:false,
            ignoreAttributes:true,
            theme:'shapedividers',
            placement:'right',
            appendTo:() => document.body,
            trigger:'mouseenter focusin',
            delay:[150,0],
            duration:[120,90],
            maxWidth:300,
            offset:[0,10],
            zIndex:2147483647,
            aria:{content:'describedby',expanded:false},
            popperOptions:{modifiers:[{name:'preventOverflow',options:{padding:12}}]},
            onShow(instance) { visibleControlTooltips.add(instance); },
            onHide(instance) { visibleControlTooltips.delete(instance); },
            onDestroy(instance) { visibleControlTooltips.delete(instance); }
        });
        // Hover/focus may have started while the local bundle was loading.
        if (target.matches(':hover') || target === document.activeElement) record.instance.show();
    });
}
function setExportTooltip(tab, message) {
    if (!tab) return;
    let wrapper = tab.parentElement;
    if (!wrapper.classList.contains('sd-export-tooltip')) {
        wrapper = document.createElement('span');
        wrapper.className = 'sd-export-tooltip';
        wrapper.setAttribute('role','presentation');
        tab.before(wrapper);
        wrapper.appendChild(tab);
    }
    tab.removeAttribute('title');
    wrapper.setAttribute('aria-label',tab.textContent.trim()+' unavailable');
    if (message) wrapper.setAttribute('aria-describedby','export-depth-note');
    else { wrapper.removeAttribute('aria-describedby'); wrapper.removeAttribute('aria-label'); }
    setControlTooltip(wrapper,message);
}

// Also migrate older embedded creator HTML, so every tooltip uses Tippy
// even when the WordPress host has not yet picked up the latest fragment.
function initializeSharedTooltips() {
    const scopes = [document.getElementById('shape-divider-tool'),
        document.getElementById('export-modal'),document.getElementById('instruction')].filter(Boolean);
    scopes.forEach(scope => {
        scope.querySelectorAll('.ui-tooltip').forEach(source => {
            const target = source.closest('.sd-option-control, .tooltip-trigger, #instruction') || source.parentElement;
            const message = source.textContent.trim();
            if (target.classList.contains('sd-option-flip')) target.dataset.sdDisabledTooltip = message;
            else target.dataset.sdTooltip = message;
            if (source.id) {
                document.querySelectorAll('[aria-describedby]').forEach(element => {
                    const ids = element.getAttribute('aria-describedby').split(/\s+/).filter(id=>id !== source.id);
                    if (ids.length) element.setAttribute('aria-describedby',ids.join(' '));
                    else element.removeAttribute('aria-describedby');
                });
            }
            source.remove();
        });
        scope.querySelectorAll('.sd-responsive-control .sd-tooltip-anchor').forEach(icon=>icon.remove());
        [scope,...scope.querySelectorAll('[title]')].forEach(element => {
            if (!element.hasAttribute('title') || !element.getAttribute('title').trim()) return;
            element.dataset.sdTooltip = element.getAttribute('title');
            element.removeAttribute('title');
        });
        [scope,...scope.querySelectorAll('[data-sd-tooltip]')].forEach(target => {
            const message = target.dataset.sdTooltip;
            if (!message) return;
            setControlTooltip(target,message,{focusable:false});
        });
    });
}

function syncMotionControls(prefix, state) {
    const stack = document.getElementById(prefixedId(prefix,'motion-stack'));
    if (!stack) return;
    stack.hidden = !state.animate;
    const selected = hasMotionEffects(state);
    const legacy = state.oneDirection || state.depthLayers;
    const reason = 'Loop and depth modes use Scrolling. Lighting, ribbons and sparks remain available. Turn off One direction and Depth layers to use a different motion or an edge treatment.';
    stack.querySelectorAll('select,input:not(.choices__input)').forEach(input => {
        const field = input.dataset.motionField;
        input.disabled = legacy && (field === 'motion' || field === 'edge');
        input.removeAttribute('title');
        input.removeAttribute('aria-describedby');
        if (input.tagName === 'SELECT') {
            syncMotionChoice(input);
            setControlTooltip(input.closest('.sd-motion-field'),input.disabled ? reason : '');
        }
    });
    const descriptions = {
        'one-direction-checkbox':'Keep the shape moving in one direction.',
        'mirror-loop-checkbox':'Mirrors shapes without fading.',
        'depth-layers-checkbox':"Three heights and speeds. Ideal for shapes that don't already have opacity in them."
    };
    Object.entries(descriptions).forEach(([field,description]) => {
        const input = document.getElementById(prefixedId(prefix,field));
        const incompatible = field !== 'mirror-loop-checkbox' && selected && !legacy && (state.effects.motion !== 'scroll' || state.effects.edge !== 'none');
        input.disabled = incompatible;
        const row = input.closest('.row');
        row.removeAttribute('aria-describedby');
        row.querySelector('small')?.remove();
        setControlTooltip(row, incompatible ? 'Choose Scrolling and no edge treatment to use this mode. Lighting, ribbons and sparks can stay on.' : description, {focusable:incompatible});
    });
    stack.querySelector('.sd-motion-light-colors').hidden = state.effects.light === 'none';
    stack.querySelector('.sd-motion-ribbon-colors').hidden = !state.effects.ribbon;
    stack.querySelector('.sd-motion-spark-colors').hidden = !state.effects.sparks;
    ['ribbon','sparks'].forEach(field => {
        const input = document.getElementById(motionControlId(prefix,field));
        const recipe = SD_MOTION_RECIPES[field === 'ribbon' ? 'creative-iridescent' : 'creative-sparks'];
        setControlTooltip(input.closest('label'),recipe.description,{focusable:false});
    });
    setControlTooltip(stack,'');

}

function motionAnimate(attribute, values, seconds, smooth = true) {
    const count = values.split(';').length - 1;
    return '<animate attributeName="'+attribute+'" values="'+values+'" dur="'+seconds+'s" repeatCount="indefinite"'+(smooth ? ' calcMode="spline" keyTimes="'+Array.from({length:count+1},(_,i)=>i/count).join(';')+'" keySplines="'+Array(count).fill('0.42 0 0.58 1').join(';')+'"' : '')+'/>';
}
function buildMotionSvg(state, namespace, maskOnly = false) {
    const e = state.effects || {...motionFields, motion:'none'};
    const level = Number(e.intensity);
    const pace = Math.max(.1,Number(state.animationLength)||10)/10;
    let defs = '', serial = 0;
    const raw = normalizeSvgForCanvas(svgDividers[state.shapeIndex].bottom, 'ffffff');
    const root = new DOMParser().parseFromString(namespaceInlineSvgIds(replaceInlineSvgColorsWithCurrentColor(raw), namespace+'-source'), 'image/svg+xml').documentElement;
    const viewBox = root.getAttribute('viewBox') || '0 0 1200 320';
    const preserve = root.getAttribute('preserveAspectRatio') || 'none';
    const symbol = '<symbol id="'+namespace+'-art" viewBox="'+viewBox+'" preserveAspectRatio="'+preserve+'" fill="currentColor">'+root.innerHTML+'</symbol>';
    defs += symbol;
    // Headroom for all effects; the original section join is at y=320.
    const original = '<use href="#'+namespace+'-art" x="0" y="32" width="1200" height="288"/>';
    let current = original;
    function stage(key) {
        if (!SD_MOTION_RECIPES[key]) return;
        const id = namespace+'-pass-'+serial++;
        defs += '<g id="'+id+'-input">'+current+'</g>';
        const input = '<use href="#'+id+'-input"/>';
        const replace = value => value.replaceAll('@ID@',id).replaceAll('@USE@',input)
            .replace(/@IMAGE(\d+)@/g,(_,n)=>SD_MOTION_IMAGES[Number(n)])
            .replace(/\bdur="([\d.]+)s"/g,(_,s)=>'dur="'+(Number(s)*pace)+'s"');
        const recipe = SD_MOTION_RECIPES[key].levels[level];
        const colors = value => value.replaceAll('#9bceff',e.lightColor).replaceAll('#ffffff',e.lightColor)
            .replaceAll('#a3e9ff',e.ribbonA).replaceAll('#f5c4ff',e.ribbonB).replaceAll('#ffe4a2',e.ribbonC)
            .replaceAll('#ffdba0',e.sparkColor).replaceAll('#fff3c4',e.sparkColor).replaceAll('#ffb479',e.sparkColor);
        defs += colors(replace(recipe[0]));
        current = colors(replace(recipe[1])).replace(/(--(?:flight|delay):)(-?[\d.]+)s/g,(_,field,s)=>field+(Number(s)*pace)+'s');
    }
    if (state.animate) {
        stage(e.motion);
        stage(e.edge);
    }
    // Complementary masks share a short transition above the fixed 7.5% foot.
    // Add their alpha instead of source-over blending: even translucent shapes
    // keep their original opacity, without two antialiased clip edges meeting.
    const topId = namespace+'-upper', footId = namespace+'-foot';
    for (const [id,inverse] of [[topId,false],[footId,true]]) {
        defs += '<linearGradient id="'+id+'-weight" gradientUnits="userSpaceOnUse" x1="0" y1="288" x2="0" y2="296"><stop stop-color="white" stop-opacity="'+(inverse ? 0 : 1)+'"/><stop offset="1" stop-color="white" stop-opacity="'+(inverse ? 1 : 0)+'"/></linearGradient>'+
            '<mask id="'+id+'" maskUnits="userSpaceOnUse" x="-80" y="-48" width="1360" height="416" style="mask-type:alpha"><rect x="-80" y="-48" width="1360" height="416" fill="url(#'+id+'-weight)"/></mask>';
    }
    current = '<g style="isolation:isolate"><g mask="url(#'+topId+')">'+current+'</g><g mask="url(#'+footId+')" style="mix-blend-mode:plus-lighter">'+original+'</g></g>';
    // Paint after geometry: gradients and original partial opacity survive edge
    // filters too. Masks use the same animated silhouette in the same document.
    const alphaId = namespace+'-alpha';
    defs += '<mask id="'+alphaId+'" maskUnits="userSpaceOnUse" x="-80" y="-48" width="1360" height="416" style="mask-type:alpha"><g color="white">'+current+'</g></mask>';
    let paint = '#'+state.color;
    if (state.gradient && !maskOnly) {
        defs += '<linearGradient id="'+namespace+'-paint" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#'+state.color+'"/><stop offset="1" stop-color="#'+state.gradientColor+'"/></linearGradient>';
        paint = 'url(#'+namespace+'-paint)';
    }
    current = '<rect width="1200" height="320" fill="'+(maskOnly ? 'white' : paint)+'" mask="url(#'+alphaId+')"/>';
    if (state.animate && !maskOnly) {
        if (e.ribbon) stage('creative-iridescent');
        stage(e.light);
    }
    let css = SD_MOTION_CSS.replace(/([\d.]+)s/g,(_,s)=>(Number(s)*pace)+'s');
    // Keep CSS recipes isolated across breakpoints and across multiple dividers.
    const prefixCss = text => text.replace(/\b(cp-[\w-]+|water-[\w-]+|new-motion|rock-motion|pulse-motion|motion-light|motion-strong)\b/g, name=>namespace+'-'+name);
    current = prefixCss(current); defs = prefixCss(defs); css = prefixCss(css);
    defs += '<mask id="'+namespace+'-rest" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="1200" height="320"><g color="white">'+original+'</g></mask>';
    const content = '<defs>'+defs+'</defs>'+current;
    const transforms = { bottom:'',top:'translate(0 320) scale(1 -1)',left:'translate(320 0) rotate(90)',right:'translate(0 1200) rotate(-90)' };
    const vertical = state.direction === 'left' || state.direction === 'right';
    const oriented = transforms[state.direction] ? '<g transform="'+transforms[state.direction]+'">'+content+'</g>' : content;
    // A still sibling also stops SMIL for reduced-motion users, since CSS cannot
    // pause SVG timelines. No script is included in any generated output.
    const still = '<rect width="1200" height="320" fill="'+(maskOnly ? 'white' : paint)+'" mask="url(#'+namespace+'-rest)"/>';
    const stillOriented = transforms[state.direction] ? '<g transform="'+transforms[state.direction]+'">'+still+'</g>' : still;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+(vertical ? '0 0 320 1200' : '0 0 1200 320')+'" preserveAspectRatio="none" aria-hidden="true" focusable="false">'+
        '<style>'+css+'.'+namespace+'-still{display:none}@media(prefers-reduced-motion:reduce){.'+namespace+'-live{display:none}.'+namespace+'-still{display:inline}}</style>'+
        '<g class="'+namespace+'-live" color="#'+state.color+'">'+oriented+'</g><g class="'+namespace+'-still">'+stillOriented+'</g></svg>';
}

// Sparks have their own viewport-sized layer. Shape scaling and scrolling never
// stretch their dots, thin out their density or carry them out of the viewport.
function getMotionSparksLayout(state, namespace) {
    const layout = getSvgStateDeclarations({...state,animate:false,flipped:false,longAxis:100},namespace);
    layout.declarations['z-index'] = '4';
    return layout;
}
function buildMotionSparksSvg(state, namespace) {
    const e = state.effects || motionFields;
    if (!state.animate || !e.sparks) return '';
    const level = Number(e.intensity);
    const count = SD_MOTION_RECIPES['creative-sparks'].counts[level];
    const size = SD_MOTION_RECIPES['creative-sparks'].sizes[level];
    const pace = Math.max(.1,Number(state.animationLength)||10)/10;
    const name = namespace+'-spark';
    const particles = Array.from({length:count},(_,i) => {
        const x = ((i+.5)*1200/count).toFixed(2);
        const flight = (4.7+(i%7)*.47)*pace;
        const delay = -flight*((i*.61803398875)%1);
        const drift = ((i*17)%49)-24;
        // A tiny round-capped stroke stays circular in screen pixels, including
        // vertical dividers and very short or wide SVG viewports.
        return '<g transform="translate('+x+' 0)"><path class="'+name+'" d="M0 0h.001" fill="none" stroke="'+e.sparkColor+'" stroke-width="'+(size*(.7+(i%4)*.1)).toFixed(2)+'" stroke-linecap="round" vector-effect="non-scaling-stroke" style="--flight:'+flight+'s;--delay:'+delay+'s;--drift:'+drift+'px"/></g>';
    }).join('');
    const transforms = {bottom:'',top:'translate(0 320) scale(1 -1)',left:'translate(320 0) rotate(90)',right:'translate(0 1200) rotate(-90)'};
    const vertical = state.direction === 'left' || state.direction === 'right';
    const css = '.'+name+'{animation:'+name+' var(--flight) linear infinite;animation-delay:var(--delay)}@keyframes '+name+'{0%{transform:translate(0,260px);opacity:0}15%{opacity:.8}55%{opacity:.6}75%,100%{opacity:0}100%{transform:translate(var(--drift),-25px)}}@media(prefers-reduced-motion:reduce){.'+namespace+'{display:none!important}}';
    return '<svg xmlns="http://www.w3.org/2000/svg" class="'+namespace+'" viewBox="'+(vertical ? '0 0 320 1200' : '0 0 1200 320')+'" preserveAspectRatio="none" aria-hidden="true" focusable="false"><style>'+css+'</style><g transform="'+transforms[state.direction]+'">'+particles+'</g></svg>';
}

function getMotionLayout(state, namespace) {
    // Scrolling can carry edge and light layers; local motion uses the usual
    // static size and position controls rather than enlarging the filter field.
    const effects = state.effects || motionFields;
    return getSvgStateDeclarations({...state, animate:state.animate && effects.motion === 'scroll', flipped:state.flipped && !state.animate},namespace);
}
function buildMotionExportCode(format) {
    const states = getSvgExportStates();
    if (format === 'svg' && states.some(state=>hasMotionEffects(state) && (state.oneDirection || state.depthLayers))) return buildPairedExportCode('svg');
    const wrapper = shapeCSSName+'-'+format;
    const ordered = mobileReady ? [states[2],states[1],states[0]] : states;
    const rules = ['.'+wrapper+'{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:3}'];
    const markup = [];
    preparedMaskFiles = [];
    ordered.forEach((state,index) => {
        const id = wrapper+'-'+state.key;
        const layout = getMotionLayout(state,id);
        const motion = hasMotionEffects(state);
        let svg;
        if (motion) svg = buildMotionSvg(state,id,format === 'mask');
        else {
            // Responsive breakpoints without new layers keep every legacy loop.
            const all = state.animate && (state.oneDirection || state.depthLayers);
            if (all) {
                // The shared paired exporter already handles mirrors and depths.
                svg = buildPairedExportCode('svg', [state], id+'-legacy');
            } else {
                svg = getPlainExportSvg(state.shapeIndex,state.direction,id+'-art',state.gradient,state.color,state.gradientColor);
            }
        }
        const css = layout.declarations;
        if (motion || !(state.animate && (state.oneDirection || state.depthLayers))) {
            svg = addClassToInlineSvg(svg,id+'-art');
            rules.push(formatDeclarationRule('.'+id+'-art',css));
            if (layout.keyframes) rules.push(layout.keyframes);
        }
        rules.push('.'+id+'{display:'+(index ? 'none' : 'block')+';position:absolute;inset:0}');
        if (index) rules.push('@media(min-width:'+(index === 1 ? 768 : 1025)+'px){.'+wrapper+' > div{display:none}.'+wrapper+' > .'+id+'{display:block}}');
        if (format === 'mask' && motion) {
            // Inline masks retain declarative animation; external CSS mask images
            // cannot reliably run SVG filter timelines.
            const paint = state.gradient ? 'url(#'+id+'-mask-paint)' : '#'+state.color;
            const vector = {bottom:'x1="0" y1="1" x2="0" y2="0"',top:'x1="0" y1="0" x2="0" y2="1"',left:'x1="0" y1="0" x2="1" y2="0"',right:'x1="1" y1="0" x2="0" y2="0"'}[state.direction];
            const gradient = state.gradient ? '<linearGradient id="'+id+'-mask-paint" '+vector+'><stop stop-color="#'+state.color+'"/><stop offset="1" stop-color="#'+state.gradientColor+'"/></linearGradient>' : '';
            const vertical = state.direction === 'left' || state.direction === 'right';
            const w = vertical ? 320 : 1200, h = vertical ? 1200 : 320;
            svg = '<svg xmlns="http://www.w3.org/2000/svg" class="'+id+'-art" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><defs>'+gradient+'<mask id="'+id+'-mask" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="'+w+'" height="'+h+'">'+svg.replace(/class="[^"]*-art" /,'').replace('<svg ','<svg width="'+w+'" height="'+h+'" ')+'</mask></defs><rect width="'+w+'" height="'+h+'" fill="'+paint+'" mask="url(#'+id+'-mask)"/></svg>';
        }
        let sparks = '';
        if (motion && format === 'svg') {
            sparks = buildMotionSparksSvg(state,id+'-sparks');
            if (sparks) rules.push(formatDeclarationRule('.'+id+'-sparks',getMotionSparksLayout(state,id+'-sparks').declarations));
        }
        markup.push('<div class="'+id+'">'+svg+sparks+'</div>');
    });
    rules.push('@media(prefers-reduced-motion:reduce){.'+wrapper+' svg{animation:none!important;transform:none!important}}');
    return '<style>\n'+rules.join('\n')+'\n</style>\n<div class="'+wrapper+'">'+markup.join('\n')+'</div>';
}

['', 'tablet', 'mobile'].forEach(mountMotionControls);
const formEntries = document.querySelectorAll("#genform input");
const directionEntry = document.querySelectorAll(".row.radio input");

dividerDirection = 'bottom';
tabletDividerDirection = 'bottom';
mobileDividerDirection = 'bottom';
shapeIndex = 0;
tabletShapeIndex = 0;
mobileShapeIndex = 0;
mobileReady = false;

let colorPicker = document.getElementById('shape-color');
let colorCode = document.getElementById('shape-color-code');

colorPicker.addEventListener('input', function() {
   colorCode.value = colorPicker.value;
});

colorCode.addEventListener('input', function() {
   colorPicker.value = colorCode.value;
});

let mobileColorPicker = document.getElementById('mobile-shape-color');
let mobileColorCode = document.getElementById('mobile-shape-color-code');

mobileColorPicker.addEventListener('input', function() {
   mobileColorCode.value = mobileColorPicker.value;
});

mobileColorCode.addEventListener('input', function() {
   mobileColorPicker.value = mobileColorCode.value;
});

let tabletColorPicker = document.getElementById('tablet-shape-color');
let tabletColorCode = document.getElementById('tablet-shape-color-code');

tabletColorPicker.addEventListener('input', function() {
   tabletColorCode.value = tabletColorPicker.value;
});

tabletColorCode.addEventListener('input', function() {
   tabletColorPicker.value = tabletColorCode.value;
});

function bindColorPair(colorId, codeId) {
    const picker = document.getElementById(colorId);
    const code = document.getElementById(codeId);

    picker.addEventListener('input', function() {
        code.value = picker.value;
    });

    code.addEventListener('input', function() {
        picker.value = code.value;
    });
}

bindColorPair('gradient-color', 'gradient-color-code');
bindColorPair('tablet-gradient-color', 'tablet-gradient-color-code');
bindColorPair('mobile-gradient-color', 'mobile-gradient-color-code');

function syncGradientControl(prefix) {
    const checkbox = document.getElementById(
        prefixedId(prefix, 'gradient-checkbox')
    );
    const colorInput = document.getElementById(
        prefixedId(prefix, 'shape-color')
    );
    const colorRow = colorInput.closest('.color-row');

    if (colorRow) {
        colorRow.classList.toggle('gradient-enabled', checkbox.checked);
    }
}

['', 'tablet', 'mobile'].forEach((prefix) => {
    const checkbox = document.getElementById(
        prefixedId(prefix, 'gradient-checkbox')
    );

    checkbox.addEventListener('change', () => {
        syncGradientControl(prefix);
    });

    syncGradientControl(prefix);
});

const views = document.querySelectorAll('.view_select div');
const viewsSettings = document.querySelectorAll('.desktop_settings, .tablet_settings, .mobile_settings');


const previewerFrame = document.getElementById("responsive_view_framer");
const previewer = document.getElementById("previewer");
const colorDiv = document.querySelector('.color_div');
const dividerPreviewHost = document.querySelector('.image_div');
if (!dividerPreviewHost) {
    console.error('ShapeDividers: .image_div preview host was not found.');
    return;
}

const previewCanvas = document.createElement('canvas');
previewCanvas.className = 'shape-divider-canvas';
Object.assign(previewCanvas.style, {
    position: 'absolute',
    left: '-0.1vw',
    top: '-0.1vw',
    width: 'calc(100% + 0.2vw)',
    height: 'calc(100% + 0.2vw)',
    pointerEvents: 'none',
    zIndex: '4'
});
dividerPreviewHost.appendChild(previewCanvas);

const previewContext = previewCanvas.getContext('2d', {
    alpha: true,
    desynchronized: true
});

const BITMAP_BASE_LONG_SIDE = 8192;
const BITMAP_MAX_LONG_SIDE = 16384;

const BITMAP_CACHE_LIMIT = 2;
const bitmapCache = new Map();
const pendingBitmapRequests = new Map();

let activePreviewCacheKey = null;
let canvasRenderRevision = 0;
let animationFrameId = null;
let animationStartedAt = 0;
let latestPreviewState = null;

function normalizeSvgForCanvas(svgMarkup, color) {
    return svgMarkup
        .replaceAll('%23000000', '#' + color)
        .replaceAll('%23', '#');
}

function replaceSvgColorsWithPaint(svgMarkup, paint) {
    const paintAttributes =
        /\b(fill|stroke|color|stop-color|flood-color|lighting-color)=(["'])(.*?)\2/gi;

    const paintDeclarations =
        /\b(fill|stroke|color|stop-color|flood-color|lighting-color)\s*:\s*([^;"'}]+)/gi;

    function shouldReplacePaint(value) {
        const normalized = String(value).trim().toLowerCase();

        return !(
            normalized === '' ||
            normalized === 'none' ||
            normalized === 'transparent' ||
            normalized === 'inherit' ||
            (
                normalized === 'currentcolor' &&
                String(paint).toLowerCase() === 'currentcolor'
            ) ||
            normalized.startsWith('url(') ||
            normalized.startsWith('var(')
        );
    }

    return svgMarkup
        .replace(paintAttributes, (match, property, quote, value) => {
            if (!shouldReplacePaint(value)) return match;
            return property + '=' + quote + paint + quote;
        })
        .replace(paintDeclarations, (match, property, value) => {
            if (!shouldReplacePaint(value)) return match;
            return property + ':' + paint;
        });
}

function getSvgViewBoxMetrics(svgMarkup) {
    const viewBoxMatch = svgMarkup.match(
        /\bviewBox=(["'])([^"']+)\1/i
    );

    if (!viewBoxMatch) {
        return {
            minX: 0,
            minY: 0,
            width: 1,
            height: 1
        };
    }

    const values = viewBoxMatch[2]
        .trim()
        .split(/[\s,]+/)
        .map(Number);

    if (
        values.length !== 4 ||
        values.some((value) => !Number.isFinite(value))
    ) {
        return {
            minX: 0,
            minY: 0,
            width: 1,
            height: 1
        };
    }

    const [minX, minY, width, height] = values;

    return {
        minX,
        minY,
        width: width || 1,
        height: height || 1
    };
}

function getGradientVector(direction, viewBox) {
    const { minX, minY, width, height } = viewBox;

    if (direction === 'bottom') {
        return {
            x1: minX,
            y1: minY + height,
            x2: minX,
            y2: minY
        };
    }

    if (direction === 'left') {
        return {
            x1: minX,
            y1: minY,
            x2: minX + width,
            y2: minY
        };
    }

    if (direction === 'right') {
        return {
            x1: minX + width,
            y1: minY,
            x2: minX,
            y2: minY
        };
    }

    return {
        x1: minX,
        y1: minY,
        x2: minX,
        y2: minY + height
    };
}

function addGradientToSvg(
    svgMarkup,
    startColor,
    endColor,
    direction,
    gradientId
) {
    const viewBox = getSvgViewBoxMetrics(svgMarkup);
    const vector = getGradientVector(direction, viewBox);
    const paintedSvg = replaceSvgColorsWithPaint(
        svgMarkup,
        'url(#' + gradientId + ')'
    );
    const formatGradientColor = (value) =>
        String(value).startsWith('var(') ? value : '#' + value;

    const gradientMarkup =
        '<defs><linearGradient id="' + gradientId + '"' +
        ' gradientUnits="userSpaceOnUse"' +
        ' x1="' + vector.x1 + '" y1="' + vector.y1 + '"' +
        ' x2="' + vector.x2 + '" y2="' + vector.y2 + '">' +
        '<stop offset="0%" stop-color="' +
        formatGradientColor(startColor) + '"/>' +
        '<stop offset="100%" stop-color="' +
        formatGradientColor(endColor) + '"/>' +
        '</linearGradient></defs>';

    return paintedSvg.replace(
        /<svg\b([^>]*)>/i,
        (match) => match + gradientMarkup
    );
}

function buildShapeSvgMarkup(
    rawSvg,
    color,
    gradientEnabled,
    endColor,
    direction,
    gradientId = 'sd-gradient'
) {
    const normalizedSvg = normalizeSvgForCanvas(rawSvg, color);

    if (!gradientEnabled) {
        return normalizedSvg;
    }

    return addGradientToSvg(
        normalizedSvg,
        color,
        endColor,
        direction,
        gradientId
    );
}

function encodeSvgForCss(svgMarkup) {
    return svgMarkup.replaceAll('#', '%23');
}

function getSvgAspectRatio(svgMarkup) {
    const viewBoxMatch = svgMarkup.match(
        /viewBox=["']\s*[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)\s*["']/i
    );

    if (viewBoxMatch) {
        const width = Number(viewBoxMatch[1]);
        const height = Number(viewBoxMatch[2]);
        if (width > 0 && height > 0) return width / height;
    }

    const widthMatch = svgMarkup.match(/\bwidth=["']([\d.]+)/i);
    const heightMatch = svgMarkup.match(/\bheight=["']([\d.]+)/i);
    const width = widthMatch ? Number(widthMatch[1]) : 0;
    const height = heightMatch ? Number(heightMatch[1]) : 0;

    return width > 0 && height > 0 ? width / height : 1;
}


function getPreserveAspectRatio(svgMarkup) {
    const match = svgMarkup.match(/preserveAspectRatio=["']\s*([^"']+)\s*["']/i);
    const value = match ? match[1].trim() : 'xMidYMid meet';

    if (value === 'none') {
        return {
            none: true,
            alignX: 'Mid',
            alignY: 'Mid',
            mode: 'meet'
        };
    }

    const parts = value.split(/\s+/);
    const align = parts[0] || 'xMidYMid';
    const mode = parts.includes('slice') ? 'slice' : 'meet';

    const alignMatch = align.match(/^x(Min|Mid|Max)Y(Min|Mid|Max)$/i);

    return {
        none: false,
        alignX: alignMatch ? alignMatch[1] : 'Mid',
        alignY: alignMatch ? alignMatch[2] : 'Mid',
        mode
    };
}

function alignmentOffset(extraSpace, alignment) {
    if (alignment === 'Min') return 0;
    if (alignment === 'Max') return extraSpace;
    return extraSpace / 2;
}

function drawImagePreservingSvgAspectRatio(
    context,
    bitmap,
    destinationX,
    destinationY,
    destinationWidth,
    destinationHeight,
    preserveAspectRatio
) {
    if (
        preserveAspectRatio.none ||
        destinationWidth <= 0 ||
        destinationHeight <= 0 ||
        bitmap.width <= 0 ||
        bitmap.height <= 0
    ) {
        context.drawImage(
            bitmap,
            destinationX,
            destinationY,
            destinationWidth,
            destinationHeight
        );
        return;
    }

    const sourceRatio = bitmap.width / bitmap.height;
    const destinationRatio = destinationWidth / destinationHeight;
    const useWidthAsConstraint =
        preserveAspectRatio.mode === 'meet'
            ? sourceRatio > destinationRatio
            : sourceRatio < destinationRatio;

    if (preserveAspectRatio.mode === 'meet') {
        let renderedWidth;
        let renderedHeight;

        if (useWidthAsConstraint) {
            renderedWidth = destinationWidth;
            renderedHeight = destinationWidth / sourceRatio;
        } else {
            renderedHeight = destinationHeight;
            renderedWidth = destinationHeight * sourceRatio;
        }

        const extraX = destinationWidth - renderedWidth;
        const extraY = destinationHeight - renderedHeight;

        const drawX =
            destinationX +
            alignmentOffset(extraX, preserveAspectRatio.alignX);
        const drawY =
            destinationY +
            alignmentOffset(extraY, preserveAspectRatio.alignY);

        context.drawImage(
            bitmap,
            drawX,
            drawY,
            renderedWidth,
            renderedHeight
        );

        return;
    }

    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = bitmap.width;
    let sourceHeight = bitmap.height;

    if (useWidthAsConstraint) {
        sourceHeight = bitmap.width / destinationRatio;

        const extraSourceY = bitmap.height - sourceHeight;
        sourceY = alignmentOffset(
            extraSourceY,
            preserveAspectRatio.alignY
        );
    } else {
        sourceWidth = bitmap.height * destinationRatio;

        const extraSourceX = bitmap.width - sourceWidth;
        sourceX = alignmentOffset(
            extraSourceX,
            preserveAspectRatio.alignX
        );
    }

    context.drawImage(
        bitmap,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        destinationX,
        destinationY,
        destinationWidth,
        destinationHeight
    );
}

function getPreviewShortAxis(state) {
    const shortAxis = Math.max(0, Number(state.shortAxis) || 0);
    const horizontal = state.direction === 'top' || state.direction === 'bottom';

    // Match the exported desktop @media rule; responsive device previews
    // must keep their own short axis even on a wide browser window.
    if (
        horizontal &&
        getActiveViewIndex() <= 0 &&
        window.matchMedia('(min-width:2100px)').matches
    ) {
        return shortAxis + window.innerWidth * 0.02 * (state.depthScale || 1);
    }

    return shortAxis;
}

function getBitmapLongSide(state, bounds) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const horizontal = state.direction === 'top' || state.direction === 'bottom';
    const displayLongSide = horizontal ? bounds.width : bounds.height;

    const requestedScale = state.animate
        ? Math.max(1, Number(state.animationLongAxis) || 1)
        : Math.max(1, Number(state.longAxis) / 100 || 1);

    const rawSvg = svgDividers[state.shapeIndex][state.direction];
    const aspectRatio = Math.max(getSvgAspectRatio(rawSvg), 0.0001);
    const shortAxis = Math.max(1, getPreviewShortAxis(state));

    const longSideForDisplay =
        displayLongSide * dpr * requestedScale * 1.75;

    const sourceLongPerShort = horizontal
        ? aspectRatio
        : 1 / aspectRatio;

    const longSideForShortAxis =
        shortAxis * dpr * sourceLongPerShort * 1.75;

    const requiredPixels = Math.max(
        longSideForDisplay,
        longSideForShortAxis
    );

    if (requiredPixels > 12000) return BITMAP_MAX_LONG_SIDE;
    if (requiredPixels > 7000) return 12288;
    return BITMAP_BASE_LONG_SIDE;
}

function trimBitmapCache() {
    while (bitmapCache.size > BITMAP_CACHE_LIMIT) {
        const evictableKey = [...bitmapCache.keys()].find(
            (key) => key !== activePreviewCacheKey
        );

        if (evictableKey === undefined) {
            return;
        }

        const cached = bitmapCache.get(evictableKey);

        if (cached && typeof cached.close === 'function') {
            cached.close();
        }

        bitmapCache.delete(evictableKey);
    }
}

async function rasterizeSvg(svgMarkup, longSide, horizontal) {
    const aspectRatio = Math.max(getSvgAspectRatio(svgMarkup), 0.0001);

    let rasterWidth;
    let rasterHeight;

    if (horizontal) {
        rasterWidth = Math.min(BITMAP_MAX_LONG_SIDE, longSide);
        rasterHeight = Math.max(
            1,
            Math.round(rasterWidth / aspectRatio)
        );
    } else {
        rasterHeight = Math.min(BITMAP_MAX_LONG_SIDE, longSide);
        rasterWidth = Math.max(
            1,
            Math.round(rasterHeight * aspectRatio)
        );
    }

    // Keep the cached bitmap at the SVG's true intrinsic aspect ratio.
    // Changing the cross-axis independently breaks preserveAspectRatio
    // behavior for extreme shapes such as xMidYMax slice dividers.
    if (rasterWidth > BITMAP_MAX_LONG_SIDE) {
        rasterWidth = BITMAP_MAX_LONG_SIDE;
        rasterHeight = Math.max(
            1,
            Math.round(rasterWidth / aspectRatio)
        );
    }

    if (rasterHeight > BITMAP_MAX_LONG_SIDE) {
        rasterHeight = BITMAP_MAX_LONG_SIDE;
        rasterWidth = Math.max(
            1,
            Math.round(rasterHeight * aspectRatio)
        );
    }

    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);

    try {
        const image = new Image();
        image.decoding = 'async';

        const loaded = new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = reject;
        });

        image.src = objectUrl;

        if (typeof image.decode === 'function') {
            try {
                await image.decode();
            } catch {
                await loaded;
            }
        } else {
            await loaded;
        }

        const rasterCanvas = document.createElement('canvas');
        rasterCanvas.width = rasterWidth;
        rasterCanvas.height = rasterHeight;

        const rasterContext = rasterCanvas.getContext('2d', { alpha: true });
        rasterContext.imageSmoothingEnabled = true;
        rasterContext.imageSmoothingQuality = 'high';
        rasterContext.drawImage(image, 0, 0, rasterWidth, rasterHeight);

        if (typeof createImageBitmap === 'function') {
            return await createImageBitmap(rasterCanvas);
        }

        return rasterCanvas;
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

async function getCachedDividerBitmap(state, bounds, revision) {
    const horizontal = state.direction === 'top' || state.direction === 'bottom';
    const longSide = getBitmapLongSide(state, bounds);
    const cacheKey = [
        state.shapeIndex,
        state.direction,
        state.color,
        state.gradient ? 'gradient' : 'solid',
        state.gradientColor || '',
        longSide
    ].join('|');

    if (bitmapCache.has(cacheKey)) {
        const cached = bitmapCache.get(cacheKey);
        bitmapCache.delete(cacheKey);
        bitmapCache.set(cacheKey, cached);

        return {
            bitmap: cached,
            cacheKey
        };
    }

    let pending = pendingBitmapRequests.get(cacheKey);

    if (!pending) {
        const rawSvg = svgDividers[state.shapeIndex][state.direction];
        const svgMarkup = buildShapeSvgMarkup(
            rawSvg,
            state.color,
            state.gradient,
            state.gradientColor,
            state.direction
        );

        pending = {
            latestRevision: revision,
            promise: rasterizeSvg(
                svgMarkup,
                longSide,
                horizontal
            )
        };

        pendingBitmapRequests.set(cacheKey, pending);

        pending.promise
            .then((bitmap) => {
                const stillPending =
                    pendingBitmapRequests.get(cacheKey) === pending;

                if (!stillPending) {
                    return;
                }

                pendingBitmapRequests.delete(cacheKey);

                if (pending.latestRevision !== canvasRenderRevision) {
                    if (bitmap && typeof bitmap.close === 'function') {
                        bitmap.close();
                    }
                    return;
                }

                bitmapCache.set(cacheKey, bitmap);
                trimBitmapCache();
            })
            .catch(() => {
                if (pendingBitmapRequests.get(cacheKey) === pending) {
                    pendingBitmapRequests.delete(cacheKey);
                }
            });
    } else {
        pending.latestRevision = Math.max(
            pending.latestRevision,
            revision
        );
    }

    const bitmap = await pending.promise;

    if (revision !== canvasRenderRevision) {
        return null;
    }

    const cached = bitmapCache.get(cacheKey);

    if (!cached) {
        return null;
    }

    bitmapCache.delete(cacheKey);
    bitmapCache.set(cacheKey, cached);

    return {
        bitmap: cached,
        cacheKey
    };
}

function resizePreviewCanvas() {
    const bounds = dividerPreviewHost.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    const pixelWidth = Math.max(1, Math.min(BITMAP_MAX_LONG_SIDE, Math.round(bounds.width * dpr)));
    const pixelHeight = Math.max(1, Math.min(BITMAP_MAX_LONG_SIDE, Math.round(bounds.height * dpr)));

    if (previewCanvas.width !== pixelWidth || previewCanvas.height !== pixelHeight) {
        previewCanvas.width = pixelWidth;
        previewCanvas.height = pixelHeight;
    }

    previewContext.setTransform(
        previewCanvas.width / Math.max(bounds.width, 1),
        0,
        0,
        previewCanvas.height / Math.max(bounds.height, 1),
        0,
        0
    );

    previewContext.imageSmoothingEnabled = true;
    previewContext.imageSmoothingQuality = 'high';

    return bounds;
}

function getAnimationProgress(timestamp, durationSeconds) {
    const durationMs = Math.max(100, Number(durationSeconds || 10) * 1000);
    const elapsed = (timestamp - animationStartedAt) / durationMs;
    const cycle = elapsed % 2;
    return cycle <= 1 ? cycle : 2 - cycle;
}

// Keep both end edges outside the viewport, even while a copy is transparent.
// The selected duration is the interval between handoffs. A copy repeats after
// two handoffs; its visible travel includes the fade overlap with the next copy.
function getOneDirectionTiming(state) {
    const duration = Math.max(0.1, Number(state.animationLength) || 10);
    const cycleDuration = 2 * duration;
    const fadeSeconds = Math.min(duration * 0.25, Math.max(duration * 0.08, 1));
    return { duration, cycleDuration, fade: fadeSeconds / cycleDuration, inset: 0.02 };
}

function getOneDirectionFrame(state, elapsedSeconds, copy = 0) {
    if (Number(state.animationLongAxis) <= 1) return { progress: 0, opacity: copy ? 0 : 1 };
    const { cycleDuration, fade, inset } = getOneDirectionTiming(state);
    // Begin with the first copy fully visible and the other fully hidden.
    const phase = ((elapsedSeconds / cycleDuration + 2 * fade + copy * 0.5) % 1 + 1) % 1;
    const activeEnd = 0.5 + 2 * fade;
    return {
        progress: inset + Math.min(1, phase / activeEnd) * (1 - 2 * inset),
        opacity: Math.max(0, Math.min(1, phase / fade, (activeEnd - phase) / fade))
    };
}

function getDepthLayers(state) {
    if (!state.animate || !state.depthLayers) return [{ state, opacity: 1, offset: 0, scale: 1 }];
    return [
        { opacity: 0.25, speed: 1.9, scale: 1, phase: 0 },
        { opacity: 0.5, speed: 1.4, scale: 0.85, phase: 0.27 },
        { opacity: 1, speed: 1, scale: 0.7, phase: 0.53 }
    ].map((layer, index) => {
        const duration = (Number(state.animationLength) || 10) * layer.speed;
        const offset = 2 * duration * layer.phase;
        return {
            ...layer, offset,
            state: {
                ...state, depthLayers: false, depthScale: layer.scale,
                key: state.key + '-depth-' + index,
                shortAxis: (Number(state.shortAxis) || 0) * layer.scale,
                animationLength: duration, animationOffset: offset
            }
        };
    });
}

function usesDepthLayers() {
    return getSvgExportStates().some((state) => state.animate && state.depthLayers);
}

let depthLayerCanvas;
function drawDepthLayers(bitmap, state, timestamp, context, bounds) {
    if (!depthLayerCanvas) depthLayerCanvas = document.createElement('canvas');
    if (depthLayerCanvas.width !== previewCanvas.width) depthLayerCanvas.width = previewCanvas.width;
    if (depthLayerCanvas.height !== previewCanvas.height) depthLayerCanvas.height = previewCanvas.height;
    const layerContext = depthLayerCanvas.getContext('2d');
    layerContext.setTransform(context.getTransform());
    layerContext.imageSmoothingEnabled = true;
    layerContext.imageSmoothingQuality = 'high';
    getDepthLayers(state).forEach((layer) => {
        drawDividerBitmap(bitmap, layer.state, timestamp + layer.offset * 1000, { context: layerContext, bounds });
        context.save();
        context.globalAlpha = layer.opacity;
        context.drawImage(depthLayerCanvas, 0, 0, bounds.width, bounds.height);
        context.restore();
    });
}

function drawDividerBitmap(bitmap, state, timestamp = performance.now(), target = {}) {
    const bounds = target.bounds || resizePreviewCanvas();
    const context = target.context || previewContext;
    const width = bounds.width;
    const height = bounds.height;

    context.clearRect(0, 0, width, height);

    if (state.animate && state.depthLayers) {
        drawDepthLayers(bitmap, state, timestamp, context, bounds);
        return;
    }

    const horizontal = state.direction === 'top' || state.direction === 'bottom';
    const shortAxis = getPreviewShortAxis(state);
    const longAxisScale = Math.max(0, Number(state.longAxis) / 100 || 0);
    const animationScale = Math.max(1, Number(state.animationLongAxis) || 1);
    const position = Math.max(0, Math.min(100, Number(state.position) || 0)) / 100;
    const animationProgress = state.animate
        ? getAnimationProgress(timestamp, state.animationLength)
        : 0;

    let drawWidth;
    let drawHeight;
    let x;
    let y;

    if (horizontal) {
        if (state.animate) {
            drawWidth = width * animationScale;
            drawHeight = shortAxis * (state.ratio ? animationScale : 1);
            x = -(drawWidth - width) * (1 - animationProgress);
        } else {
            drawWidth = width * longAxisScale;
            drawHeight = shortAxis;
            x = (width - drawWidth) * position;
        }

        y = state.direction === 'bottom' ? height - drawHeight : 0;
    } else {
        if (state.animate) {
            drawHeight = height * animationScale;
            drawWidth = shortAxis * (state.ratio ? animationScale : 1);
            y = -(drawHeight - height) * (1 - animationProgress);
        } else {
            drawWidth = shortAxis;
            drawHeight = height * longAxisScale;
            y = (height - drawHeight) * position;
        }

        x = state.direction === 'right' ? width - drawWidth : 0;
    }

    context.save();

    if (state.flipped && !state.animate) {
        if (horizontal) {
            context.translate(width, 0);
            context.scale(-1, 1);
        } else {
            context.translate(0, height);
            context.scale(1, -1);
        }
    }

    const rawSvg = svgDividers[state.shapeIndex][state.direction];
    const preserveAspectRatio = getPreserveAspectRatio(rawSvg);

    if (state.animate && state.oneDirection && state.mirrorLoop) {
        const tileLength = horizontal ? drawWidth : drawHeight;
        const tileStep = Math.max(1, tileLength - 1);
        const { cycleDuration } = getOneDirectionTiming(state);
        const phase = (((timestamp - animationStartedAt) / 1000 / cycleDuration) % 1 + 1) % 1;
        const offset = -2 * tileStep + 2 * tileStep * phase;
        for (let tile = 0; tile < 4; tile++) {
            const start = offset + tile * tileStep - 0.5;
            if (start >= (horizontal ? width : height) || start + tileLength <= 0) continue;
            context.save();
            context.translate(horizontal ? start : x, horizontal ? y : start);
            if (tile % 2) {
                context.translate(horizontal ? drawWidth : 0, horizontal ? 0 : drawHeight);
                context.scale(horizontal ? -1 : 1, horizontal ? 1 : -1);
            }
            drawImagePreservingSvgAspectRatio(context, bitmap, 0, 0, drawWidth, drawHeight, preserveAspectRatio);
            context.restore();
        }
        context.restore();
        return;
    }

    const copies = state.animate && state.oneDirection ? 2 : 1;
    for (let copy = 0; copy < copies; copy++) {
        let copyX = x;
        let copyY = y;
        if (state.animate && state.oneDirection) {
            const frame = getOneDirectionFrame(state, (timestamp - animationStartedAt) / 1000, copy);
            context.globalAlpha = frame.opacity;
            if (horizontal) copyX = -(drawWidth - width) * (1 - frame.progress);
            else copyY = -(drawHeight - height) * (1 - frame.progress);
        }
        drawImagePreservingSvgAspectRatio(
            context, bitmap, copyX, copyY, drawWidth, drawHeight, preserveAspectRatio
        );
    }

    context.restore();
}

function stopPreviewAnimation() {
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

let motionPreviewHost;
async function renderCanvasPreview(state) {
    latestPreviewState = state;
    const revision = ++canvasRenderRevision;
    stopPreviewAnimation();

    if (hasMotionEffects(state)) {
        previewCanvas.hidden = true;
        if (!motionPreviewHost) {
            motionPreviewHost = document.createElement('div');
            motionPreviewHost.className = 'sd-motion-preview';
            dividerPreviewHost.appendChild(motionPreviewHost);
        }
        motionPreviewHost.hidden = false;
        if (state.oneDirection || state.depthLayers) {
            motionPreviewHost.innerHTML = buildPairedExportCode('svg',[{...state,key:state.key || 'preview'}],'sd-live-paired');
            resolveInitialPreview();
            return;
        }
        const namespace = 'sd-live-motion';
        const layout = getMotionLayout(state,namespace);
        const style = Object.entries(layout.declarations).map(([k,v])=>k+':'+v).join(';');
        const sparksStyle = Object.entries(getMotionSparksLayout(state,namespace+'-sparks').declarations).map(([k,v])=>k+':'+v).join(';');
        motionPreviewHost.innerHTML = '<style>'+(layout.keyframes || '')+'</style>'+buildMotionSvg(state,namespace).replace('<svg ','<svg style="'+style+'" ')+buildMotionSparksSvg(state,namespace+'-sparks').replace('<svg ','<svg style="'+sparksStyle+'" ');
        resolveInitialPreview();
        return;
    }
    previewCanvas.hidden = false;
    if (motionPreviewHost) { motionPreviewHost.hidden = true; motionPreviewHost.replaceChildren(); }
    const bounds = dividerPreviewHost.getBoundingClientRect();

    try {
        const cachedResult = await getCachedDividerBitmap(
            state,
            bounds,
            revision
        );

        if (
            revision !== canvasRenderRevision ||
            !cachedResult
        ) {
            return;
        }

        const { bitmap, cacheKey } = cachedResult;

        activePreviewCacheKey = cacheKey;
        trimBitmapCache();

        if (!state.animate) {
            drawDividerBitmap(bitmap, state);
            resolveInitialPreview();
            return;
        }

        animationStartedAt = performance.now();

        const animateFrame = (timestamp) => {
            if (
                revision !== canvasRenderRevision ||
                latestPreviewState !== state ||
                !state.animate
            ) {
                animationFrameId = null;
                return;
            }

            drawDividerBitmap(bitmap, state, timestamp);
            resolveInitialPreview();
            animationFrameId = requestAnimationFrame(animateFrame);
        };

        animationFrameId = requestAnimationFrame(animateFrame);
    } catch (error) {
        rejectInitialPreview(error);
        console.error('ShapeDividers: canvas preview rendering failed.', error);
    }
}

function getActiveCanvasState() {
    const activeIndex = getActiveViewIndex();

    if (!mobileReady || activeIndex <= 0) {
        return {
            shapeIndex,
            direction: dividerDirection,
            color: shapeColor,
            gradient: gradient,
            gradientColor: gradientColor,
            longAxis: longAxisValue,
            shortAxis: shortAxisValue,
            position: positionValue,
            flipped,
            animate,
            animationLength: animLength,
            animationLongAxis: animLongAxis,
            oneDirection,
            mirrorLoop: document.getElementById(prefixedId('', 'mirror-loop-checkbox')).checked,
            depthLayers: document.getElementById(prefixedId('', 'depth-layers-checkbox')).checked,
            effects: readMotionEffects(''),
            ratio: shapeRatio
        };
    }

    if (activeIndex === 1) {
        return {
            shapeIndex: tabletShapeIndex,
            direction: tabletDividerDirection,
            color: tabletShapeColor,
            gradient: tabletGradient,
            gradientColor: tabletGradientColor,
            longAxis: tabletLongAxisValue,
            shortAxis: tabletShortAxisValue,
            position: tabletPositionValue,
            flipped: tabletFlipped,
            animate: tabletAnimate,
            animationLength: tabletAnimLength,
            animationLongAxis: tabletAnimLongAxis,
            oneDirection: tabletOneDirection,
            mirrorLoop: document.getElementById(prefixedId('tablet', 'mirror-loop-checkbox')).checked,
            depthLayers: document.getElementById(prefixedId('tablet', 'depth-layers-checkbox')).checked,
            effects: readMotionEffects('tablet'),
            ratio: tabletShapeRatio
        };
    }

    return {
        shapeIndex: mobileShapeIndex,
        direction: mobileDividerDirection,
        color: mobileShapeColor,
        gradient: mobileGradient,
        gradientColor: mobileGradientColor,
        longAxis: mobileLongAxisValue,
        shortAxis: mobileShortAxisValue,
        position: mobilePositionValue,
        flipped: mobileFlipped,
        animate: mobileAnimate,
        animationLength: mobileAnimLength,
        animationLongAxis: mobileAnimLongAxis,
        oneDirection: mobileOneDirection,
        mirrorLoop: document.getElementById(prefixedId('mobile', 'mirror-loop-checkbox')).checked,
        depthLayers: document.getElementById(prefixedId('mobile', 'depth-layers-checkbox')).checked,
            effects: readMotionEffects('mobile'),
        ratio: mobileShapeRatio
    };
}

if (typeof ResizeObserver === 'function') {
    const previewResizeObserver = new ResizeObserver(() => {
        if (latestPreviewState) {
            renderCanvasPreview(latestPreviewState);
        }
    });

    previewResizeObserver.observe(dividerPreviewHost);
}


let alreadyChangedView = urlParams.has('responsiveConfigured')
    ? urlParams.get('responsiveConfigured') === 'true'
    : urlParams.has('tabletDividerDirection') || urlParams.has('mobileDividerDirection') || urlParams.has('tabletEffects') || urlParams.has('mobileEffects');

const previewClasses = ['auto', 'tablet-portrait', 'mobile-portrait'];

function getActiveViewIndex() {
    return [...views].findIndex((view) => view.classList.contains('active'));
}

function getActiveDirection() {
    const activeIndex = getActiveViewIndex();
    if (activeIndex === 1) return tabletDividerDirection;
    if (activeIndex === 2) return mobileDividerDirection;
    return dividerDirection;
}

function getActiveShapeIndex() {
    const activeIndex = getActiveViewIndex();
    if (activeIndex === 1) return tabletShapeIndex;
    if (activeIndex === 2) return mobileShapeIndex;
    return shapeIndex;
}

function setActiveShapeIndex(index) {
    const activeIndex = getActiveViewIndex();
    if (activeIndex === 1) {
        tabletShapeIndex = index;
    } else if (activeIndex === 2) {
        mobileShapeIndex = index;
    } else {
        shapeIndex = index;
    }
}

function syncResponsiveControlsFromDesktop() {
    const desktopDirection = getCheckedDirection('');

    for (const prefix of ['tablet', 'mobile']) {
        document.getElementById(prefixedId(prefix, 'shape-color')).value =
            document.getElementById('shape-color').value;
        document.getElementById(prefixedId(prefix, 'shape-color-code')).value =
            document.getElementById('shape-color-code').value;
        document.getElementById(prefixedId(prefix, 'gradient-checkbox')).checked =
            document.getElementById('gradient-checkbox').checked;
        document.getElementById(prefixedId(prefix, 'gradient-color')).value =
            document.getElementById('gradient-color').value;
        document.getElementById(prefixedId(prefix, 'gradient-color-code')).value =
            document.getElementById('gradient-color-code').value;
        syncGradientControl(prefix);
        document.getElementById(prefixedId(prefix, 'long_axis')).value =
            document.getElementById('long_axis').value;
        document.getElementById(prefixedId(prefix, 'short_axis')).value =
            document.getElementById('short_axis').value;
        document.getElementById(prefixedId(prefix, 'position')).value =
            document.getElementById('position').value;
        document.getElementById(prefixedId(prefix, 'flipped-checkbox')).checked =
            document.getElementById('flipped-checkbox').checked;
        document.getElementById(prefixedId(prefix, 'animate-checkbox')).checked =
            document.getElementById('animate-checkbox').checked;
        document.getElementById(prefixedId(prefix, 'depth-layers-checkbox')).checked = document.getElementById('depth-layers-checkbox').checked;
        document.getElementById(prefixedId(prefix, 'mirror-loop-checkbox')).checked = document.getElementById('mirror-loop-checkbox').checked;
        document.getElementById(prefixedId(prefix, 'one-direction-checkbox')).checked =
            document.getElementById('one-direction-checkbox').checked;
        document.getElementById(prefixedId(prefix, 'animation_length')).value =
            document.getElementById('animation_length').value;
        document.getElementById(prefixedId(prefix, 'animation_long_axis')).value =
            document.getElementById('animation_long_axis').value;

        Object.entries(motionFields).forEach(([field,fallback]) => {
            const from = document.getElementById(motionControlId('',field));
            const to = document.getElementById(motionControlId(prefix,field));
            if (typeof fallback === 'boolean') to.checked = from.checked;
            else to.value = from.value;
            const hex = document.getElementById(to.id+'-hex');
            if (hex) hex.value = to.value;
        });
        const groupName = prefix + 'dividerdirection';
        checkRadioByValue(genform[groupName], desktopDirection);
    }

    tabletShapeIndex = shapeIndex;
    mobileShapeIndex = shapeIndex;
    refreshRangeSliders();
}

views.forEach((view, index) => {
    view.addEventListener('click', () => {
        views.forEach((item) => item.classList.remove('active'));
        view.classList.add('active');

        viewsSettings.forEach((settings) => {
            settings.style.display = 'none';
        });
        viewsSettings[index].style.display = 'block';
        previewerFrame.className = previewClasses[index];

        updateShape();
        renderShapePicker();
        updateSelectedShape();
    });
});

const viewsSelect = document.querySelector('.view_select');

let responsiveRevealRevision = 0;
let responsiveScrollFrame = null;
let responsiveTabAnimations = [];

function cancelResponsiveReveal() {
    responsiveRevealRevision += 1;
    window.cancelAnimationFrame(responsiveScrollFrame);
    responsiveScrollFrame = null;
    responsiveTabAnimations.forEach(animation => animation.cancel());
    responsiveTabAnimations = [];
    viewsSelect.classList.remove('sd-tabs-revealing');
}

function revealResponsiveTabs(panel) {
    const revision = responsiveRevealRevision;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const reveal = () => {
        if (revision !== responsiveRevealRevision) return;
        viewsSelect.style.display = 'flex';
        if (reduceMotion) return;

        const style = window.getComputedStyle(viewsSelect);
        const height = viewsSelect.getBoundingClientRect().height;
        viewsSelect.classList.add('sd-tabs-revealing');

        // Open a slot in the layout, then let the three device cards settle into it.
        responsiveTabAnimations = [viewsSelect.animate([
            { height: '0px', paddingTop: '0px', paddingBottom: '0px', opacity: 0, overflow: 'hidden' },
            { height: `${height}px`, paddingTop: style.paddingTop, paddingBottom: style.paddingBottom, opacity: 1, overflow: 'hidden' }
        ], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' }),
        ...Array.from(views, (view, index) => view.animate([
            { opacity: 0, transform: 'translateY(8px) scale(.97)' },
            { opacity: 1, transform: 'translateY(0) scale(1)' }
        ], { duration: 320, delay: 50 + index * 60, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }))];

        Promise.all(responsiveTabAnimations.map(animation => animation.finished.catch(() => {})))
            .then(() => {
                if (revision !== responsiveRevealRevision) return;
                responsiveTabAnimations = [];
                viewsSelect.classList.remove('sd-tabs-revealing');
            });
    };

    const start = panel?.scrollTop || 0;
    if (reduceMotion || start <= 1 || !panel || panel.scrollHeight <= panel.clientHeight) {
        if (panel) panel.scrollTop = 0;
        reveal();
        return;
    }

    const duration = Math.min(280, 180 + start * .08);
    const startedAt = performance.now();
    const scroll = now => {
        if (revision !== responsiveRevealRevision) return;
        const progress = Math.min(1, (now - startedAt) / duration);
        panel.scrollTop = start * Math.pow(1 - progress, 3);
        if (progress < 1) {
            responsiveScrollFrame = window.requestAnimationFrame(scroll);
        } else {
            responsiveScrollFrame = null;
            panel.scrollTop = 0;
            reveal();
        }
    };
    responsiveScrollFrame = window.requestAnimationFrame(scroll);
}


document.getElementById('mobile-ready').addEventListener('change', function() {
    cancelResponsiveReveal();
    if (this.checked) {
        if (
            !alreadyChangedView
        ) {
            syncResponsiveControlsFromDesktop();
        }

        alreadyChangedView = true;
        // Keep the tabs hidden until the panel reaches its top.
        viewsSelect.style.display = 'none';
    } else {
        viewsSelect.style.display = 'none';
        views.forEach((view) => view.classList.remove('active'));
        views[0].classList.add('active');
        viewsSettings.forEach((settings) => {
            settings.style.display = 'none';
        });
        viewsSettings[0].style.display = 'block';
        previewerFrame.className = previewClasses[0];
    }

    updateShape();
    renderShapePicker();
    updateSelectedShape();

    if (this.checked) {
        revealResponsiveTabs(this.closest('.settings-panel'));
    }
});



function hasPremiumAccess() {
    return typeof isPremium !== 'undefined' && Boolean(isPremium);
}

function requiresPremiumFeatures() {
    return (
        Boolean(animate) ||
        Boolean(gradient) ||
        svgDividers[shapeIndex].pro ||
        (
            mobileReady &&
            (
                Boolean(tabletAnimate) ||
                Boolean(mobileAnimate) ||
                Boolean(tabletGradient) ||
                Boolean(mobileGradient) ||
                svgDividers[tabletShapeIndex].pro ||
                svgDividers[mobileShapeIndex].pro
            )
        )
    );
}

function premiumCheck() {
    const premiumRequired = requiresPremiumFeatures();

    if (!hasPremiumAccess()) {
        copyCodeButton.style.display = premiumRequired ? 'none' : '';
        premiumButton.style.display = premiumRequired ? 'inline-flex' : 'none';
    }
}





formEntries.forEach((e, i) => {
   e.addEventListener('input', updateShape);
});

const longAxisContainers = document.querySelectorAll('.long-axis-container');
const positionContainers = document.querySelectorAll('.position-container');
const flippedContainers = document.querySelectorAll('.flipped-container');
const optionDevices = document.querySelectorAll('.sd-options-device');
const animationLengthContainers = document.querySelectorAll('.animation-length-container');
const animationLongAxisContainers = document.querySelectorAll('.animation-long-axis-container');


function prefixedId(prefix, baseId) {
    return prefix ? `${prefix}-${baseId}` : baseId;
}

function getCheckedDirection(prefix) {
    const groupName = prefix ? `${prefix}dividerdirection` : 'dividerdirection';
    return [...genform[groupName]].find((radio) => radio.checked)?.value || 'bottom';
}

function readViewportControls(prefix, selectedIndex) {
    const colorInput = document.getElementById(prefixedId(prefix, 'shape-color'));
    const gradientInput = document.getElementById(
        prefixedId(prefix, 'gradient-checkbox')
    );
    const gradientColorInput = document.getElementById(
        prefixedId(prefix, 'gradient-color')
    );
    const longAxisInput = document.getElementById(prefixedId(prefix, 'long_axis'));
    const shortAxisInput = document.getElementById(prefixedId(prefix, 'short_axis'));
    const positionInput = document.getElementById(prefixedId(prefix, 'position'));
    const flippedInput = document.getElementById(prefixedId(prefix, 'flipped-checkbox'));
    const animateInput = document.getElementById(prefixedId(prefix, 'animate-checkbox'));
    const animationLengthInput = document.getElementById(prefixedId(prefix, 'animation_length'));
    const animationLongAxisInput = document.getElementById(prefixedId(prefix, 'animation_long_axis'));

    const direction = getCheckedDirection(prefix);
    const color = colorInput.value.slice(1);
    const gradientEnabled = gradientInput.checked;
    const endColor = gradientColorInput.value.slice(1);
    const selectedDivider = svgDividers[selectedIndex];
    const rawSvg = selectedDivider[direction];
    const preservesRatio = !getPreserveAspectRatio(rawSvg).none;

    return {
        direction,
        color,
        gradient: gradientEnabled,
        gradientColor: endColor,
        longAxis: longAxisInput.value,
        shortAxis: shortAxisInput.value,
        position: positionInput.value,
        flipped: flippedInput.checked,
        animate: animateInput.checked,
        oneDirection: document.getElementById(prefixedId(prefix, 'one-direction-checkbox')).checked,
        mirrorLoop: document.getElementById(prefixedId(prefix, 'mirror-loop-checkbox')).checked,
        depthLayers: document.getElementById(prefixedId(prefix, 'depth-layers-checkbox')).checked,
        effects: readMotionEffects(prefix),
        animationLength: animationLengthInput.value,
        animationLongAxis: animationLongAxisInput.value,
        selectedShape: encodeSvgForCss(
            buildShapeSvgMarkup(
                rawSvg,
                color,
                gradientEnabled,
                endColor,
                direction
            )
        ),
        ratio: preservesRatio,
        positionInput
    };
}

function updateViewportControlVisibility(viewIndex, state) {
    const animated = state.animate;
    const prefix = ['', 'tablet', 'mobile'][viewIndex];
    syncMotionControls(prefix, state);
    const scrolling = animated && (!hasMotionEffects(state) || state.effects.motion === 'scroll');

    longAxisContainers[viewIndex].style.display = scrolling ? 'none' : 'block';
    positionContainers[viewIndex].style.display = scrolling ? 'none' : 'block';
    const flipContainer = flippedContainers[viewIndex];
    const flipInput = flipContainer.querySelector('input');
    flipInput.disabled = animated;
    flipContainer.classList.toggle('is-disabled', animated);
    flipContainer.setAttribute('aria-disabled', String(animated));
    setControlTooltip(flipContainer, animated
        ? flipContainer.dataset.sdDisabledTooltip || "Flip can't be enabled when Animate is on"
        : '');
    document.getElementById(prefixedId(['', 'tablet', 'mobile'][viewIndex], 'one-direction-checkbox')).closest('.animation-direction-container').style.display = animated ? 'block' : 'none';
    document.getElementById(prefixedId(['', 'tablet', 'mobile'][viewIndex], 'mirror-loop-checkbox')).closest('.animation-mirror-container').style.display = animated && state.oneDirection ? 'block' : 'none';
    document.getElementById(prefixedId(['', 'tablet', 'mobile'][viewIndex], 'depth-layers-checkbox')).closest('.animation-depth-container').style.display = animated ? 'block' : 'none';
    animationLengthContainers[viewIndex].style.display = animated ? 'block' : 'none';
    animationLongAxisContainers[viewIndex].style.display = scrolling ? 'block' : 'none';

    if (!animated && Number(state.longAxis) < 170) {
        positionContainers[viewIndex].style.display = 'none';
        state.positionInput.value = 50;
        state.position = '50';
    }
}


function updateShape() {
    const desktopState = readViewportControls('', shapeIndex);

    shapeColor = desktopState.color;
    gradient = desktopState.gradient;
    gradientColor = desktopState.gradientColor;
    syncGradientControl('');
    dividerDirection = desktopState.direction;
    longAxisValue = desktopState.longAxis;
    shortAxisValue = desktopState.shortAxis;
    positionValue = desktopState.position;
    flipped = desktopState.flipped;
    animate = desktopState.animate;
    oneDirection = desktopState.oneDirection;
    animLength = desktopState.animationLength;
    animLongAxis = desktopState.animationLongAxis;
    selectedShape = desktopState.selectedShape;
    shapeRatio = desktopState.ratio;

    animHorName = 'shape-anim-' + copiedCount;
    animVerName = 'shape-ver-anim-' + copiedCount;

    mobileReady = document.getElementById('mobile-ready').checked;

    updateViewportControlVisibility(0, desktopState);
    positionValue = desktopState.position;

    if (mobileReady) {
        const tabletState = readViewportControls('tablet', tabletShapeIndex);

        tabletShapeColor = tabletState.color;
        tabletGradient = tabletState.gradient;
        tabletGradientColor = tabletState.gradientColor;
        syncGradientControl('tablet');
        tabletDividerDirection = tabletState.direction;
        tabletLongAxisValue = tabletState.longAxis;
        tabletShortAxisValue = tabletState.shortAxis;
        tabletPositionValue = tabletState.position;
        tabletFlipped = tabletState.flipped;
        tabletAnimate = tabletState.animate;
        tabletOneDirection = tabletState.oneDirection;
        tabletAnimLength = tabletState.animationLength;
        tabletAnimLongAxis = tabletState.animationLongAxis;
        tabletSelectedShape = tabletState.selectedShape;
        tabletShapeRatio = tabletState.ratio;

        updateViewportControlVisibility(1, tabletState);
        tabletPositionValue = tabletState.position;

        const mobileState = readViewportControls('mobile', mobileShapeIndex);

        mobileShapeColor = mobileState.color;
        mobileGradient = mobileState.gradient;
        mobileGradientColor = mobileState.gradientColor;
        syncGradientControl('mobile');
        mobileDividerDirection = mobileState.direction;
        mobileLongAxisValue = mobileState.longAxis;
        mobileShortAxisValue = mobileState.shortAxis;
        mobilePositionValue = mobileState.position;
        mobileFlipped = mobileState.flipped;
        mobileAnimate = mobileState.animate;
        mobileOneDirection = mobileState.oneDirection;
        mobileAnimLength = mobileState.animationLength;
        mobileAnimLongAxis = mobileState.animationLongAxis;
        mobileSelectedShape = mobileState.selectedShape;
        mobileShapeRatio = mobileState.ratio;

        updateViewportControlVisibility(2, mobileState);
        mobilePositionValue = mobileState.position;
    }

    const activeIndex = Math.max(0, getActiveViewIndex());
    optionDevices.forEach((group, index) => {
        group.hidden = index !== activeIndex;
    });

    const activeState = getActiveCanvasState();
    colorDiv.style.backgroundColor = '#' + activeState.color;
    previewer.className = 'previewer ' + activeState.direction;

    renderCanvasPreview(activeState);
    premiumCheck();
}

const copyCodeButton = document.getElementById("copye");
const premiumButton = document.getElementById("premium");

const exportModal = document.getElementById("export-modal");

if (exportModal && exportModal.parentElement !== document.body) {
    document.body.appendChild(exportModal);
}

const exportCssCode = document.getElementById("export-code-css");
const exportSvgCode = document.getElementById("export-code-svg");
const exportMaskCode = document.getElementById("export-code-mask");
const exportMaskDownloadButton = document.getElementById("export-mask-download");
const exportCopyButton = document.getElementById("export-copy");
const exportCopyLabel = exportCopyButton?.querySelector("span");
const exportTabs = [...document.querySelectorAll("[data-export-tab]")];
const exportPanels = [...document.querySelectorAll("[data-export-panel]")];

let activeExportTab = "css";
let preparedCssExport = "";
let preparedSvgExport = "";
let preparedMaskExport = "";
let preparedMaskFiles = [];



const settingsWindow = document.querySelector('.settings_window');

async function writeClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('ShapeDividers: clipboard write failed.', error);
        return false;
    }
}

function getPremiumExportMessage() {
    return (
        'Oups! Looks like you have selected a premium shape or feature! ' +
        'Get premium here : https://shapedividers.com/get-premium/ , or login here ' +
        'https://shapedividers.com/wp-login.php if you have premium already!\n\nThank you!'
    );
}

function generateCssExportCode({ renewClassName = true } = {}) {
    if (requiresPremiumFeatures() && !hasPremiumAccess()) {
        return null;
    }

    if (renewClassName) {
        generateUniqueCSSName();
    }

    if (usesDepthLayers() || usesMotionEffects()) return null;

    if (getSvgExportStates().some((state) => state.animate && state.oneDirection)) {
        return buildPairedExportCode('css');
    }

    copyRightCode();

    return mobileReady
        ? mobileShapeDiv + tabletShapeDiv + shapeDiv
        : shapeDiv;
}







/* Generate unique name */

const random = (min, max) => Math.floor(Math.random() * (max - min)) + min;

let copiedCount = random(0, 9999);
let shapeCSSName = 'shapedividers_com-' + copiedCount;



function generateUniqueCSSName(){
if (!hasPremiumAccess()){
    shapeCSSName = 'shapedividers_com-' + copiedCount;
} else {
    shapeCSSName = 'shape-' + copiedCount;
}
copiedCount = random(0, 9999);
}


function replaceInlineSvgColorsWithCurrentColor(svgMarkup) {
    return replaceSvgColorsWithPaint(svgMarkup, 'currentColor');
}

function addClassToInlineSvg(svgMarkup, className) {
    return svgMarkup.replace(/<svg\b([^>]*)>/i, (match, attributes) => {
        if (/\bclass=["']/i.test(attributes)) {
            return '<svg' + attributes.replace(
                /\bclass=(["'])(.*?)\1/i,
                (classMatch, quote, classes) =>
                    'class=' + quote + classes + ' ' + className + quote
            ) + '>';
        }

        return '<svg class="' + className + '"' + attributes + '>';
    });
}

function getSvgExportStates() {
    const states = [
        {
            key: 'desktop',
            shapeIndex,
            direction: dividerDirection,
            color: shapeColor,
            gradient,
            gradientColor,
            longAxis: longAxisValue,
            shortAxis: shortAxisValue,
            position: positionValue,
            flipped,
            animate,
            animationLength: animLength,
            animationLongAxis: animLongAxis,
            oneDirection,
            mirrorLoop: document.getElementById(prefixedId('', 'mirror-loop-checkbox')).checked,
            depthLayers: document.getElementById(prefixedId('', 'depth-layers-checkbox')).checked,
            effects: readMotionEffects(''),
            ratio: shapeRatio
        }
    ];

    if (mobileReady) {
        states.push(
            {
                key: 'tablet',
                shapeIndex: tabletShapeIndex,
                direction: tabletDividerDirection,
                color: tabletShapeColor,
                gradient: tabletGradient,
                gradientColor: tabletGradientColor,
                longAxis: tabletLongAxisValue,
                shortAxis: tabletShortAxisValue,
                position: tabletPositionValue,
                flipped: tabletFlipped,
                animate: tabletAnimate,
                animationLength: tabletAnimLength,
                animationLongAxis: tabletAnimLongAxis,
                oneDirection: tabletOneDirection,
                mirrorLoop: document.getElementById(prefixedId('tablet', 'mirror-loop-checkbox')).checked,
                depthLayers: document.getElementById(prefixedId('tablet', 'depth-layers-checkbox')).checked,
            effects: readMotionEffects('tablet'),
                ratio: tabletShapeRatio
            },
            {
                key: 'mobile',
                shapeIndex: mobileShapeIndex,
                direction: mobileDividerDirection,
                color: mobileShapeColor,
                gradient: mobileGradient,
                gradientColor: mobileGradientColor,
                longAxis: mobileLongAxisValue,
                shortAxis: mobileShortAxisValue,
                position: mobilePositionValue,
                flipped: mobileFlipped,
                animate: mobileAnimate,
                animationLength: mobileAnimLength,
                animationLongAxis: mobileAnimLongAxis,
                oneDirection: mobileOneDirection,
                mirrorLoop: document.getElementById(prefixedId('mobile', 'mirror-loop-checkbox')).checked,
                depthLayers: document.getElementById(prefixedId('mobile', 'depth-layers-checkbox')).checked,
            effects: readMotionEffects('mobile'),
                ratio: mobileShapeRatio
            }
        );
    }

    return states;
}

function namespaceInlineSvgIds(svgMarkup, namespace) {
    const idMap = new Map();
    const safeNamespace =
        'sd-' + String(namespace).replace(/[^A-Za-z0-9_-]/g, '-');

    svgMarkup.replace(
        /\bid=(["'])([^"']+)\1/g,
        (match, quote, id) => {
            if (!idMap.has(id)) {
                idMap.set(
                    id,
                    safeNamespace + '-' + idMap.size
                );
            }

            return match;
        }
    );

    if (!idMap.size) return svgMarkup;

    let namespacedSvg = svgMarkup.replace(
        /\bid=(["'])([^"']+)\1/g,
        (match, quote, id) => {
            const replacement = idMap.get(id);

            return replacement
                ? 'id=' + quote + replacement + quote
                : match;
        }
    );

    idMap.forEach((replacement, original) => {
        const escapedOriginal = original.replace(
            /[.*+?^$()|[\]\\{}]/g,
            '\\$&'
        );

        namespacedSvg = namespacedSvg
            .replace(
                new RegExp(
                    "(url\\(\\s*['\"]?#)" +
                    escapedOriginal +
                    "(['\"]?\\s*\\))",
                    'g'
                ),
                '$1' + replacement + '$2'
            )
            .replace(
                new RegExp(
                    "((?:xlink:)?href\\s*=\\s*['\"]#)" +
                    escapedOriginal +
                    "(['\"])",
                    'g'
                ),
                '$1' + replacement + '$2'
            );
    });

    return namespacedSvg;
}

function getPlainExportSvg(
    shapeIndex,
    direction,
    className,
    gradientEnabled,
    color,
    endColor
) {
    const rawSvg = svgDividers[shapeIndex][direction];
    const normalizedSvg = normalizeSvgForCanvas(rawSvg, '000000');
    const inlineSvg = gradientEnabled
        ? addGradientToSvg(
            normalizedSvg,
            'var(--shape-gradient-color-1)',
            'var(--shape-gradient-color-2)',
            direction,
            className + '-gradient'
        )
        : replaceInlineSvgColorsWithCurrentColor(normalizedSvg);
    const namespacedSvg = namespaceInlineSvgIds(
        inlineSvg,
        className
    );

    return addClassToInlineSvg(namespacedSvg, className)
        .replace(
            /<svg\b/i,
            '<svg aria-hidden="true" focusable="false"'
        );
}

function getSvgStateDeclarations(
    state,
    animationNamespace,
    {
        includeTransformReset = true,
        includeAnimationReset = true
    } = {}
) {
    const horizontal = state.direction === 'top' || state.direction === 'bottom';
    const longAxis = Number(state.longAxis) || 100;
    const shortAxis = Number(state.shortAxis) || 0;
    const position = Number(state.position) || 0;
    const positionedPercent =
        state.flipped && !state.animate
            ? 100 - position
            : position;
    const offset =
        positionedPercent * (1 - longAxis / 100);
    const animationScale = Math.max(1, Number(state.animationLongAxis) || 1);

    const declarations = {
        display: 'block',
        position: 'absolute',
        color: '#' + state.color,
        ...(state.gradient ? {
            '--shape-gradient-color-1': '#' + state.color,
            '--shape-gradient-color-2': '#' + state.gradientColor
        } : {}),
        'max-width': 'none',
        top: 'auto',
        right: 'auto',
        bottom: 'auto',
        left: 'auto',
        width: 'auto',
        height: 'auto',
        ...(includeTransformReset ? {
            transform: 'none',
            'transform-origin': 'center'
        } : {}),
        ...(includeAnimationReset ? {
            animation: 'none'
        } : {})
    };

    let keyframes = '';

    if (state.animate) {
        if (horizontal) {
            declarations.width = '100%';
            declarations.height = shortAxis + 'px';
            declarations.left = '0';
            declarations[state.direction === 'top' ? 'top' : 'bottom'] = '-0.1vw';
        } else {
            declarations.width = shortAxis + 'px';
            declarations.height = '100%';
            declarations.top = '0';
            declarations[state.direction === 'left' ? 'left' : 'right'] = '-0.1vw';
        }

        const scaleFunction = horizontal
            ? 'scale' + (state.ratio ? '' : 'X')
            : 'scale' + (state.ratio ? '' : 'Y');

        const transformOrigin =
            state.direction === 'top' ? '100% 0' :
            state.direction === 'bottom' ? '100% 100%' :
            state.direction === 'right' ? '100% 100%' :
            '0 100%';

        const keyframeName =
            animationNamespace + '-' + state.key + '-animation';

        declarations.transform =
            scaleFunction + '(' + animationScale + ')';
        declarations['transform-origin'] = transformOrigin;
        declarations.animation =
            (Number(state.animationLength) || 1) +
            's infinite alternate ' + keyframeName + ' linear';

        const translateAxis = horizontal ? 'X' : 'Y';

        keyframes =
            '@keyframes ' + keyframeName + '{\n' +
            '  100%{transform:' +
            scaleFunction + '(' + animationScale + ') translate' + translateAxis +
            '(calc(100% - (100% / ' + animationScale + ')));}\n' +
            '}';
    } else {
        if (horizontal) {
            declarations.width = longAxis + '%';
            declarations.height = shortAxis + 'px';
            declarations.left = offset + '%';
            declarations[state.direction === 'top' ? 'top' : 'bottom'] = '-0.1vw';
        } else {
            declarations.width = shortAxis + 'px';
            declarations.height = longAxis + '%';
            declarations.top = offset + '%';
            declarations[state.direction === 'left' ? 'left' : 'right'] = '-0.1vw';
        }

        if (state.flipped) {
            declarations.transform = horizontal
                ? 'scaleX(-1)'
                : 'scaleY(-1)';
        }
    }

    return { declarations, keyframes };
}

function diffDeclarations(previous, next) {
    const changed = {};

    Object.keys(next).forEach((property) => {
        if (previous[property] !== next[property]) {
            changed[property] = next[property];
        }
    });

    return changed;
}

function formatDeclarationRule(selector, declarations) {
    const entries = Object.entries(declarations);

    if (!entries.length) return '';

    return (
        selector + '{\n' +
        entries
            .map(([property, value]) => '  ' + property + ':' + value + ';')
            .join('\n') +
        '\n}'
    );
}

function statesAreSameShape(a, b) {
    if (
        a.shapeIndex !== b.shapeIndex ||
        a.direction !== b.direction ||
        Boolean(a.gradient) !== Boolean(b.gradient)
    ) {
        return false;
    }

    if (a.gradient) {
        return a.color === b.color &&
            a.gradientColor === b.gradientColor;
    }

    return true;
}

function buildMirroredPairSvg(svg, direction, namespace) {
    const horizontal = direction === 'top' || direction === 'bottom';
    const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
    const values = (parsed.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    const [x, y, width, height] = values.length === 4 ? values : [0, 0, Number(parsed.getAttribute('width')) || 1, Number(parsed.getAttribute('height')) || 1];
    // Reflect in the source coordinate system, preserving its native SVG
    // viewport and aspect-ratio alignment within each half of the pair.
    const reflection = horizontal
        ? 'translate(' + (2 * x + width) + ' 0) scale(-1 1)'
        : 'translate(0 ' + (2 * y + height) + ') scale(1 -1)';
    const tiles = [0, 1].map((mirrored) => {
        const tile = parsed.cloneNode(true);
        tile.setAttribute('x', horizontal && mirrored ? '50%' : '0');
        tile.setAttribute('y', !horizontal && mirrored ? '50%' : '0');
        tile.setAttribute('width', horizontal ? '50%' : '100%');
        tile.setAttribute('height', horizontal ? '100%' : '50%');
        // Bleed half a pixel into each neighbor to close rasterization seams.
        // Each half is 1px wider than its cell, so adjacent mirrors overlap 1px.
        tile.setAttribute(horizontal ? 'x' : 'y', mirrored ? 'calc(50% - 0.5px)' : '-0.5');
        tile.setAttribute(horizontal ? 'width' : 'height', 'calc(50% + 1px)');
        if (mirrored) {
            const group = parsed.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('transform', reflection);
            while (tile.firstChild) group.appendChild(tile.firstChild);
            tile.appendChild(group);
        }
        return namespaceInlineSvgIds(new XMLSerializer().serializeToString(tile), namespace + '-' + mirrored);
    });
    // No outer viewBox: nested viewports retain their physical aspect ratios.
    return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" overflow="visible" aria-hidden="true" focusable="false">' + tiles.join('') + '</svg>';
}

function getMirroredStateCss(state, namespace, copy) {
    const horizontal = state.direction === 'top' || state.direction === 'bottom';
    const scale = Math.max(1, Number(state.animationLongAxis) || 1);
    const trackScale = 2 * scale + 1;
    const pairPercent = 100 * 2 * scale / trackScale;
    const shortAxis = (Number(state.shortAxis) || 0) * (state.ratio ? scale : 1);
    const name = namespace + '-' + state.key + '-mirror-loop';
    const transform = 'translate' + (horizontal ? 'X' : 'Y') + '(calc(-' + pairPercent + '% + 2px))';
    const { cycleDuration } = getOneDirectionTiming(state);
    return {
        declarations: {
            display: copy ? 'none' : 'block', position: 'absolute', color: '#' + state.color,
            ...(state.gradient ? {
                '--shape-gradient-color-1': '#' + state.color,
                '--shape-gradient-color-2': '#' + state.gradientColor
            } : {}),
            'max-width': 'none', opacity: '1',
            top: horizontal ? (state.direction === 'top' ? '-0.1vw' : 'auto') : '0',
            bottom: horizontal && state.direction === 'bottom' ? '-0.1vw' : 'auto',
            left: horizontal ? '0' : state.direction === 'left' ? '-0.1vw' : 'auto',
            right: !horizontal && state.direction === 'right' ? '-0.1vw' : 'auto',
            width: horizontal ? (trackScale * 100) + '%' : shortAxis + 'px',
            height: horizontal ? shortAxis + 'px' : (trackScale * 100) + '%',
            'transform-origin': '0 0', transform,
            animation: name + ' ' + cycleDuration + 's linear ' + (state.animationOffset ? '-' + state.animationOffset + 's ' : '') + 'infinite'
        },
        keyframes: '@keyframes ' + name + '{\n  from{transform:' + transform + ';}\n  to{transform:translate' + (horizontal ? 'X' : 'Y') + '(0);}\n}'
    };
}

function getPairedStateCss(state, namespace, copy) {
    if (hasMotionEffects(state) && !state.oneDirection && !state.depthScale && !state.depthLayers) {
        const css = getMotionLayout(state,namespace);
        if (copy) css.declarations.display = 'none';
        return css;
    }
    const css = getSvgStateDeclarations(state, namespace);
    css.declarations.opacity = '1';
    if (!state.animate || !state.oneDirection) {
        if (copy) css.declarations.display = 'none';
        if (state.animate && state.animationOffset) css.declarations['animation-delay'] = '-' + state.animationOffset + 's';
        return css;
    }
    if (state.mirrorLoop) return getMirroredStateCss(state, namespace, copy);
    if (Number(state.animationLongAxis) <= 1) {
        css.declarations.animation = 'none';
        if (copy) css.declarations.display = 'none';
        css.keyframes = '';
        return css;
    }

    const { cycleDuration, fade, inset } = getOneDirectionTiming(state);
    const horizontal = state.direction === 'top' || state.direction === 'bottom';
    const scale = Math.max(1, Number(state.animationLongAxis) || 1);
    const scaleFunction = 'scale' + (state.ratio ? '' : horizontal ? 'X' : 'Y');
    const percent = (fraction) => Number((fraction * 100).toFixed(6));
    const transform = (progress) => scaleFunction + '(' + scale + ') translate' +
        (horizontal ? 'X' : 'Y') + '(' + percent(progress * (1 - 1 / scale)) + '%)';
    const name = namespace + '-' + state.key + '-one-direction';
    css.declarations.transform = transform(inset);
    css.declarations.animation = name + ' ' + cycleDuration + 's linear ' +
        (-cycleDuration * (2 * fade + copy * 0.5) - (state.animationOffset || 0)) + 's infinite';
    css.keyframes = '@keyframes ' + name + '{\n' +
        '  0%{transform:' + transform(inset) + ';opacity:0;}\n' +
        '  ' + percent(fade) + '%{opacity:1;}\n' +
        '  ' + percent(0.5 + fade) + '%{opacity:1;}\n' +
        '  ' + percent(0.5 + 2 * fade) + '%{transform:' + transform(1 - inset) + ';opacity:0;}\n' +
        '  100%{transform:' + transform(1 - inset) + ';opacity:0;}\n}';
    return css;
}

// Use the same geometry and phase offsets as the canvas preview. Full viewport
// declarations also reset the second copy when a breakpoint stops animating.
function buildPairedExportCode(format, suppliedStates = null, suppliedWrapper = null) {
    const states = suppliedStates || getSvgExportStates();
    const wrapper = suppliedWrapper || shapeCSSName + (format === 'css' ? '' : '-' + format);
    const ordered = !suppliedStates && mobileReady ? [states[2], states[1], states[0]] : states;
    const rules = [formatDeclarationRule('.' + wrapper, format === 'css'
        ? { position: 'relative', overflow: 'hidden' }
        : { position: 'absolute', inset: '0', overflow: 'hidden', 'pointer-events': 'none', 'z-index': '3' })];
    const keyframes = new Set();
    const markup = [];
    const symbols = new Map();
    function getSvgInstance(state, className) {
        const advanced = hasMotionEffects(state);
        const key = [state.shapeIndex, state.direction, Boolean(state.gradient),advanced ? JSON.stringify([state.effects,state.color,state.gradientColor,state.animationLength]) : ''].join('|');
        if (!symbols.has(key)) {
            const id = wrapper + '-symbol-' + symbols.size;
            const svg = advanced
                ? buildMotionSvg({...state,oneDirection:false,depthLayers:false,effects:{...state.effects,sparks:false}},id+'-motion')
                : getPlainExportSvg(state.shapeIndex, state.direction, id, state.gradient, state.color, state.gradientColor);
            const root = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
            const symbol = root.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'symbol');
            [...root.attributes].forEach(({ name, value }) => {
                if (!['class', 'id', 'width', 'height', 'x', 'y', 'aria-hidden', 'focusable', 'xmlns'].includes(name)) symbol.setAttribute(name, value);
            });
            symbol.setAttribute('id', id);
            while (root.firstChild) symbol.appendChild(root.firstChild);
            const viewBox = symbol.getAttribute('viewBox') || '0 0 1 1';
            symbols.set(key, { id, viewBox, markup: new XMLSerializer().serializeToString(symbol) });
        }
        const { id, viewBox } = symbols.get(key);
        const [x, y, width, height] = viewBox.trim().split(/[\s,]+/).map(Number);
        // Keep the native viewport so mirror transforms and aspect-ratio sizing
        // are identical to the original SVG; only the geometry is referenced.
        return '<svg xmlns="http://www.w3.org/2000/svg" class="' + className + '" viewBox="' + viewBox +
            '" preserveAspectRatio="' + (advanced ? 'none' : getPreserveAspectRatioAttribute(state)) + '" aria-hidden="true" focusable="false">' +
            '<use href="#' + id + '" x="' + x + '" y="' + y + '" width="' + width + '" height="' + height + '"/></svg>';
    }
    function getPreserveAspectRatioAttribute(state) {
        const svg = svgDividers[state.shapeIndex][state.direction];
        return svg.match(/preserveAspectRatio=["']([^"']+)["']/i)?.[1] || 'xMidYMid meet';
    }
    if (format === 'mask') preparedMaskFiles = [];

    ordered.forEach((state, index) => {
        const group = wrapper + '__' + state.key;
        const mirrored = state.animate && state.oneDirection && state.mirrorLoop;
        const horizontal = state.direction === 'top' || state.direction === 'bottom';
        const scale = Math.max(1, Number(state.animationLongAxis) || 1);
        const pairPercent = 100 * 2 * scale / (2 * scale + 1);
        const pairSize = 'calc(' + pairPercent + '% - 2px)';
        const stateRules = [];
        const minWidth = index === 1 ? 768 : 1025;
        if (format !== 'css') {
            rules.push(formatDeclarationRule('.' + group, {
                display: index ? 'none' : 'block', position: 'absolute', inset: '0'
            }));
            if (index) {
                stateRules.push('.' + wrapper + ' > .' + wrapper + '__' + ordered[index - 1].key + '{display:none;}', '.' + wrapper + ' > .' + group + '{display:block;}');
            }
        }
        const fileName = group + '.svg';
        if (format === 'mask') {
            const svg = getMaskSvg(state.shapeIndex, state.direction);
            preparedMaskFiles.push({ fileName, svg: mirrored ? buildMirroredPairSvg(svg, state.direction, group) : svg });
        }
        let backgroundImage;
        if (format === 'css') {
            const svg = buildShapeSvgMarkup(
                svgDividers[state.shapeIndex][state.direction], state.color, state.gradient, state.gradientColor, state.direction
            );
            backgroundImage = 'url("data:image/svg+xml;charset=utf8,' + encodeURIComponent(mirrored ? buildMirroredPairSvg(svg, state.direction, group) : svg) + '")';
        }
        const layerMarkup = [];
        const layered = state.animate && state.depthLayers;
        getDepthLayers(state).forEach((layer, layerIndex) => {
            const layerState = layer.state;
            const layerGroup = layered ? group + '__depth-' + layerIndex : group;
            const copies = [];
            for (let copy = 0; copy < 2; copy++) {
                const className = layerGroup + '-' + copy;
                const selector = format === 'css'
                    ? '.' + wrapper + (copy ? '::after' : '::before')
                    : '.' + layerGroup + ' > .' + className;
                const css = getPairedStateCss(layerState, wrapper, copy);
                const declarations = { ...css.declarations, 'z-index': '3', 'pointer-events': 'none' };
                if (format === 'css') {
                    declarations.content = "''";
                    declarations['background-image'] = mirrored && copy ? 'none' : backgroundImage;
                    declarations['background-repeat'] = mirrored ? (horizontal ? 'repeat-x' : 'repeat-y') : 'no-repeat';
                    declarations['background-size'] = mirrored ? (horizontal ? pairSize + ' 100%' : '100% ' + pairSize) : '100% 100%';
                } else if (format === 'mask') {
                    Object.assign(declarations, {
                        background: getMaskBackground(layerState),
                        '-webkit-mask-image': 'url("' + fileName + '")', 'mask-image': 'url("' + fileName + '")',
                        '-webkit-mask-repeat': mirrored ? (horizontal ? 'repeat-x' : 'repeat-y') : 'no-repeat',
                        'mask-repeat': mirrored ? (horizontal ? 'repeat-x' : 'repeat-y') : 'no-repeat',
                        '-webkit-mask-size': mirrored ? (horizontal ? pairSize + ' 100%' : '100% ' + pairSize) : '100% 100%',
                        'mask-size': mirrored ? (horizontal ? pairSize + ' 100%' : '100% ' + pairSize) : '100% 100%'
                    });
                    copies.push('<div class="' + className + '"></div>');
                } else {
                    const svg = getSvgInstance({...layerState,animationLength:state.animationLength}, className);
                    if (mirrored) {
                        const pairs = copy ? '' : [0, 1].map((tile) => buildMirroredPairSvg(svg, layerState.direction, className + '-' + tile).replace(
                            '<svg ', '<svg style="position:absolute;overflow:visible;' + (horizontal
                                ? 'width:' + pairSize + ';height:100%;left:' + (tile ? pairSize : '0') + ';top:0;'
                                : 'width:100%;height:' + pairSize + ';left:0;top:' + (tile ? pairSize : '0') + ';') + '" '
                        )).join('');
                        copies.push('<div class="' + className + '">' + pairs + '</div>');
                    } else copies.push(svg);
                }
                stateRules.push(formatDeclarationRule(selector, declarations));
                if (format === 'svg' && hasMotionEffects(state)) stateRules.push('@media(prefers-reduced-motion:reduce){'+selector+'{animation:none!important}}');
                if (css.keyframes) keyframes.add(css.keyframes);
            }
            layerMarkup.push(layered
                ? '<div class="' + layerGroup + '" style="position:absolute;inset:0;opacity:' + layer.opacity + '">' + copies.join('\n') + '</div>'
                : copies.join('\n'));
        });
        if (format === 'svg') {
            const sparks = buildMotionSparksSvg(state,group+'-sparks');
            if (sparks) {
                layerMarkup.push(sparks);
                stateRules.push(formatDeclarationRule('.'+group+'-sparks',getMotionSparksLayout(state,group+'-sparks').declarations));
            }
        }
        rules.push(index ? '@media (min-width:' + minWidth + 'px){\n' + stateRules.join('\n') + '\n}' : stateRules.join('\n'));
        if (format !== 'css') markup.push('<div class="' + group + '">\n' + layerMarkup.join('\n') + '\n</div>');
    });

    const desktop = states[0];
    if (desktop.direction === 'top' || desktop.direction === 'bottom') {
        const shortScale = desktop.animate && desktop.oneDirection && desktop.mirrorLoop && desktop.ratio
            ? Math.max(1, Number(desktop.animationLongAxis) || 1) : 1;
        getDepthLayers(desktop).forEach((layer, index) => {
            const selector = format === 'css' ? '.' + wrapper + '::before, .' + wrapper + '::after'
                : '.' + wrapper + ' .' + wrapper + '__desktop' + (desktop.animate && desktop.depthLayers ? '__depth-' + index : '') + ' > *';
            rules.push('@media (min-width:2100px){\n' + formatDeclarationRule(selector, {
                height: 'calc(' + (2 * shortScale * layer.scale) + 'vw + ' + ((Number(layer.state.shortAxis) || 0) * shortScale) + 'px)'
            }) + '\n}');
        });
    }
    const code = rules.concat([...keyframes]).join('\n\n');
    const definitions = symbols.size ? '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' +
        [...symbols.values()].map((symbol) => symbol.markup).join('') + '</defs></svg>\n' : '';
    return format === 'css' ? code : '<style>\n' + code + '\n</style>\n' + definitions + '<div class="' + wrapper + '">\n' + markup.join('\n') + '\n</div>';
}

function buildSvgExportCode() {
    if (usesMotionEffects()) return buildMotionExportCode('svg');
    if (getSvgExportStates().some((state) => state.animate && (state.oneDirection || state.depthLayers))) return buildPairedExportCode('svg');
    const wrapperClass = shapeCSSName + '-svg';
    const states = getSvgExportStates();
    const hasAnyAnimation = states.some((state) => state.animate);
    const hasAnyTransform = states.some(
        (state) => state.animate || state.flipped
    );
    const stateDeclarationOptions = {
        includeTransformReset: hasAnyTransform,
        includeAnimationReset: hasAnyAnimation
    };

    const mobileState = mobileReady
        ? states.find((state) => state.key === 'mobile')
        : states[0];

    const tabletState = mobileReady
        ? states.find((state) => state.key === 'tablet')
        : null;

    const desktopState = states.find((state) => state.key === 'desktop');

    const uniqueShapeStates = [];

    [mobileState, tabletState, desktopState]
        .filter(Boolean)
        .forEach((state) => {
            const existing = uniqueShapeStates.find(
                (candidate) => statesAreSameShape(candidate, state)
            );

            if (!existing) uniqueShapeStates.push(state);
        });

    const shapeEntries = uniqueShapeStates.map((state, index) => ({
        state,
        className: wrapperClass + '__shape-' + index
    }));

    function getShapeEntry(state) {
        return shapeEntries.find(
            (entry) => statesAreSameShape(entry.state, state)
        );
    }

    const rules = [
        formatDeclarationRule(
            '.' + wrapperClass,
            {
                position: 'absolute',
                inset: '0',
                overflow: 'hidden',
                'pointer-events': 'none',
                'z-index': '3'
            }
        )
    ];

    if (shapeEntries.length > 1) {
        rules.push(
            shapeEntries
                .map((entry) => '.' + wrapperClass + ' .' + entry.className)
                .join(', ') +
            '{display:none;}'
        );
    }

    const baseEntry = getShapeEntry(mobileState);
    const baseStateCss = getSvgStateDeclarations(
        mobileState,
        wrapperClass,
        stateDeclarationOptions
    );
    const baseDeclarations = {
        ...baseStateCss.declarations,
        'z-index': '3',
        'pointer-events': 'none'
    };

    rules.push(
        formatDeclarationRule(
            '.' + wrapperClass + ' .' + baseEntry.className,
            baseDeclarations
        )
    );

    const keyframes = [];
    if (baseStateCss.keyframes) keyframes.push(baseStateCss.keyframes);

    let previousEntry = baseEntry;
    let previousDeclarations = baseStateCss.declarations;

    const responsiveSteps = mobileReady
        ? [
            { minWidth: 768, state: tabletState },
            { minWidth: 1025, state: desktopState }
        ]
        : [];

    responsiveSteps.forEach(({ minWidth, state }) => {
        const entry = getShapeEntry(state);
        const stateCss = getSvgStateDeclarations(
            state,
            wrapperClass,
            stateDeclarationOptions
        );
        const mediaRules = [];

        if (entry !== previousEntry) {
            mediaRules.push(
                '.' + wrapperClass + ' .' + previousEntry.className +
                '{display:none;}'
            );

            const changedFromHidden = {
                ...stateCss.declarations,
                display: 'block'
            };

            mediaRules.push(
                formatDeclarationRule(
                    '.' + wrapperClass + ' .' + entry.className,
                    changedFromHidden
                )
            );
        } else {
            const changed = diffDeclarations(
                previousDeclarations,
                stateCss.declarations
            );

            const changedRule = formatDeclarationRule(
                '.' + wrapperClass + ' .' + entry.className,
                changed
            );

            if (changedRule) mediaRules.push(changedRule);
        }

        if (mediaRules.length) {
            rules.push(
                '@media (min-width:' + minWidth + 'px){\n' +
                mediaRules.join('\n\n') +
                '\n}'
            );
        }

        if (stateCss.keyframes) keyframes.push(stateCss.keyframes);

        previousEntry = entry;
        previousDeclarations = stateCss.declarations;
    });

    if (
        desktopState.direction === 'top' ||
        desktopState.direction === 'bottom'
    ) {
        const desktopEntry = getShapeEntry(desktopState);

        rules.push(
            '@media (min-width:2100px){\n' +
            formatDeclarationRule(
                '.' + wrapperClass + ' .' + desktopEntry.className,
                {
                    height:
                        'calc(2vw + ' +
                        (Number(desktopState.shortAxis) || 0) +
                        'px)'
                }
            ) +
            '\n}'
        );
    }

    const markup = shapeEntries.map((entry) =>
        getPlainExportSvg(
            entry.state.shapeIndex,
            entry.state.direction,
            entry.className,
            entry.state.gradient,
            entry.state.color,
            entry.state.gradientColor
        )
    );

    const styleCode = rules
        .filter(Boolean)
        .concat([...new Set(keyframes)])
        .join('\n\n');

    return (
        '<style>\n' +
        styleCode +
        '\n</style>\n\n' +
        '<div class="' + wrapperClass + '">\n' +
        markup
            .map((svg) => '  ' + svg.replace(/\n/g, '\n  '))
            .join('\n') +
        '\n</div>'
    );
}


function getMaskSvg(shapeIndex, direction) {
    const rawSvg = svgDividers[shapeIndex][direction];
    const normalizedSvg = normalizeSvgForCanvas(rawSvg, 'ffffff');

    return replaceSvgColorsWithPaint(normalizedSvg, '#fff')
        .replace(/\saria-hidden=(["']).*?\1/gi, '')
        .replace(/\sfocusable=(["']).*?\1/gi, '');
}

function getMaskBackground(state) {
    if (!state.gradient) {
        return '#' + state.color;
    }

    const cssDirection =
        state.direction === 'top' ? 'to bottom' :
        state.direction === 'bottom' ? 'to top' :
        state.direction === 'left' ? 'to right' :
        'to left';

    return (
        'linear-gradient(' + cssDirection + ', ' +
        '#' + state.color + ', ' +
        '#' + state.gradientColor + ')'
    );
}

function getMaskStateDeclarations(
    state,
    fileName,
    animationNamespace,
    {
        includeTransformReset = true,
        includeAnimationReset = true
    } = {}
) {
    const horizontal =
        state.direction === 'top' || state.direction === 'bottom';
    const longAxis = Number(state.longAxis) || 100;
    const shortAxis = Number(state.shortAxis) || 0;
    const position = Number(state.position) || 0;
    const positionedPercent =
        state.flipped && !state.animate
            ? 100 - position
            : position;
    const offset =
        positionedPercent * (1 - longAxis / 100);
    const animationScale =
        Math.max(1, Number(state.animationLongAxis) || 1);

    const declarations = {
        display: 'block',
        position: 'absolute',
        background: getMaskBackground(state),
        '-webkit-mask-image': 'url("' + fileName + '")',
        'mask-image': 'url("' + fileName + '")',
        '-webkit-mask-repeat': 'no-repeat',
        'mask-repeat': 'no-repeat',
        '-webkit-mask-size': '100% 100%',
        'mask-size': '100% 100%',
        top: 'auto',
        right: 'auto',
        bottom: 'auto',
        left: 'auto',
        width: 'auto',
        height: 'auto',
        ...(includeTransformReset ? {
            transform: 'none',
            'transform-origin': 'center'
        } : {}),
        ...(includeAnimationReset ? {
            animation: 'none'
        } : {})
    };

    let keyframes = '';

    if (state.animate) {
        if (horizontal) {
            declarations.width = '100%';
            declarations.height = shortAxis + 'px';
            declarations.left = '0';
            declarations[state.direction === 'top' ? 'top' : 'bottom'] =
                '-0.1vw';
        } else {
            declarations.width = shortAxis + 'px';
            declarations.height = '100%';
            declarations.top = '0';
            declarations[state.direction === 'left' ? 'left' : 'right'] =
                '-0.1vw';
        }

        const scaleFunction = horizontal
            ? 'scale' + (state.ratio ? '' : 'X')
            : 'scale' + (state.ratio ? '' : 'Y');

        const transformOrigin =
            state.direction === 'top' ? '100% 0' :
            state.direction === 'bottom' ? '100% 100%' :
            state.direction === 'right' ? '100% 100%' :
            '0 100%';

        const keyframeName =
            animationNamespace + '-' + state.key + '-animation';

        declarations.transform =
            scaleFunction + '(' + animationScale + ')';
        declarations['transform-origin'] = transformOrigin;
        declarations.animation =
            (Number(state.animationLength) || 1) +
            's infinite alternate ' + keyframeName + ' linear';

        const translateAxis = horizontal ? 'X' : 'Y';

        keyframes =
            '@keyframes ' + keyframeName + '{\n' +
            '  100%{transform:' +
            scaleFunction + '(' + animationScale + ') translate' +
            translateAxis +
            '(calc(100% - (100% / ' + animationScale + ')));}\n' +
            '}';
    } else {
        if (horizontal) {
            declarations.width = longAxis + '%';
            declarations.height = shortAxis + 'px';
            declarations.left = offset + '%';
            declarations[state.direction === 'top' ? 'top' : 'bottom'] =
                '-0.1vw';
        } else {
            declarations.width = shortAxis + 'px';
            declarations.height = longAxis + '%';
            declarations.top = offset + '%';
            declarations[state.direction === 'left' ? 'left' : 'right'] =
                '-0.1vw';
        }

        if (state.flipped) {
            declarations.transform = horizontal
                ? 'scaleX(-1)'
                : 'scaleY(-1)';
        }
    }

    return { declarations, keyframes };
}

function buildMaskExportCode() {
    if (usesMotionEffects()) return hasColoredMotionEffects() ? '' : buildMotionExportCode('mask');
    if (getSvgExportStates().some((state) => state.animate && (state.oneDirection || state.depthLayers))) return buildPairedExportCode('mask');
    const wrapperClass = shapeCSSName + '-mask';
    const states = getSvgExportStates();
    const hasAnyAnimation = states.some((state) => state.animate);
    const hasAnyTransform = states.some(
        (state) => state.animate || state.flipped
    );
    const stateDeclarationOptions = {
        includeTransformReset: hasAnyTransform,
        includeAnimationReset: hasAnyAnimation
    };

    const mobileState = mobileReady
        ? states.find((state) => state.key === 'mobile')
        : states[0];
    const tabletState = mobileReady
        ? states.find((state) => state.key === 'tablet')
        : null;
    const desktopState =
        states.find((state) => state.key === 'desktop');

    const uniqueShapeStates = [];

    [mobileState, tabletState, desktopState]
        .filter(Boolean)
        .forEach((state) => {
            const existing = uniqueShapeStates.find(
                (candidate) =>
                    candidate.shapeIndex === state.shapeIndex &&
                    candidate.direction === state.direction
            );

            if (!existing) uniqueShapeStates.push(state);
        });

    const shapeEntries = uniqueShapeStates.map((state, index) => ({
        state,
        className: wrapperClass + '__shape-' + index,
        fileName: wrapperClass + '-' + index + '.svg'
    }));

    function getShapeEntry(state) {
        return shapeEntries.find(
            (entry) =>
                entry.state.shapeIndex === state.shapeIndex &&
                entry.state.direction === state.direction
        );
    }

    preparedMaskFiles = shapeEntries.map((entry) => ({
        fileName: entry.fileName,
        svg: getMaskSvg(
            entry.state.shapeIndex,
            entry.state.direction
        )
    }));

    const rules = [
        formatDeclarationRule(
            '.' + wrapperClass,
            {
                position: 'absolute',
                inset: '0',
                overflow: 'hidden',
                'pointer-events': 'none',
                'z-index': '3'
            }
        )
    ];

    if (shapeEntries.length > 1) {
        rules.push(
            shapeEntries
                .map((entry) =>
                    '.' + wrapperClass + ' .' + entry.className
                )
                .join(', ') +
            '{display:none;}'
        );
    }

    const baseEntry = getShapeEntry(mobileState);
    const baseCss = getMaskStateDeclarations(
        mobileState,
        baseEntry.fileName,
        wrapperClass,
        stateDeclarationOptions
    );

    rules.push(
        formatDeclarationRule(
            '.' + wrapperClass + ' .' + baseEntry.className,
            {
                ...baseCss.declarations,
                'z-index': '3',
                'pointer-events': 'none'
            }
        )
    );

    const keyframes = [];
    if (baseCss.keyframes) keyframes.push(baseCss.keyframes);

    let previousEntry = baseEntry;
    let previousDeclarations = baseCss.declarations;

    const responsiveSteps = mobileReady
        ? [
            { minWidth: 768, state: tabletState },
            { minWidth: 1025, state: desktopState }
        ]
        : [];

    responsiveSteps.forEach(({ minWidth, state }) => {
        const entry = getShapeEntry(state);
        const stateCss = getMaskStateDeclarations(
            state,
            entry.fileName,
            wrapperClass,
            stateDeclarationOptions
        );
        const mediaRules = [];

        if (entry !== previousEntry) {
            mediaRules.push(
                '.' + wrapperClass + ' .' +
                previousEntry.className + '{display:none;}'
            );

            mediaRules.push(
                formatDeclarationRule(
                    '.' + wrapperClass + ' .' + entry.className,
                    {
                        ...stateCss.declarations,
                        display: 'block'
                    }
                )
            );
        } else {
            const changed = diffDeclarations(
                previousDeclarations,
                stateCss.declarations
            );
            const changedRule = formatDeclarationRule(
                '.' + wrapperClass + ' .' + entry.className,
                changed
            );

            if (changedRule) mediaRules.push(changedRule);
        }

        if (mediaRules.length) {
            rules.push(
                '@media (min-width:' + minWidth + 'px){\n' +
                mediaRules.join('\n\n') +
                '\n}'
            );
        }

        if (stateCss.keyframes) keyframes.push(stateCss.keyframes);

        previousEntry = entry;
        previousDeclarations = stateCss.declarations;
    });

    if (
        desktopState.direction === 'top' ||
        desktopState.direction === 'bottom'
    ) {
        const desktopEntry = getShapeEntry(desktopState);

        rules.push(
            '@media (min-width:2100px){\n' +
            formatDeclarationRule(
                '.' + wrapperClass + ' .' +
                desktopEntry.className,
                {
                    height:
                        'calc(2vw + ' +
                        (Number(desktopState.shortAxis) || 0) +
                        'px)'
                }
            ) +
            '\n}'
        );
    }

    const markup =
        '<div class="' + wrapperClass + '">\n' +
        shapeEntries
            .map((entry) =>
                '  <div class="' + entry.className + '"></div>'
            )
            .join('\n') +
        '\n</div>';

    const styleCode = rules
        .filter(Boolean)
        .concat([...new Set(keyframes)])
        .join('\n\n');

    return (
        '<style>\n' +
        styleCode +
        '\n</style>\n\n' +
        markup
    );
}

function downloadPreparedMaskFiles() {
    if (!preparedMaskFiles.length) return;

    preparedMaskFiles.forEach((file, index) => {
        window.setTimeout(() => {
            const blob = new Blob(
                [file.svg],
                { type: 'image/svg+xml;charset=utf-8' }
            );
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = file.fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();

            window.setTimeout(
                () => URL.revokeObjectURL(url),
                1000
            );
        }, index * 150);
    });
}

function setExportTab(tabName) {
    if ((tabName === 'css' && (usesDepthLayers() || usesMotionEffects())) || (tabName === 'mask' && hasColoredMotionEffects())) tabName = 'svg';
    activeExportTab = tabName;

    exportTabs.forEach((tab) => {
        const active = tab.dataset.exportTab === tabName;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    exportPanels.forEach((panel) => {
        panel.classList.toggle(
            'is-active',
            panel.dataset.exportPanel === tabName
        );
    });

    if (exportCopyLabel) {
        exportCopyLabel.textContent = 'Copy';
    }
}

function prepareExportModalCode() {
    updateShape();
    const layered = usesDepthLayers() || usesMotionEffects();
    const colored = hasColoredMotionEffects();
    const maskTab = exportTabs.find(tab=>tab.dataset.exportTab === 'mask');
    if (maskTab) {
        maskTab.disabled = colored;
        maskTab.setAttribute('aria-disabled',String(colored));
        setExportTooltip(maskTab, colored ? 'Lighting, ribbon colors and sparks need SVG code to preserve their colors.' : '');
    }
    if (exportMaskDownloadButton) exportMaskDownloadButton.hidden = usesMotionEffects();
    const cssTab = exportTabs.find((tab) => tab.dataset.exportTab === 'css');
    if (cssTab) {
        cssTab.disabled = layered;
        cssTab.setAttribute('aria-disabled', String(layered));
        if (layered) cssTab.setAttribute('aria-describedby', 'export-depth-note');
        else cssTab.removeAttribute('aria-describedby');
    }
    let depthNote = document.getElementById('export-depth-note');
    if (!depthNote && exportModal) {
        exportModal.querySelector('.export-modal__tabs')?.insertAdjacentHTML('afterend',
            '<p id="export-depth-note" class="export-modal__availability" hidden>Depth layers need extra elements. Choose SVG code or SVG mask; CSS-only export is unavailable.</p>');
        depthNote = document.getElementById('export-depth-note');
    }
    if (depthNote) {
        depthNote.hidden = !layered;
        depthNote.textContent = colored
            ? 'SVG code export preserves all colors and lighting. CSS and SVG mask exports cannot preserve these colored layers.'
            : usesMotionEffects()
                ? 'Animation layers need SVG elements. Choose SVG code or SVG mask. The animated mask is included inline; no extra files are needed.'
                : 'Depth layers need extra elements. Choose SVG code or SVG mask; CSS-only export is unavailable.';
    }
    setExportTooltip(cssTab, layered ? 'Animation layers and depth layers need SVG elements. Choose SVG code.' : '');

    if (requiresPremiumFeatures() && !hasPremiumAccess()) {
        const message = getPremiumExportMessage();
        preparedCssExport = message;
        preparedSvgExport = message;
        preparedMaskExport = message;
        preparedMaskFiles = [];
    } else {
        generateUniqueCSSName();
        preparedCssExport = layered ? '' : generateCssExportCode({ renewClassName: false });
        preparedSvgExport = buildSvgExportCode();
        preparedMaskExport = buildMaskExportCode();
    }

    if (exportCssCode) exportCssCode.textContent = preparedCssExport;
    if (exportSvgCode) exportSvgCode.textContent = preparedSvgExport;
    if (exportMaskCode) exportMaskCode.textContent = preparedMaskExport;
}

function openExportModal() {
    if (!exportModal) return;

    prepareExportModalCode();
    setExportTab('css');
    exportModal.hidden = false;
    document.body.classList.add('export-modal-open');
    exportModal.querySelector('.export-modal__close')?.focus();
}

function closeExportModal() {
    if (!exportModal) return;

    visibleControlTooltips.forEach(instance => instance.hide());
    exportModal.hidden = true;
    document.body.classList.remove('export-modal-open');
    copyCodeButton?.focus();
}

copyCodeButton?.addEventListener('click', () => {
    formUpdate('copy');
    openExportModal();
});

premiumButton?.addEventListener('click', () => {
    formUpdate('premium');
});

exportTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
        setExportTab(tab.dataset.exportTab);
    });
});

document.querySelectorAll('[data-export-close]').forEach((control) => {
    control.addEventListener('click', closeExportModal);
});

exportMaskDownloadButton?.addEventListener(
    'click',
    downloadPreparedMaskFiles
);

exportCopyButton?.addEventListener('click', async () => {
    const code =
        activeExportTab === 'svg'
            ? preparedSvgExport
            : activeExportTab === 'mask'
                ? preparedMaskExport
                : preparedCssExport;

    const copied = await writeClipboard(code);

    if (!copied) {
        if (exportCopyLabel) {
            exportCopyLabel.textContent = 'Copy failed';
            window.setTimeout(() => {
                if (exportCopyLabel) exportCopyLabel.textContent = 'Copy';
            }, 1800);
        }
        return;
    }

    if (exportCopyLabel) {
        exportCopyLabel.textContent = 'Copied!';
        window.setTimeout(() => {
            if (exportCopyLabel) exportCopyLabel.textContent = 'Copy';
        }, 1400);
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && exportModal && !exportModal.hidden) {
        closeExportModal();
    }
});














function copyRightCode(){
    
shapeDiv = `
${mobileReady? `@media (min-width:1025px){` : `.${shapeCSSName}{
overflow:hidden;
position:relative;
}`}
.${shapeCSSName}::before{ ${mobileReady? '' : `
content:'';
font-family:'shape divider from ShapeDividers.com';
position: absolute;
z-index: 3;
pointer-events: none;
background-repeat: no-repeat;`}
bottom: -0.1vw;
left: -0.1vw;
right: -0.1vw;
top: -0.1vw; ${animate? `
transform:${(dividerDirection === 'top' || dividerDirection === 'bottom')? `scale${shapeRatio? '' : 'X'}(${animLongAxis});` : `scale${shapeRatio? '' : 'Y'}(${animLongAxis});`}
transform-origin: ${dividerDirection === 'top' ? '100% 0;' : dividerDirection === 'bottom' ? '100% 100%;' : dividerDirection === 'right' ? '100% 100%;' : dividerDirection === 'left' ? '0 100%;' : ''}
animation: ${animLength}s infinite alternate ${(mobileDividerDirection != dividerDirection || mobileShapeRatio != shapeRatio || mobileAnimLongAxis != animLongAxis || !mobileReady || !mobileAnimate)? `${(dividerDirection === 'top' || dividerDirection === 'bottom')? `${animHorName}` : `${animVerName}`} ` : `${(dividerDirection === 'top' || dividerDirection === 'bottom')? `${animHorName}-mobile` : `${animVerName}-mobile`} `} linear;
background-size: ${(dividerDirection === 'top' || dividerDirection === 'bottom')? '100%' : shortAxisValue + 'px'} ${(dividerDirection === 'top' || dividerDirection === 'bottom')? shortAxisValue + 'px' : '100%'};` : `${(!flipped && mobileReady && (tabletAnimate || tabletFlipped || mobileAnimate || mobileFlipped)) ? `
transform:none;` : ''}${(flipped && mobileReady && (tabletAnimate || mobileAnimate)) ? `
transform-origin:initial;` : ''}${(mobileAnimate || tabletAnimate)? `
animation:none;`:''}
background-size: ${(dividerDirection === 'top' || dividerDirection === 'bottom')? longAxisValue + '%' : shortAxisValue + 'px'} ${(dividerDirection === 'top' || dividerDirection === 'bottom')? shortAxisValue + 'px' : longAxisValue + '%'};`}
background-position: ${dividerDirection === 'left'? 0 : dividerDirection === 'right'? 100 : positionValue}% ${dividerDirection === 'top'? 0 : dividerDirection === 'bottom'? 100 : positionValue }%; ${(flipped && !animate) ? `
transform: rotate${ (dividerDirection === 'top' || dividerDirection === 'bottom')? 'Y' : 'X'}(180deg);` : ''} ${mobileReady? `${tabletSelectedShape == selectedShape? '': `
background-image: url('data:image/svg+xml;charset=utf8, ${selectedShape}'); `}` : `\nbackground-image: url('data:image/svg+xml;charset=utf8, ${selectedShape}'); `}
}
${mobileReady? '}' : ''}
${(dividerDirection === 'top' || dividerDirection === 'bottom')? `@media (min-width:2100px){
.${shapeCSSName}::before{
background-size: ${animate ? '100%' : longAxisValue + '%'} ${'calc(2vw + ' + shortAxisValue + 'px)'};
}
}` : '' }
${animate? `
${(mobileDividerDirection != dividerDirection || mobileShapeRatio != shapeRatio || mobileAnimLongAxis != animLongAxis || !mobileReady || !mobileAnimate)? `@keyframes ${(dividerDirection === 'top' || dividerDirection === 'bottom')? `${animHorName} {
  100% {
    transform: scale${shapeRatio? '' : 'X'}(${animLongAxis}) translateX(calc(100% - (100% / ${animLongAxis})));
  }
}

` : `${animVerName} {
  100% {
    transform: scale${shapeRatio? '' : 'Y'}(${animLongAxis}) translateY(calc(100% - (100% / ${animLongAxis})));
  }
}`} ` : ''} `:''} `;

   if (mobileReady) {

      tabletShapeColor = document.getElementById('tablet-shape-color').value.slice(1);
      tabletDividerDirection = ([...genform.tabletdividerdirection].filter((r) => r.checked)[0] || {}).value;
      tabletLongAxisValue = document.getElementById("tablet-long_axis").value;
      tabletShortAxisValue = document.getElementById("tablet-short_axis").value;
      tabletPositionValue = document.getElementById("tablet-position").value;
      tabletFlipped = document.getElementById('tablet-flipped-checkbox').checked;

      tabletSelectedShape = encodeSvgForCss(
         buildShapeSvgMarkup(
            svgDividers[tabletShapeIndex][tabletDividerDirection],
            tabletShapeColor,
            tabletGradient,
            tabletGradientColor,
            tabletDividerDirection
         )
      );

      if (views[1].classList.contains('active')) {
         colorDiv.style.backgroundColor = '#' + tabletShapeColor;
      }

tabletShapeDiv = `@media (min-width:768px){
.${shapeCSSName}::before{${tabletAnimate? `
transform:${(tabletDividerDirection === 'top' || tabletDividerDirection === 'bottom')? `scale${tabletShapeRatio? '' : 'X'}(${tabletAnimLongAxis});` : `scale${tabletShapeRatio? '' : 'Y'}(${tabletAnimLongAxis});`}
transform-origin: ${tabletDividerDirection === 'top' ? '100% 0;' : tabletDividerDirection === 'bottom' ? '100% 100%;' : tabletDividerDirection === 'right' ? '100% 100%;' : tabletDividerDirection === 'left' ? '0 100%;' : ''}
animation: ${tabletAnimLength}s infinite alternate ${(mobileDividerDirection != tabletDividerDirection || mobileShapeRatio != tabletShapeRatio || mobileAnimLongAxis != tabletAnimLongAxis || !mobileAnimate)? `${(tabletDividerDirection === 'top' || tabletDividerDirection === 'bottom')? `${animHorName}-tablet` : `${animVerName}-tablet`}` : `${(tabletDividerDirection === 'top' || tabletDividerDirection === 'bottom')? `${animHorName}-mobile` : `${animVerName}-mobile`}`} linear;
background-size: ${(tabletDividerDirection === 'top' || tabletDividerDirection === 'bottom')? '100%' : tabletShortAxisValue + 'px'} ${(tabletDividerDirection === 'top' || tabletDividerDirection === 'bottom')? tabletShortAxisValue + 'px' : '100%'};` : `${(!tabletFlipped && (mobileAnimate || mobileFlipped)) ? `
transform:none;` : ''}${(tabletFlipped && mobileAnimate) ? `
transform-origin:initial;` : ''}${mobileAnimate ? `
animation:none;` : ''}
background-size: ${(tabletDividerDirection === 'top' || tabletDividerDirection === 'bottom')? tabletLongAxisValue + '%' : tabletShortAxisValue + 'px'} ${(tabletDividerDirection === 'top' || tabletDividerDirection === 'bottom')? tabletShortAxisValue + 'px' : tabletLongAxisValue + '%'};`}
background-position: ${tabletDividerDirection === 'left'? 0 : tabletDividerDirection === 'right'? 100 : tabletPositionValue}% ${tabletDividerDirection === 'top'? 0 : tabletDividerDirection === 'bottom'? 100 : tabletPositionValue }%;  ${(tabletFlipped && !tabletAnimate) ? `
transform: rotate${ (tabletDividerDirection === 'top' || tabletDividerDirection === 'bottom')? 'Y' : 'X'}(180deg);` : ''} ${mobileSelectedShape == tabletSelectedShape? '': `
background-image: url('data:image/svg+xml;charset=utf8, ${tabletSelectedShape}'); `}
}  
}
${tabletAnimate? `
${(mobileDividerDirection != tabletDividerDirection || mobileShapeRatio != tabletShapeRatio || mobileAnimLongAxis != tabletAnimLongAxis || !mobileAnimate)? `@keyframes ${(tabletDividerDirection === 'top' || tabletDividerDirection === 'bottom')? `${animHorName}-tablet {
  100% {
    transform: scale${tabletShapeRatio? '' : 'X'}(${tabletAnimLongAxis}) translateX(calc(100% - (100% / ${tabletAnimLongAxis})));
  }
}` : `${animVerName}-tablet {
  100% {
    transform: scale${tabletShapeRatio? '' : 'Y'}(${tabletAnimLongAxis}) translateY(calc(100% - (100% / ${tabletAnimLongAxis})));
  }
}` }` : ''} `:''} `;

      mobileShapeColor = document.getElementById('mobile-shape-color').value.slice(1);
      mobileDividerDirection = ([...genform.mobiledividerdirection].filter((r) => r.checked)[0] || {}).value;
      mobileLongAxisValue = document.getElementById("mobile-long_axis").value;
      mobileShortAxisValue = document.getElementById("mobile-short_axis").value;
      mobilePositionValue = document.getElementById("mobile-position").value;
      mobileFlipped = document.getElementById('mobile-flipped-checkbox').checked;

      mobileSelectedShape = encodeSvgForCss(
         buildShapeSvgMarkup(
            svgDividers[mobileShapeIndex][mobileDividerDirection],
            mobileShapeColor,
            mobileGradient,
            mobileGradientColor,
            mobileDividerDirection
         )
      );
      if (views[2].classList.contains('active')) {
         colorDiv.style.backgroundColor = '#' + mobileShapeColor;
      }


mobileShapeDiv = `.${shapeCSSName}{
overflow:hidden;
position:relative;
}
.${shapeCSSName}::before{
content:'';
font-family:'shape divider from ShapeDividers.com';
position: absolute;
bottom: -1px;
left: -1px;
right: -1px;
top: -1px;
z-index: 3;
pointer-events: none;
background-repeat: no-repeat; ${mobileAnimate? `
transform:${(mobileDividerDirection === 'top' || mobileDividerDirection === 'bottom')? `scale${mobileShapeRatio? '' : 'X'}(${mobileAnimLongAxis});` : `scale${mobileShapeRatio? '' : 'Y'}(${mobileAnimLongAxis});`}
transform-origin: ${mobileDividerDirection === 'top' ? '100% 0;' : mobileDividerDirection === 'bottom' ? '100% 100%;' : mobileDividerDirection === 'right' ? '100% 100%;' : mobileDividerDirection === 'left' ? '0 100%;' : ''}
animation: ${mobileAnimLength}s infinite alternate ${(mobileDividerDirection === 'top' || mobileDividerDirection === 'bottom')? `${animHorName}-mobile` : `${animVerName}-mobile`} linear;
background-size: ${(mobileDividerDirection === 'top' || mobileDividerDirection === 'bottom')? '100%' : mobileShortAxisValue + 'px'} ${(mobileDividerDirection === 'top' || mobileDividerDirection === 'bottom')? mobileShortAxisValue + 'px' : '100%'};` : `
background-size: ${(mobileDividerDirection === 'top' || mobileDividerDirection === 'bottom')? mobileLongAxisValue + '%' : mobileShortAxisValue + 'px'} ${(mobileDividerDirection === 'top' || mobileDividerDirection === 'bottom')? mobileShortAxisValue + 'px' : mobileLongAxisValue + '%'};`}
background-position: ${mobileDividerDirection === 'left'? 0 : mobileDividerDirection === 'right'? 100 : mobilePositionValue}% ${mobileDividerDirection === 'top'? 0 : mobileDividerDirection === 'bottom'? 100 : mobilePositionValue }%;    ${(mobileFlipped && !mobileAnimate) ? `
transform: rotate${ (mobileDividerDirection === 'top' || mobileDividerDirection === 'bottom')? 'Y' : 'X'}(180deg);` : ''}
background-image: url('data:image/svg+xml;charset=utf8, ${mobileSelectedShape}'); 
}
${mobileAnimate?`
@keyframes ${(mobileDividerDirection === 'top' || mobileDividerDirection === 'bottom')? `${animHorName}-mobile {
  100% {
    transform: scale${mobileShapeRatio? '' : 'X'}(${mobileAnimLongAxis}) translateX(calc(100% - (100% / ${mobileAnimLongAxis})));
  }
}` : `${animVerName}-mobile {
  100% {
    transform: scale${mobileShapeRatio? '' : 'Y'}(${mobileAnimLongAxis}) translateY(calc(100% - (100% / ${mobileAnimLongAxis})));
  }
}` } ` : ''}
`;
} } 


/*********
 * Code for Share Link Design url
 * *******/
 
const shareLink = document.getElementById('share');
const shareLabel = shareLink.querySelector('[data-share-label]');
const shareDefaultLabel = shareLabel?.textContent || 'Share Your Design';
let shareFeedbackTimeout;

shareLink.addEventListener("click", async () => {
    const copied = await updateURL(true);
    formUpdate('share',false);

    if (!copied) {
        console.error('ShapeDividers: share link copy failed.');
        return;
    }

    if (shareLabel) {
        window.clearTimeout(shareFeedbackTimeout);
        shareLabel.textContent = 'Copied!';
        shareFeedbackTimeout = window.setTimeout(() => {
            shareLabel.textContent = shareDefaultLabel;
        }, 4000);
    }
});



/*************
 * Code for update range values
 * ***********/

const settings = {
   fill: "#1abc9c",
   background: "#d7dcdf",
};

const sliders = document.querySelectorAll(".range-slider");
Array.prototype.forEach.call(sliders, (slider) => {
   slider.querySelector("input").addEventListener("input", (event) => {
      slider.querySelector("span").textContent = event.target.value;
      applyFill(event.target);
   });
   applyFill(slider.querySelector("input"));
});

function applyFill(slider) {
   const percentage = (100 * (slider.value - slider.min)) / (slider.max - slider.min);
   const bg = `linear-gradient(90deg, ${settings.fill} ${percentage}%, ${settings.background} ${percentage + 0.1}%)`;
   slider.style.background = bg;
}

function refreshRangeSliders() {
    sliders.forEach((slider) => {
        const input = slider.querySelector('input');
        const value = slider.querySelector('span');
        if (!input || !value) return;
        value.textContent = input.value;
        applyFill(input);
    });
}

initializeSharedTooltips();
updateSettingsfromURL();
updateShape();

const shapePicker = document.createElement('div');
shapePicker.className = 'container';
shapePicker.style.overflowAnchor = 'none';
document.body.appendChild(shapePicker);

let hoverHereHint = document.createElement('div');
hoverHereHint.className = 'hover-here-hint';
hoverHereHint.textContent = 'Hover here';
document.body.appendChild(hoverHereHint);

let hoverHintTimer = null;

shapePicker.addEventListener('mouseenter', () => {
    if (!hoverHereHint || hoverHereHint.classList.contains('is-hidden')) return;

    window.clearTimeout(hoverHintTimer);
    hoverHintTimer = window.setTimeout(() => {
        hoverHintTimer = null;
        if (!hoverHereHint) return;

        hoverHereHint.classList.add('is-hidden');
        const removeHint = () => {
            hoverHereHint?.remove();
            hoverHereHint = null;
        };
        hoverHereHint.addEventListener('transitionend', removeHint, { once: true });
        window.setTimeout(removeHint, 500);
    }, 700);
});

shapePicker.addEventListener('mouseleave', () => {
    window.clearTimeout(hoverHintTimer);
    hoverHintTimer = null;
});

function configureAnimationAxisForShape(shape, direction) {
    const activeIndex = Math.max(0, getActiveViewIndex());
    const inputIds = [
        'animation_long_axis',
        'tablet-animation_long_axis',
        'mobile-animation_long_axis'
    ];

    const input = document.getElementById(inputIds[activeIndex]);
    if (!input) return;

    const preservesRatio = !getPreserveAspectRatio(shape[direction]).none;

    input.value = preservesRatio ? 3 : 4;
    input.max = preservesRatio ? 4 : 10;
}

const PICKER_BITMAP_LONG_SIDE = 1400;
const PICKER_PRELOAD_MARGIN = '800px 0px 800px 0px';

let shapePickerObserver = null;
let shapePickerResizeObserver = null;
let shapePickerRenderRevision = 0;

function getPickerContentBoxSize(canvas) {
    const styles = window.getComputedStyle(canvas);
    const bounds = canvas.getBoundingClientRect();

    // The picker uses global border-box sizing plus padding/borders.
    // Canvas pixels render into the content box, so use the actual
    // content-box ratio here to match the old inline SVG previews.
    const horizontalPadding =
        (parseFloat(styles.paddingLeft) || 0) +
        (parseFloat(styles.paddingRight) || 0);
    const verticalPadding =
        (parseFloat(styles.paddingTop) || 0) +
        (parseFloat(styles.paddingBottom) || 0);
    const horizontalBorder =
        (parseFloat(styles.borderLeftWidth) || 0) +
        (parseFloat(styles.borderRightWidth) || 0);
    const verticalBorder =
        (parseFloat(styles.borderTopWidth) || 0) +
        (parseFloat(styles.borderBottomWidth) || 0);

    return {
        width: Math.max(
            1,
            bounds.width - horizontalPadding - horizontalBorder
        ),
        height: Math.max(
            1,
            bounds.height - verticalPadding - verticalBorder
        )
    };
}

function getPickerContentSizeKey(canvas) {
    const size = getPickerContentBoxSize(canvas);

    return (
        size.width.toFixed(2) +
        'x' +
        size.height.toFixed(2)
    );
}

function getPickerCanvasSize(canvas, direction) {
    const contentSize = getPickerContentBoxSize(canvas);
    const cssWidth = contentSize.width;
    const cssHeight = contentSize.height;
    const horizontal = direction === 'top' || direction === 'bottom';

    if (horizontal) {
        return {
            width: PICKER_BITMAP_LONG_SIDE,
            height: Math.max(
                1,
                Math.round(
                    PICKER_BITMAP_LONG_SIDE * cssHeight / cssWidth
                )
            )
        };
    }

    return {
        width: Math.max(
            1,
            Math.round(
                PICKER_BITMAP_LONG_SIDE * cssWidth / cssHeight
            )
        ),
        height: PICKER_BITMAP_LONG_SIDE
    };
}

function setSvgRasterViewport(svgMarkup, width, height) {
    return svgMarkup.replace(/<svg\b([^>]*)>/i, (match, attributes) => {
        const cleanedAttributes = attributes
            .replace(/\swidth=(["']).*?\1/i, '')
            .replace(/\sheight=(["']).*?\1/i, '');

        return (
            '<svg' +
            cleanedAttributes +
            ' width="' + width + '"' +
            ' height="' + height + '"' +
            '>'
        );
    });
}

async function rasterizePickerSvg(svgMarkup, width, height) {
    const viewportSvg = setSvgRasterViewport(
        svgMarkup,
        width,
        height
    );

    const blob = new Blob(
        [viewportSvg],
        { type: 'image/svg+xml;charset=utf-8' }
    );
    const objectUrl = URL.createObjectURL(blob);

    try {
        const image = new Image();
        image.decoding = 'async';

        const loaded = new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = reject;
        });

        image.src = objectUrl;

        if (typeof image.decode === 'function') {
            try {
                await image.decode();
            } catch {
                await loaded;
            }
        } else {
            await loaded;
        }

        const rasterCanvas = document.createElement('canvas');
        rasterCanvas.width = width;
        rasterCanvas.height = height;

        const context = rasterCanvas.getContext('2d', { alpha: true });
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, 0, 0, width, height);

        if (typeof createImageBitmap === 'function') {
            return await createImageBitmap(rasterCanvas);
        }

        return rasterCanvas;
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

function invalidatePickerCanvas(canvas) {
    canvas.dataset.rendered = 'false';
    canvas.dataset.renderVersion = String(
        Number(canvas.dataset.renderVersion || 0) + 1
    );
}

function releasePickerCanvas(canvas) {
    canvas.dataset.nearby = 'false';
    invalidatePickerCanvas(canvas);
    delete canvas.dataset.renderedSizeKey;
    canvas.width = 1;
    canvas.height = 1;
}

async function renderPickerCanvas(canvas, shapeIndex, direction, revision) {
    if (
        canvas.dataset.rendering === 'true' ||
        canvas.dataset.rendered === 'true'
    ) {
        return;
    }

    const shape = svgDividers[shapeIndex];
    if (!shape || !shape[direction]) return;

    canvas.dataset.rendering = 'true';

    const renderVersion = Number(canvas.dataset.renderVersion || 0);
    const renderedSizeKey = getPickerContentSizeKey(canvas);
    const rawSvg = shape[direction];
    const svgMarkup = normalizeSvgForCanvas(rawSvg, '000000');
    let bitmap = null;
    let needsRerender = false;

    try {
        const size = getPickerCanvasSize(canvas, direction);

        // Render the SVG directly at the picker's final viewport ratio.
        // This lets the browser apply the root SVG's preserveAspectRatio
        // exactly as it did when the picker contained inline <svg>.
        bitmap = await rasterizePickerSvg(
            svgMarkup,
            size.width,
            size.height
        );

        if (
            revision !== shapePickerRenderRevision ||
            !canvas.isConnected ||
            canvas.dataset.nearby !== 'true' ||
            renderVersion !== Number(canvas.dataset.renderVersion || 0) ||
            renderedSizeKey !== getPickerContentSizeKey(canvas)
        ) {
            needsRerender =
                revision === shapePickerRenderRevision &&
                canvas.isConnected &&
                canvas.dataset.nearby === 'true';
            return;
        }

        canvas.width = size.width;
        canvas.height = size.height;

        const context = canvas.getContext('2d', {
            alpha: true,
            desynchronized: true
        });

        context.clearRect(0, 0, size.width, size.height);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';

        context.drawImage(
            bitmap,
            0,
            0,
            size.width,
            size.height
        );

        canvas.dataset.rendered = 'true';
        canvas.dataset.renderedSizeKey = renderedSizeKey;
    } catch (error) {
        console.error(
            'ShapeDividers: failed to render picker canvas.',
            error
        );
    } finally {
        canvas.dataset.rendering = 'false';

        if (bitmap && typeof bitmap.close === 'function') {
            bitmap.close();
        }

        if (
            needsRerender &&
            canvas.isConnected &&
            canvas.dataset.nearby === 'true' &&
            revision === shapePickerRenderRevision
        ) {
            canvas.dataset.rendered = 'false';
            renderPickerCanvas(
                canvas,
                shapeIndex,
                direction,
                revision
            );
        }
    }
}

function observePickerCanvases(revision) {
    shapePickerObserver?.disconnect();
    shapePickerResizeObserver?.disconnect();

    const canvases = [
        ...shapePicker.querySelectorAll('canvas[data-shape-preview]')
    ];

    if (typeof ResizeObserver === 'function') {
        shapePickerResizeObserver = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
                const canvas = entry.target;

                if (
                    !canvas.isConnected ||
                    canvas.dataset.nearby !== 'true'
                ) {
                    return;
                }

                const currentSizeKey =
                    getPickerContentSizeKey(canvas);
                const renderedSizeKey =
                    canvas.dataset.renderedSizeKey;

                if (
                    renderedSizeKey &&
                    renderedSizeKey === currentSizeKey
                ) {
                    return;
                }

                invalidatePickerCanvas(canvas);
                renderPickerCanvas(
                    canvas,
                    Number(canvas.dataset.shapePreview),
                    canvas.dataset.direction,
                    revision
                );
            });
        });

        canvases.forEach((canvas) => {
            shapePickerResizeObserver.observe(canvas);
        });
    }

    if (typeof IntersectionObserver === 'undefined') {
        canvases.forEach((canvas) => {
            canvas.dataset.nearby = 'true';
            renderPickerCanvas(
                canvas,
                Number(canvas.dataset.shapePreview),
                canvas.dataset.direction,
                revision
            );
        });
        return;
    }

    shapePickerObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                const canvas = entry.target;

                if (entry.isIntersecting) {
                    canvas.dataset.nearby = 'true';
                    renderPickerCanvas(
                        canvas,
                        Number(canvas.dataset.shapePreview),
                        canvas.dataset.direction,
                        revision
                    );
                    return;
                }

                releasePickerCanvas(canvas);
            });
        },
        {
            root: shapePicker,
            rootMargin: PICKER_PRELOAD_MARGIN,
            threshold: 0
        }
    );

    canvases.forEach((canvas) => shapePickerObserver.observe(canvas));
}

const PICKER_CATEGORY_LIMIT = 10;
const expandedPickerCategories = new Set();

function getPickerCategoryEntries(entries, expanded) {
    // Keep the original order within each group and preserve source indexes.
    const groups = [[], [], [], []];
    entries.forEach((entry) => {
        const isFeatured =
            String(entry.shape.featured).trim().toUpperCase() === 'TRUE';
        const isPaid = Boolean(entry.shape.pro);
        const priority = (isFeatured ? 0 : 2) + (isPaid ? 1 : 0);
        groups[priority].push(entry);
    });

    const ordered = groups.flat();
    return expanded ? ordered : ordered.slice(0, PICKER_CATEGORY_LIMIT);
}

function capturePickerScrollAnchor(toggle) {
    const bounds = shapePicker.getBoundingClientRect();
    const anchors = [];
    const addAnchor = (element, kind, key) => {
        const rect = element.getBoundingClientRect();
        if (rect.bottom > bounds.top && rect.top < bounds.bottom) {
            anchors.push({ kind, key, offset: rect.top - bounds.top });
        }
    };

    // Prefer a visible shape that still exists after the category changes.
    shapePicker.querySelectorAll('[data-shape-index]').forEach((item) => {
        addAnchor(item, 'shape', item.dataset.shapeIndex);
    });
    if (toggle) {
        addAnchor(toggle, 'toggle', toggle.dataset.categoryToggle);
    }
    shapePicker.querySelectorAll('[data-picker-category]').forEach((section) => {
        const header = section.querySelector('.shape-category-header');
        if (header) addAnchor(header, 'category', section.dataset.pickerCategory);
    });

    return { anchors, scrollTop: shapePicker.scrollTop };
}

function restorePickerScrollAnchor(snapshot) {
    for (const anchor of snapshot.anchors) {
        let element;
        if (anchor.kind === 'shape') {
            element = shapePicker.querySelector(
                '[data-shape-index="' + anchor.key + '"]'
            );
        } else if (anchor.kind === 'toggle') {
            element = [...shapePicker.querySelectorAll('[data-category-toggle]')]
                .find((button) => button.dataset.categoryToggle === anchor.key);
        } else {
            const section = [...shapePicker.querySelectorAll('[data-picker-category]')]
                .find((item) => item.dataset.pickerCategory === anchor.key);
            element = section?.querySelector('.shape-category-header');
        }
        if (!element) continue;

        const currentOffset =
            element.getBoundingClientRect().top -
            shapePicker.getBoundingClientRect().top;
        shapePicker.scrollTop += currentOffset - anchor.offset;
        return;
    }

    shapePicker.scrollTop = snapshot.scrollTop;
}

function scrollPickerToSelectedShape() {
    const selected = shapePicker.querySelector(
        '[data-shape-index="' + getActiveShapeIndex() + '"]'
    );
    if (!selected) return;

    const bounds = shapePicker.getBoundingClientRect();
    const itemBounds = selected.getBoundingClientRect();
    const inset = Math.max(24, (shapePicker.clientHeight - itemBounds.height) / 2);

    // Scroll only the picker, never the surrounding page or preview.
    shapePicker.scrollTop += itemBounds.top - bounds.top - inset;
}

function renderShapePicker({ revealSelected = true, scrollAnchor = null } = {}) {
    const activeDirection = getActiveDirection();
    const activeShapeIndex = getActiveShapeIndex();
    const revision = ++shapePickerRenderRevision;

    shapePicker.className = `container ${activeDirection}`;

    const fragment = document.createDocumentFragment();
    const categories = new Map();

    svgDividers.forEach((shape, index) => {
        const category = String(shape.category || '').trim() || 'Other';
        if (!categories.has(category)) categories.set(category, []);
        categories.get(category).push({ shape, index });
    });

    categories.forEach((entries, category) => {
        if (
            revealSelected &&
            entries.some((entry) => entry.index === activeShapeIndex) &&
            !getPickerCategoryEntries(entries, false)
                .some((entry) => entry.index === activeShapeIndex)
        ) {
            expandedPickerCategories.add(category);
        }
        const expanded = expandedPickerCategories.has(category);
        const section = document.createElement('section');
        section.className = 'shape-category';
        section.dataset.pickerCategory = category;

        const header = document.createElement('div');
        header.className = 'shape-category-header';
        const title = document.createElement('h2');
        title.className = 'shape-category-title';
        title.textContent = category + ' (' + entries.length + ')';
        header.appendChild(title);

        const list = document.createElement('div');
        list.className = 'shape-category-items';
        list.id = 'shape-category-' + fragment.childElementCount;

        const visibleEntries = getPickerCategoryEntries(entries, expanded);

        visibleEntries.forEach(({ shape, index }) => {
            const item = document.createElement('div');
            item.dataset.shapeIndex = String(index);
            item.classList.add('shape-picker-item', shape.slug, activeDirection);

            if (shape.pro) item.classList.add('premium');
            if (index === activeShapeIndex) item.classList.add('selected');

            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            canvas.dataset.shapePreview = String(index);
            canvas.dataset.direction = activeDirection;
            canvas.dataset.nearby = 'false';
            canvas.dataset.rendered = 'false';
            canvas.dataset.renderVersion = '0';
            canvas.setAttribute('aria-hidden', 'true');

            item.appendChild(canvas);
            list.appendChild(item);
        });

        section.appendChild(header);
        section.appendChild(list);
        if (entries.length > PICKER_CATEGORY_LIMIT) {
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'shape-category-toggle';
            toggle.dataset.categoryToggle = category;
            toggle.setAttribute('aria-expanded', String(expanded));
            toggle.setAttribute('aria-controls', list.id);
            toggle.setAttribute('aria-label',
                (expanded ? 'Show fewer shapes in ' : 'Show all shapes in ') + category
            );
            toggle.textContent = expanded
                ? 'Show less ' + category
                : 'Show All ' + category + ' (' + entries.length + ')';
            section.appendChild(toggle);
        }

        fragment.appendChild(section);
    });

    shapePicker.replaceChildren(fragment);
    if (scrollAnchor) {
        restorePickerScrollAnchor(scrollAnchor);
    } else if (revealSelected) {
        scrollPickerToSelectedShape();
    }
    observePickerCanvases(revision);
}

shapePicker.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-category-toggle]');
    if (toggle && shapePicker.contains(toggle)) {
        const category = toggle.dataset.categoryToggle;
        const scrollAnchor = capturePickerScrollAnchor(toggle);
        if (expandedPickerCategories.has(category)) {
            expandedPickerCategories.delete(category);
        } else {
            expandedPickerCategories.add(category);
        }
        renderShapePicker({ revealSelected: false, scrollAnchor });
        shapePicker.querySelectorAll('[data-category-toggle]').forEach((button) => {
            if (button.dataset.categoryToggle === category) {
                button.focus({ preventScroll: true });
            }
        });
        return;
    }

    const item = event.target.closest('[data-shape-index]');
    if (!item || !shapePicker.contains(item)) return;

    const index = Number(item.dataset.shapeIndex);
    if (!Number.isInteger(index) || !svgDividers[index]) return;

    setActiveShapeIndex(index);
    configureAnimationAxisForShape(svgDividers[index], getActiveDirection());
    updateSelectedShape();
    refreshRangeSliders();
    updateShape();
});

function updateSelectedShape() {
    const selectedIndex = getActiveShapeIndex();
    shapePicker.querySelectorAll('[data-shape-index]').forEach((item) => {
        item.classList.toggle('selected', Number(item.dataset.shapeIndex) === selectedIndex);
    });
}

renderShapePicker();

directionEntry.forEach((input) => {
    input.addEventListener('change', () => {
        renderShapePicker();
        updateSelectedShape();
    });
});

let preview = document.querySelector('.preview');
if (preview) {
    preview.addEventListener('mouseenter', function () {
        if (window.jQuery) {
            jQuery('.settings_window').fadeOut('quick');
        } else if (settingsWindow) {
            settingsWindow.style.display = 'none';
        }
    });

    preview.addEventListener('mouseleave', function () {
        if (window.jQuery) {
            jQuery('.settings_window').fadeIn('quick');
        } else if (settingsWindow) {
            settingsWindow.style.display = '';
        }
    });
}

function initializePreviewBackground() {
    if (!preview || !dividerPreviewHost) return;
    const images = [
        ['Tree','https://shapedividers.com/wp-content/uploads/2021/05/tree.jpg'],
        ['Milky Way','https://shapedividers.com/wp-content/uploads/2026/11/milky-way-1023340_1920.jpg'],
        ['Fashion','https://shapedividers.com/wp-content/uploads/2026/11/fashion-821506_1920.jpg'],
        ['Heart','https://shapedividers.com/wp-content/uploads/2026/11/heart-1077724_1920.jpg'],
        ['Light bulb','https://shapedividers.com/wp-content/uploads/2026/11/light-bulb-1246043_1920.jpg'],
        ['Running child','https://shapedividers.com/wp-content/uploads/2026/11/little-girl-running-795505_1920.jpg']
    ];
    let saved;
    try { saved = JSON.parse(localStorage.getItem('shapedividers.previewBackground')); }
    catch (_) { /* Preview preferences also work without browser storage. */ }
    const state = readPreviewBackground(urlParams,saved);
    previewBackgroundState = state;

    let button = document.getElementById('preview-background-toggle');
    if (!button) {
        preview.insertAdjacentHTML('afterend', '<button id="preview-background-toggle" class="preview-background-button" type="button" aria-label="Customize preview background" aria-expanded="false" aria-controls="preview-background-panel" aria-haspopup="dialog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.5 3-.6 2.1-1.8 1L5 5.6 2.5 9.9 4 11.5v2L2.5 15l2.5 4.3 2.1-.5 1.8 1 .6 2.1h5l.6-2.1 1.8-1 2.1.5 2.5-4.3-1.5-1.5v-2l1.5-1.6L19 5.6l-2.1.5-1.8-1L14.5 3Z"/><circle cx="12" cy="12.5" r="3.2"/></svg></button>');
        button = document.getElementById('preview-background-toggle');
    }
    const panel = document.createElement('section');
    panel.id = 'preview-background-panel';
    panel.className = 'sd-background-panel';
    panel.hidden = true;
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-labelledby','preview-background-heading');
    panel.innerHTML = '<div class="sd-background-header"><h2 id="preview-background-heading">Preview background</h2><button type="button" class="sd-background-close" aria-label="Close background settings">×</button></div>'+
        '<fieldset class="sd-background-modes"><legend class="sd-background-sr">Background type</legend><label><input type="radio" name="preview-background-mode" value="image"><span>Image</span></label><label><input type="radio" name="preview-background-mode" value="color"><span>Solid color</span></label></fieldset>'+
        '<fieldset class="sd-background-photos"><legend class="sd-background-sr">Choose a background image</legend><div class="sd-background-grid">'+images.map(([name,url],index)=>'<label class="sd-background-photo"><input type="radio" name="preview-background-image" value="'+index+'" aria-label="'+name+' background"><span class="sd-background-thumbnail"><img src="'+url+'" alt="" loading="lazy" decoding="async"><span class="sd-background-photo-name">'+name+'</span><span class="sd-background-selected" aria-hidden="true">✓</span></span></label>').join('')+'</div></fieldset>'+
        '<div class="sd-background-solid" hidden><label for="preview-background-color">Background color</label><div class="sd-background-color-fields"><input type="color" id="preview-background-color" aria-label="Preview background color"><input type="text" id="preview-background-hex" aria-label="Preview background hex code" maxlength="7" spellcheck="false"></div></div>'+
        '<p class="sd-background-status" aria-live="polite"></p>';
    document.body.appendChild(panel);
    const modeInputs = [...panel.querySelectorAll('[name="preview-background-mode"]')];
    const photoInputs = [...panel.querySelectorAll('[name="preview-background-image"]')];
    const photos = panel.querySelector('.sd-background-photos');
    const solid = panel.querySelector('.sd-background-solid');
    const color = panel.querySelector('#preview-background-color');
    const hex = panel.querySelector('#preview-background-hex');
    const status = panel.querySelector('.sd-background-status');

    function applyBackground() {
        // Inline 'none' also overrides the original tree image in styles.css.
        dividerPreviewHost.style.backgroundImage = state.mode === 'image' ? 'url("'+images[state.image][1]+'")' : 'none';
        dividerPreviewHost.style.backgroundColor = state.color;
        modeInputs.forEach(input=>{input.checked = input.value === state.mode;});
        photoInputs.forEach((input,index)=>{input.checked = index === state.image;});
        photos.hidden = state.mode !== 'image';
        solid.hidden = state.mode !== 'color';
        color.value = state.color;
        hex.value = state.color;
        hex.removeAttribute('aria-invalid');
        status.textContent = state.mode === 'image' ? 'Image · '+images[state.image][0] : 'Solid color · '+state.color.toUpperCase();
        try { localStorage.setItem('shapedividers.previewBackground',JSON.stringify(state)); } catch (_) {}
    }
    function positionPanel() {
        if (panel.hidden) return;
        const bounds = button.getBoundingClientRect();
        panel.style.left = Math.max(12,Math.min(bounds.left,window.innerWidth-panel.offsetWidth-12))+'px';
        const maxBottom = Math.max(12,window.innerHeight-panel.offsetHeight-12);
        panel.style.bottom = Math.min(maxBottom,Math.max(12,window.innerHeight-bounds.top+12))+'px';
    }
    function closePanel(restoreFocus = false) {
        panel.hidden = true;
        button.setAttribute('aria-expanded','false');
        if (restoreFocus) button.focus({preventScroll:true});
    }
    function positionButton() {
        button.hidden = preview.offsetWidth === 0 || preview.offsetHeight === 0;
        if (button.hidden) { closePanel(); return; }
        button.style.left = (preview.offsetLeft+preview.offsetWidth+8)+'px';
        button.style.top = preview.offsetTop+'px';
        button.style.width = preview.offsetWidth+'px';
        button.style.height = preview.offsetHeight+'px';
        positionPanel();
    }
    button.addEventListener('click',()=> {
        if (!panel.hidden) { closePanel(); return; }
        visibleControlTooltips.forEach(instance=>instance.hide());
        panel.hidden = false;
        button.setAttribute('aria-expanded','true');
        positionPanel();
        modeInputs.find(input=>input.checked)?.focus({preventScroll:true});
    });
    panel.querySelector('.sd-background-close').addEventListener('click',()=>closePanel(true));
    document.addEventListener('pointerdown',event=> {
        if (!panel.hidden && !panel.contains(event.target) && !button.contains(event.target)) closePanel();
    });
    document.addEventListener('keydown',event=> {
        if (event.key === 'Escape' && !panel.hidden) {
            event.preventDefault();
            closePanel(true);
        }
    });
    modeInputs.forEach(input=>input.addEventListener('change',()=> {
        state.mode = input.value;
        applyBackground();
        positionPanel();
    }));
    photoInputs.forEach(input=>input.addEventListener('change',()=> {
        state.image = Number(input.value);
        state.mode = 'image';
        applyBackground();
    }));
    color.addEventListener('input',()=> {
        state.mode = 'color'; state.color = color.value;
        applyBackground();
    });
    hex.addEventListener('input',()=> {
        const valid = /^#[a-f\d]{6}$/i.test(hex.value);
        hex.setAttribute('aria-invalid',String(!valid));
        if (!valid) return;
        state.mode = 'color'; state.color = hex.value.toLowerCase();
        applyBackground();
    });
    setControlTooltip(button,'Customize preview background',{focusable:false});
    window.addEventListener('resize',positionButton);
    window.addEventListener('scroll',positionPanel,{passive:true});
    if (typeof ResizeObserver === 'function') {
        const observer = new ResizeObserver(positionButton);
        observer.observe(preview);
        if (preview.offsetParent) observer.observe(preview.offsetParent);
    }
    applyBackground();
    positionButton();
}
initializePreviewBackground();

let formElement = document.querySelector('.elementor-form');
let formCreatedShape = document.getElementById('form-field-createdshape');
let formClicked = document.getElementById('form-field-clicked') || document.getElementById('clicked');
let formSi = document.getElementById('form-field-si');
let formTsi = document.getElementById('form-field-tsi');
let formMsi = document.getElementById('form-field-msi');
let formMobileReady = document.getElementById('form-field-mobileready');
let formAnimated = document.getElementById('form-field-animated');
let formGradient = document.getElementById('form-field-gradient');
let formHasPremium = document.getElementById('form-field-haspremium');
let formShapeIsPremium = document.getElementById('form-field-shapeispremium');


function formUpdate(clicked = '', refreshUrl = true) {
    // These handlers run only for Copy Code, Premium and Share. Updating the
    // history is synchronous, so the form captures the freshly serialized URL.
    if (refreshUrl) updateURL(false);
    if (
        !formElement ||
        !formCreatedShape ||
        !formSi ||
        !formTsi ||
        !formMsi ||
        !formMobileReady ||
        !formAnimated ||
        !formGradient ||
        !formHasPremium ||
        !formShapeIsPremium
    ) {
        return;
    }

    if (formClicked) formClicked.value = clicked;
    formCreatedShape.value = window.location.href;
    formSi.value = svgDividers[shapeIndex].si;
    formTsi.value = svgDividers[tabletShapeIndex].si;
    formMsi.value = svgDividers[mobileShapeIndex].si;
    formMobileReady.value = mobileReady;
    formAnimated.value = animate || (mobileReady && (tabletAnimate || mobileAnimate));
    formGradient.value = (gradient || (mobileReady && (tabletGradient || mobileGradient))) ? 'TRUE' : 'FALSE';
    formHasPremium.value = hasPremiumAccess();
    formShapeIsPremium.value = Boolean(
        svgDividers[shapeIndex].pro ||
        (mobileReady && (
            svgDividers[tabletShapeIndex].pro ||
            svgDividers[mobileShapeIndex].pro
        ))
    );

    const submitButton = formElement.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.click();
    }
}


    return initialPreviewReady;
}

async function ensureShapeDataLoaded() {
    if (typeof svgDividers !== 'undefined') {
        return;
    }

    const existingScript = document.querySelector('script[data-shapedividers-shapes]');

    if (existingScript) {
        await new Promise((resolve, reject) => {
            if (typeof svgDividers !== 'undefined') {
                resolve();
                return;
            }

            existingScript.addEventListener('load', resolve, { once: true });
            existingScript.addEventListener('error', reject, { once: true });
        });
        return;
    }

    await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/wp-content/uploads/__.js';
        script.dataset.shapedividersShapes = 'true';
        script.addEventListener('load', resolve, { once: true });
        script.addEventListener('error', reject, { once: true });
        document.head.appendChild(script);
    });
}

(async function bootShapeDividersApp() {
    let loadTimeout;
    try {
        document.body.classList.add('sd-is-loading');
        document.getElementById('shape-divider-tool')?.setAttribute('aria-busy', 'true');
        getShapeDividersLoader();
        await paintShapeDividersLoader();

        await Promise.race([
            ensureShapeDataLoaded(),
            new Promise((resolve, reject) => {
                loadTimeout = window.setTimeout(() => {
                    reject(new Error('Shape library loading timed out.'));
                }, 120000);
            })
        ]);
        window.clearTimeout(loadTimeout);

        if (typeof svgDividers === 'undefined' || !Array.isArray(svgDividers)) {
            throw new Error('__.js loaded without exposing a valid svgDividers array.');
        }

        setShapeDividersLoadingStage(1, 'Preparing your canvas…');
        await paintShapeDividersLoader();
        await initShapeDividersApp();
        await paintShapeDividersLoader();
        finishShapeDividersLoading();
    } catch (error) {
        failShapeDividersLoading(error);
    } finally {
        window.clearTimeout(loadTimeout);
    }
})();






