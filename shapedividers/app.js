function initShapeDividersApp() {
    if (window.__shapeDividersAppInitialized) {
        return;
    }
    window.__shapeDividersAppInitialized = true;
/* Runtime preview stylesheet */
const previewHost = document.querySelector('.htmlpreview > div');
if (!previewHost) {
    console.error('ShapeDividers: preview host was not found.');
    return;
}


    function buildShareUrl() {
    const desktopParams = [
        ['dividerDirection', dividerDirection],
        ['longAxisValue', longAxisValue],
        ['shortAxisValue', shortAxisValue],
        ['positionValue', positionValue],
        ['flipped', flipped],
        ['animate', animate],
        ['animLength', animLength],
        ['animLongAxis', animLongAxis],
        ['shapeColor', shapeColor],
        ['gradient', gradient],
        ['gradientColor', gradientColor],
        ['si', svgDividers[shapeIndex].si],
        ['shapeRatio', shapeRatio],
        ['mobileReady', mobileReady]
    ];

    const responsiveParams = [
        ['tabletDividerDirection', tabletDividerDirection],
        ['tabletLongAxisValue', tabletLongAxisValue],
        ['tabletShortAxisValue', tabletShortAxisValue],
        ['tabletPositionValue', tabletPositionValue],
        ['tabletFlipped', tabletFlipped],
        ['tabletAnimate', tabletAnimate],
        ['tabletAnimLength', tabletAnimLength],
        ['tabletAnimLongAxis', tabletAnimLongAxis],
        ['tabletShapeColor', tabletShapeColor],
        ['tabletGradient', tabletGradient],
        ['tabletGradientColor', tabletGradientColor],
        ['tsi', svgDividers[tabletShapeIndex].si],
        ['tabletShapeRatio', tabletShapeRatio],
        ['mobileDividerDirection', mobileDividerDirection],
        ['mobileLongAxisValue', mobileLongAxisValue],
        ['mobileShortAxisValue', mobileShortAxisValue],
        ['mobilePositionValue', mobilePositionValue],
        ['mobileFlipped', mobileFlipped],
        ['mobileAnimate', mobileAnimate],
        ['mobileAnimLength', mobileAnimLength],
        ['mobileAnimLongAxis', mobileAnimLongAxis],
        ['mobileShapeColor', mobileShapeColor],
        ['mobileGradient', mobileGradient],
        ['mobileGradientColor', mobileGradientColor],
        ['msi', svgDividers[mobileShapeIndex].si],
        ['mobileShapeRatio', mobileShapeRatio]
    ];

    const params = new URLSearchParams(desktopParams);
    if (mobileReady) {
        responsiveParams.forEach(([key, value]) => params.append(key, value));
    }

    const currentPath = window.location.pathname || '/';
    return currentPath + '?' + params.toString();
}

async function updateURL(copyToClipboard = false) {
    const shareUrl = buildShareUrl();
    window.history.replaceState({}, 'shape', shareUrl);

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

    syncGradientControl(prefix);
}

function updateSettingsfromURL() {
    if (urlStylesLoaded) return;

    if (urlParams.has('dividerDirection')) {
        restoreViewportFromURL('', 'divider', 'si');
        setCheckboxFromParam('mobile-ready', 'mobileReady');
    }

    if (urlParams.has('tabletDividerDirection')) {
        restoreViewportFromURL('tablet', 'tablet', 'tsi');
    }

    if (urlParams.has('mobileDividerDirection')) {
        restoreViewportFromURL('mobile', 'mobile', 'msi');
    }

    urlStylesLoaded = true;

    const responsiveEnabled =
        document.getElementById('mobile-ready').checked;

    viewsSelect.style.display = responsiveEnabled ? 'flex' : 'none';
    refreshRangeSliders();
}



function getShapeIndex(param) {
    const shapeId = urlParams.get(param);
    const index = svgDividers.findIndex((divider) => String(divider.si) === String(shapeId));
    return index >= 0 ? index : 0;
}

/* Form styling in part from https://codepen.io/dapacreative/pen/bdzYEe */
   
let dividerDirection, longAxisValue, shortAxisValue, positionValue, flipped, animate, animLength, animLongAxis, animHorName, animVerName, shapeDiv, shapeColor, gradient, gradientColor, shapeIndex, selectedShape, shapeRatio;

let tabletDividerDirection, tabletLongAxisValue, tabletShortAxisValue, tabletPositionValue, tabletFlipped, tabletAnimate, tabletAnimLength, tabletAnimLongAxis, tabletShapeDiv, tabletShapeColor, tabletGradient, tabletGradientColor, tabletShapeIndex, tabletSelectedShape, tabletShapeRatio;

let mobileDividerDirection, mobileLongAxisValue, mobileShortAxisValue, mobilePositionValue, mobileFlipped, mobileAnimate, mobileAnimLength, mobileAnimLongAxis, mobileShapeDiv, mobileShapeColor, mobileGradient, mobileGradientColor, mobileShapeIndex, mobileSelectedShape, mobileShapeRatio;

let mobileReady;


const genform = document.getElementById('genform');
if (!genform) {
    console.error('ShapeDividers: #genform was not found.');
    return;
}

const formEntries = document.querySelectorAll("#genform input");
const directionEntry = document.querySelectorAll(".row.radio input");

dividerDirection = 'top';
tabletDividerDirection = 'top';
mobileDividerDirection = 'top';
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

function getBitmapLongSide(state, bounds) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const horizontal = state.direction === 'top' || state.direction === 'bottom';
    const displayLongSide = horizontal ? bounds.width : bounds.height;

    const requestedScale = state.animate
        ? Math.max(1, Number(state.animationLongAxis) || 1)
        : Math.max(1, Number(state.longAxis) / 100 || 1);

    const rawSvg = svgDividers[state.shapeIndex][state.direction];
    const aspectRatio = Math.max(getSvgAspectRatio(rawSvg), 0.0001);
    const shortAxis = Math.max(1, Number(state.shortAxis) || 1);

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

function drawDividerBitmap(bitmap, state, timestamp = performance.now()) {
    const bounds = resizePreviewCanvas();
    const width = bounds.width;
    const height = bounds.height;

    previewContext.clearRect(0, 0, width, height);

    const horizontal = state.direction === 'top' || state.direction === 'bottom';
    const shortAxis = Math.max(0, Number(state.shortAxis) || 0);
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

    previewContext.save();

    if (state.flipped && !state.animate) {
        if (horizontal) {
            previewContext.translate(width, 0);
            previewContext.scale(-1, 1);
        } else {
            previewContext.translate(0, height);
            previewContext.scale(1, -1);
        }
    }

    const rawSvg = svgDividers[state.shapeIndex][state.direction];
    const preserveAspectRatio = getPreserveAspectRatio(rawSvg);

    drawImagePreservingSvgAspectRatio(
        previewContext,
        bitmap,
        x,
        y,
        drawWidth,
        drawHeight,
        preserveAspectRatio
    );

    previewContext.restore();
}

function stopPreviewAnimation() {
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

async function renderCanvasPreview(state) {
    latestPreviewState = state;
    const revision = ++canvasRenderRevision;
    stopPreviewAnimation();

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
            animationFrameId = requestAnimationFrame(animateFrame);
        };

        animationFrameId = requestAnimationFrame(animateFrame);
    } catch (error) {
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


let alreadyChangedView = false;

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
        document.getElementById(prefixedId(prefix, 'animation_length')).value =
            document.getElementById('animation_length').value;
        document.getElementById(prefixedId(prefix, 'animation_long_axis')).value =
            document.getElementById('animation_long_axis').value;

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

document.getElementById('mobile-ready').addEventListener('change', function() {
    if (this.checked) {
        if (
            !alreadyChangedView &&
            !urlParams.has('tabletDividerDirection')
        ) {
            syncResponsiveControlsFromDesktop();
        }

        alreadyChangedView = true;
        viewsSelect.style.display = 'flex';
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
        premiumButton.style.display = premiumRequired ? 'block' : 'none';
        loginButton.style.display = premiumRequired ? 'block' : 'none';
    }
}





formEntries.forEach((e, i) => {
   e.addEventListener('input', updateShape);
});

const longAxisContainers = document.querySelectorAll('.long-axis-container');
const positionContainers = document.querySelectorAll('.position-container');
const flippedContainers = document.querySelectorAll('.flipped-container');
const animationLengthContainers = document.querySelectorAll('.animation-length-container');
const animationLongAxisContainers = document.querySelectorAll('.animation-long-axis-container');


function prefixedId(prefix, baseId) {
    return prefix ? `${prefix}-${baseId}` : baseId;
}

function getCheckedDirection(prefix) {
    const groupName = prefix ? `${prefix}dividerdirection` : 'dividerdirection';
    return [...genform[groupName]].find((radio) => radio.checked)?.value || 'top';
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

    longAxisContainers[viewIndex].style.display = animated ? 'none' : 'block';
    positionContainers[viewIndex].style.display = animated ? 'none' : 'block';
    flippedContainers[viewIndex].style.display = animated ? 'none' : 'flex';
    animationLengthContainers[viewIndex].style.display = animated ? 'block' : 'none';
    animationLongAxisContainers[viewIndex].style.display = animated ? 'block' : 'none';

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
        mobileAnimLength = mobileState.animationLength;
        mobileAnimLongAxis = mobileState.animationLongAxis;
        mobileSelectedShape = mobileState.selectedShape;
        mobileShapeRatio = mobileState.ratio;

        updateViewportControlVisibility(2, mobileState);
        mobilePositionValue = mobileState.position;
    }

    const activeState = getActiveCanvasState();
    colorDiv.style.backgroundColor = '#' + activeState.color;
    previewer.className = 'previewer ' + activeState.direction;

    renderCanvasPreview(activeState);
    premiumCheck();
}

const copyCodeButton = document.getElementById("copye");
const premiumButton = document.getElementById("premium");
const loginButton = document.getElementById("login");

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
        'https://shapedividers.com/account/ if you have premium already!\n\nThank you!'
    );
}

function generateCssExportCode({ renewClassName = true } = {}) {
    if (requiresPremiumFeatures() && !hasPremiumAccess()) {
        return null;
    }

    if (renewClassName) {
        generateUniqueCSSName();
    }

    copyRightCode();

    return mobileReady
        ? mobileShapeDiv + tabletShapeDiv + shapeDiv
        : shapeDiv;
}


if (settingsWindow) {
    settingsWindow.addEventListener('mouseleave', function () {
        copyCodeButton.innerText = 'Copy code';
    });
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

function buildSvgExportCode() {
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

    if (requiresPremiumFeatures() && !hasPremiumAccess()) {
        const message = getPremiumExportMessage();
        preparedCssExport = message;
        preparedSvgExport = message;
        preparedMaskExport = message;
        preparedMaskFiles = [];
    } else {
        generateUniqueCSSName();
        preparedCssExport = generateCssExportCode({ renewClassName: false });
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

    exportModal.hidden = true;
    document.body.classList.remove('export-modal-open');
    copyCodeButton?.focus();
}

copyCodeButton?.addEventListener('click', openExportModal);

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
    await updateURL(false);

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

    formUpdate();

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
shareLink.addEventListener("click", async () => {
    const copied = await updateURL(true);

    if (!copied) {
        console.error('ShapeDividers: share link copy failed.');
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

updateSettingsfromURL();
updateShape();

const shapePicker = document.createElement('div');
shapePicker.className = 'container';
document.body.appendChild(shapePicker);

let hoverHereHint = document.createElement('div');
hoverHereHint.className = 'hover-here-hint';
hoverHereHint.textContent = 'Hover here';
document.body.appendChild(hoverHereHint);

shapePicker.addEventListener('mouseenter', () => {
    if (!hoverHereHint) return;

    hoverHereHint.classList.add('is-hidden');
    hoverHereHint.addEventListener('transitionend', () => {
        hoverHereHint?.remove();
        hoverHereHint = null;
    }, { once: true });
}, { once: true });

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

function renderShapePicker() {
    const activeDirection = getActiveDirection();
    const activeShapeIndex = getActiveShapeIndex();
    const revision = ++shapePickerRenderRevision;

    shapePicker.className = `container ${activeDirection}`;

    const fragment = document.createDocumentFragment();

    svgDividers.forEach((shape, index) => {
        const item = document.createElement('div');
        item.dataset.shapeIndex = String(index);
        item.classList.add(shape.slug, activeDirection);

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
        fragment.appendChild(item);
    });

    shapePicker.replaceChildren(fragment);
    observePickerCanvases(revision);
}

shapePicker.addEventListener('click', (event) => {
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

let formElement = document.querySelector('.elementor-form');
let formCreatedShape = document.getElementById('form-field-createdshape');
let formSi = document.getElementById('form-field-si');
let formTsi = document.getElementById('form-field-tsi');
let formMsi = document.getElementById('form-field-msi');
let formMobileReady = document.getElementById('form-field-mobileready');
let formAnimated = document.getElementById('form-field-animated');


function formUpdate() {
    if (
        !formElement ||
        !formCreatedShape ||
        !formSi ||
        !formTsi ||
        !formMsi ||
        !formMobileReady ||
        !formAnimated
    ) {
        return;
    }

    formCreatedShape.value = location.href;
    formSi.value = svgDividers[shapeIndex].si;
    formTsi.value = svgDividers[tabletShapeIndex].si;
    formMsi.value = svgDividers[mobileShapeIndex].si;
    formMobileReady.value = mobileReady;
    formAnimated.value = animate || (mobileReady && (tabletAnimate || mobileAnimate));

    const submitButton = formElement.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.click();
    }
}


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
        script.src = '/wp-content/uploads/shapes.js';
        script.dataset.shapedividersShapes = 'true';
        script.addEventListener('load', resolve, { once: true });
        script.addEventListener('error', reject, { once: true });
        document.head.appendChild(script);
    });
}

(async function bootShapeDividersApp() {
    try {
        await ensureShapeDataLoaded();

        if (typeof svgDividers === 'undefined' || !Array.isArray(svgDividers)) {
            throw new Error('shapes.js loaded without exposing a valid svgDividers array.');
        }

        initShapeDividersApp();
    } catch (error) {
        console.error('ShapeDividers failed to initialize:', error);
    }
})();
