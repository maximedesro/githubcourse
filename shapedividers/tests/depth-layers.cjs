// Run with Playwright installed: node shapedividers/tests/one-direction-animation.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const root = path.join(__dirname, '..');
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200"><path fill="#000" d="M0 0H800V130Q600 20 400 130T0 130Z"/></svg>';
const fixtures = ['FALSE', 'TRUE', 'FALSE', 'TRUE'].map((ratio, si) => {
    const markup = si < 2 ? svg : svg.replace('fill="#000"', 'fill="#000" opacity="0.5"');
    return { si, ratio, category: 'Test', top: markup, bottom: markup, left: markup, right: markup };
});
const server = http.createServer((req, res) => {
    const name = new URL(req.url, 'http://localhost').pathname;
    if (name === '/') {
        res.setHeader('Content-Type', 'text/html');
        res.end('<!doctype html><html><head><link rel="stylesheet" href="/styles.css"></head><body id="github-html">' +
            fs.readFileSync(path.join(root, 'purehtml.html'), 'utf8') +
            '<script>const isPremium=true;const svgDividers=' + JSON.stringify(fixtures) + ';</script><script src="/app.js"></script></body></html>');
    } else if (name === '/app.js') {
        res.setHeader('Content-Type', 'application/javascript');
        // Expose internal state only in the test response.
        res.end(fs.readFileSync(path.join(root, 'app.js'), 'utf8').replace('    return initialPreviewReady;',
            '    window.animationTest = { updateShape, buildShareUrl, getSvgExportStates, getOneDirectionFrame, getOneDirectionTiming, getDepthLayers, getPreviewBounds: () => { const b = dividerPreviewHost.getBoundingClientRect(); return {width:b.width,height:b.height}; }, buildPairedExportCode, buildSvgExportCode, buildMaskExportCode, generateCssExportCode, getMaskFiles: () => preparedMaskFiles, drawAt: (seconds) => { stopPreviewAnimation(); drawDividerBitmap(bitmapCache.get(activePreviewCacheKey), getActiveCanvasState(), animationStartedAt + seconds * 1000); return previewCanvas.toDataURL(); } };\n    return initialPreviewReady;'));
    } else if (name === '/styles.css') {
        res.setHeader('Content-Type', 'text/css');
        res.end(fs.readFileSync(path.join(root, 'styles.css')));
    } else { res.writeHead(404); res.end(); }
});
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
        const output = await browser.newPage({ viewport: { width: 1440, height: 800 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        output.on('pageerror', error => errors.push(error.message));
        await page.route('https://**/*', route => route.abort());
        const url = 'http://127.0.0.1:' + server.address().port;
        for (const mode of ['alternate', 'one-direction', 'mirror']) for (const direction of ['top', 'bottom', 'left', 'right']) for (const shape of [0, 3]) {
            const query = '/?dividerDirection=' + direction + '&si=' + shape + '&animate=true&oneDirection=' + (mode !== 'alternate') + '&mirrorLoop=' + (mode === 'mirror') + '&depthLayers=true&animLength=10&animLongAxis=1.3';
            await page.goto(url + query);
            await page.waitForFunction(() => window.animationTest && !document.getElementById('sd-loader'));
            const data = await page.evaluate(() => {
                const state = animationTest.getSvgExportStates()[0];
                const svg = animationTest.buildSvgExportCode();
                const mask = animationTest.buildMaskExportCode();
                return { svg, mask, files: animationTest.getMaskFiles(), css: animationTest.generateCssExportCode(),
                    layers: animationTest.getDepthLayers(state), frames: [0, 5].map(animationTest.drawAt) };
            });
            assert.equal(data.css, null, 'CSS-only export must be unavailable with depth layers.');
            assert.notEqual(data.frames[0], data.frames[1], 'The canvas depth composition must actually animate.');
            assert.equal((data.svg.match(/<symbol\b/g) || []).length, 1);
            assert.equal((data.svg.match(/<path\b/g) || []).length, 1, 'All depth layers must share the geometry.');
            assert.equal((data.svg.match(/<use\b/g) || []).length, mode === 'mirror' ? 12 : 6);
            assert.equal(data.files.length, 1, 'All mask layers must share a single asset.');
            assert.deepEqual(data.layers.map(layer => layer.opacity), [0.25, 0.5, 1]);
            assert.deepEqual(data.layers.map(layer => layer.state.animationLength), [19, 14, 10]);
            for (const format of ['svg', 'mask']) {
                let code = data[format];
                if (format === 'mask') data.files.forEach(file => { code = code.replaceAll(file.fileName, 'data:image/svg+xml,' + encodeURIComponent(file.svg)); });
                const artworkCode = code.replace(/(?:%[0-9a-f]{2})+/gi, decodeURIComponent)
                    .replace(/<linearGradient id="[^"]+-seams-[01]-weight"[^>]*>[\s\S]*?<\/linearGradient>/g, '');
                assert.doesNotMatch(artworkCode, /gradient/i, 'Depth layers must not add color gradients.');
                const className = code.match(/<div class="([^"]+)"/)[1];
                await output.setContent('<style>html,body{margin:0}#host{position:relative;width:800px;height:400px}</style><div id="host">' + code + '</div>');
                const actual = await output.evaluate(({ className, ms }) => {
                    document.getAnimations().forEach(animation => { animation.pause(); animation.currentTime = ms; });
                    const host = document.querySelector('.' + className);
                    const group = [...host.children].find(e => getComputedStyle(e).display !== 'none');
                    return [...group.children].map(layer => ({ opacity: +getComputedStyle(layer).opacity, copies: [...layer.children].map(copy => {
                        const style = getComputedStyle(copy);
                        return { opacity: +style.opacity, duration: style.animationDuration, delay: parseFloat(style.animationDelay), display: style.display, height: parseFloat(style.height), width: parseFloat(style.width) };
                    }) }));
                }, { className, ms: 8500 });
                assert.deepEqual(actual.map(layer => layer.opacity), [0.25, 0.5, 1]);
                actual.forEach((layer, index) => {
                    assert.equal(layer.copies.length, 2);
                    const duration = [19, 14, 10][index] * (mode === 'alternate' ? 1 : 2);
                    assert.equal(layer.copies[0].duration, duration + 's');
                    assert.equal(layer.copies[1].display === 'none', mode !== 'one-direction');
                    const horizontal = direction === 'top' || direction === 'bottom';
                    const size = layer.copies[0][horizontal ? 'height' : 'width'];
                    const expected = 140 * [1, 0.85, 0.7][index] * (mode === 'mirror' && shape === 3 ? 1.3 : 1);
                    assert.ok(Math.abs(size - expected) < 0.03, JSON.stringify({ format, mode, direction, shape, index, size, expected }));
                    if (mode === 'one-direction') assert.equal(Math.max(...layer.copies.map(copy => copy.opacity)), 1, 'Fade-in-first must be preserved inside each depth layer.');
                });
                if (process.env.DEPTH_PREVIEW_SCREENSHOT && mode === 'mirror' && direction === 'top' && shape === 0 && format === 'svg') {
                    await output.locator('#host').screenshot({ path: process.env.DEPTH_PREVIEW_SCREENSHOT });
                }
                if (mode === 'mirror' && direction === 'top' && shape === 3) {
                    await output.setViewportSize({ width: 2200, height: 800 });
                    const heights = await output.evaluate(className => [...document.querySelector('.' + className).firstElementChild.children].map(layer => parseFloat(getComputedStyle(layer.firstElementChild).height)), className);
                    heights.forEach((height, index) => assert.ok(Math.abs(height - 184 * 1.3 * [1, 0.85, 0.7][index]) < 0.03, JSON.stringify({ format, heights, index })));
                    await output.setViewportSize({ width: 1440, height: 800 });
                }
            }
        }
        // UI availability and responsive inheritance.
        await page.locator('#copye').click();
        assert.equal(await page.locator('#export-tab-css').isDisabled(), true);
        assert.equal(await page.locator('#export-tab-svg').getAttribute('aria-selected'), 'true');
        assert.equal(await page.locator('#export-depth-note').isVisible(), true);
        await page.locator('#export-tab-mask').click();
        assert.equal(await page.locator('#export-tab-mask').getAttribute('aria-selected'), 'true');
        if (process.env.DEPTH_MODAL_SCREENSHOT) await page.screenshot({ path: process.env.DEPTH_MODAL_SCREENSHOT });
        await page.locator('.export-modal__close').click();
        await page.locator('#depth-layers-checkbox').uncheck();
        await page.locator('#copye').click();
        assert.equal(await page.locator('#export-tab-css').isDisabled(), false);
        assert.equal(await page.locator('#export-tab-css').getAttribute('aria-selected'), 'true');
        assert.equal(await page.locator('#export-depth-note').isVisible(), false);
        await page.locator('.export-modal__close').click();
        await page.evaluate(() => {
            document.getElementById('depth-layers-checkbox').checked = true;
            const responsive = document.getElementById('mobile-ready');
            responsive.checked = true; responsive.dispatchEvent(new Event('change', { bubbles: true }));
        });
        assert.equal(await page.locator('#tablet-depth-layers-checkbox').isChecked(), true);
        assert.equal(await page.locator('#mobile-depth-layers-checkbox').isChecked(), true);
        await page.evaluate(() => {
            document.getElementById('depth-layers-checkbox').checked = false;
            document.getElementById('mobile-depth-layers-checkbox').checked = false;
            animationTest.updateShape();
        });
        const share = await page.evaluate(() => animationTest.buildShareUrl());
        await page.goto(url + share);
        await page.waitForFunction(() => window.animationTest && !document.getElementById('sd-loader'));
        assert.equal(await page.locator('#depth-layers-checkbox').isChecked(), false);
        assert.equal(await page.locator('#tablet-depth-layers-checkbox').isChecked(), true);
        assert.equal(await page.locator('#mobile-depth-layers-checkbox').isChecked(), false);
        assert.equal(await page.evaluate(() => animationTest.generateCssExportCode()), null, 'Any enabled responsive depth setting must disable CSS export.');
        const code = await page.evaluate(() => animationTest.buildSvgExportCode());
        const className = code.match(/<div class="([^"]+)"/)[1];
        await output.setContent(code);
        for (const [width, layers] of [[500, 0], [800, 3], [1440, 0]]) {
            await output.setViewportSize({ width, height: 800 });
            const count = await output.evaluate(className => {
                const host = document.querySelector('.' + className);
                const group = [...host.children].find(e => getComputedStyle(e).display !== 'none');
                return [...group.children].filter(e => e.className.includes('__depth-')).length;
            }, className);
            assert.equal(count, layers);
        }
        assert.deepEqual(errors, []);
        console.log('PASS: depth layers across all edges, aspect/opacity fixtures, and animation modes; 25/50/100% group opacity, staggered speeds, shared SVG/mask geometry, wide sizing, CSS availability UI, responsive inheritance, and share URLs.');
    } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
