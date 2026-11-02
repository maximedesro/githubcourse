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
            '    window.animationTest = { updateShape, buildShareUrl, getSvgExportStates, getOneDirectionFrame, getOneDirectionTiming, buildPairedExportCode, buildSvgExportCode, buildMaskExportCode, generateCssExportCode, getMaskFiles: () => preparedMaskFiles, drawAt: (seconds) => { stopPreviewAnimation(); drawDividerBitmap(bitmapCache.get(activePreviewCacheKey), getActiveCanvasState(), animationStartedAt + seconds * 1000); return previewCanvas.toDataURL(); } };\n    return initialPreviewReady;'));
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
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('https://**/*', route => route.abort());
        const url = 'http://127.0.0.1:' + server.address().port;
        await page.goto(url);
        await page.waitForFunction(() => window.animationTest && !document.getElementById('sd-loader'));
        assert.equal(await page.locator('#one-direction-checkbox').isVisible(), false);
        await page.evaluate(() => { document.getElementById('animate-checkbox').checked = true; animationTest.updateShape(); });
        assert.equal(await page.locator('#one-direction-checkbox').isVisible(), true);
        const legacy = await page.evaluate(() => animationTest.generateCssExportCode());
        assert.match(legacy, /infinite alternate/);
        assert.doesNotMatch(legacy, /::after/);
        await page.locator('#one-direction-checkbox').check();
        const output = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
        // Compare actual browser transforms and opacity against the canvas model
        // over two loops, including resets, for every edge and both aspect modes.
        for (const ratio of [false, true]) for (const direction of ['top', 'bottom', 'left', 'right']) {
            const data = await page.evaluate(({ ratio, direction }) => {
                const a = animationTest;
                document.getElementById('divider-direction-' + direction).checked = true;
                document.getElementById('animation_length').value = 4;
                a.updateShape();
                const sample = a.getSvgExportStates()[0];
                return { code: a.buildPairedExportCode('css'), state: sample };
            }, { ratio, direction });
            if (data.state.ratio !== ratio) {
                await page.goto(url + '/?dividerDirection=' + direction + '&si=' + (ratio ? 1 : 0) + '&animate=true&oneDirection=true&animLength=4&animLongAxis=4');
                await page.waitForFunction(() => window.animationTest && !document.getElementById('sd-loader'));
                data.code = await page.evaluate(() => animationTest.buildPairedExportCode('css'));
                data.state = await page.evaluate(() => animationTest.getSvgExportStates()[0]);
            }
            const className = data.code.match(/^\.([^\s{]+)/)[1];
            await output.setContent('<style>body{margin:0}#host{width:800px;height:400px}' + data.code + '</style><div id="host" class="' + className + '"></div>');
            const samples = await output.evaluate(({ horizontal }) => {
                const host = document.getElementById('host');
                const animations = document.getAnimations();
                animations.forEach(a => a.pause());
                const results = [];
                for (let ms = 0; ms <= 16000; ms += 50) {
                    animations.forEach(a => { a.currentTime = ms; });
                    for (let copy = 0; copy < 2; copy++) {
                        const style = getComputedStyle(host, copy ? '::after' : '::before');
                        if (style.backgroundImage === 'none') throw new Error('Exported SVG background must be valid CSS.');
                        const matrix = new DOMMatrix(style.transform);
                        const size = parseFloat(horizontal ? style.width : style.height);
                        const origin = parseFloat(style.transformOrigin.split(' ')[horizontal ? 0 : 1]);
                        const scale = horizontal ? matrix.a : matrix.d;
                        const offset = (horizontal ? matrix.e : matrix.f) + origin * (1 - scale);
                        results.push({ ms, copy, opacity: +style.opacity, offset, end: offset + size * scale });
                    }
                }
                return results;
            }, { horizontal: direction === 'top' || direction === 'bottom' });
            const expected = await page.evaluate(samples => samples.map(s => animationTest.getOneDirectionFrame(animationTest.getSvgExportStates()[0], s.ms / 1000, s.copy)), samples);
            const extent = ['top', 'bottom'].includes(direction) ? 800 : 400;
            samples.forEach((sample, i) => {
                assert.ok(sample.offset < 0 && sample.end > extent, JSON.stringify({ direction, ratio, sample }));
                assert.ok(Math.abs(sample.opacity - expected[i].opacity) < 0.001);
                assert.ok(Math.abs(sample.offset + extent * 3 * (1 - expected[i].progress)) < 0.02);
            });
        }
        // Inherit all animation options when enabling responsive settings.
        await page.evaluate(() => { const e = document.getElementById('mobile-ready'); e.checked = true; e.dispatchEvent(new Event('change', { bubbles: true })); });
        assert.equal(await page.locator('#tablet-one-direction-checkbox').isChecked(), true);
        assert.equal(await page.locator('#mobile-one-direction-checkbox').isChecked(), true);
        await page.evaluate(() => {
            document.getElementById('tablet-one-direction-checkbox').checked = false;
            document.getElementById('mobile-animate-checkbox').checked = false;
            animationTest.updateShape();
        });
        const share = await page.evaluate(() => animationTest.buildShareUrl());
        await page.goto(url + share);
        await page.waitForFunction(() => window.animationTest && !document.getElementById('sd-loader'));
        assert.equal(await page.locator('#one-direction-checkbox').isChecked(), true);
        assert.equal(await page.locator('#tablet-one-direction-checkbox').isChecked(), false);
        assert.equal(await page.locator('#mobile-animate-checkbox').isChecked(), false);
        for (const format of ['css', 'svg', 'mask']) {
            const code = await page.evaluate(format => animationTest.buildPairedExportCode(format), format);
            const className = format === 'css' ? code.match(/^\.([^\s{]+)/)[1] : code.match(/<div class="([^"]+)"/)[1];
            await output.setContent(format === 'css'
                ? '<style>' + code + '</style><div class="' + className + '" style="width:800px;height:400px"></div>' : code);
            for (const [width, mode] of [[500, 'static'], [800, 'alternate'], [1440, 'one-direction']]) {
                await output.setViewportSize({ width, height: 800 });
                const actual = await output.evaluate(({ className, format }) => {
                    const host = document.querySelector('.' + className);
                    const styles = format === 'css' ? [getComputedStyle(host, '::before'), getComputedStyle(host, '::after')]
                        : [...host.children].filter(e => getComputedStyle(e).display !== 'none').flatMap(e => [...e.children].map(c => getComputedStyle(c)));
                    return styles.map(s => ({ display: s.display, direction: s.animationDirection, name: s.animationName }));
                }, { className, format });
                assert.equal(actual.length, 2, JSON.stringify({ format, width, actual }));
                assert.equal(actual[1].display === 'none', mode !== 'one-direction');
                if (mode === 'alternate') assert.equal(actual[0].direction, 'alternate');
                if (mode === 'static') assert.equal(actual[0].name, 'none');
                if (mode === 'one-direction') assert.match(actual[0].name, /one-direction/);
            }
        }
        const timingChecks = await page.evaluate(() => {
            const failures = [];
            for (const animationLength of [4, 10, 200]) for (const animationLongAxis of [1.1, 4, 10]) {
                const state = { animationLength, animationLongAxis };
                for (let i = 0; i <= 1000; i++) {
                    const a = animationTest.getOneDirectionFrame(state, i * 2 * animationLength / 1000, 0);
                    const b = animationTest.getOneDirectionFrame(state, i * 2 * animationLength / 1000, 1);
                    if (Math.abs(a.opacity + b.opacity - 1) > 1e-9 || a.progress < 0.02 || a.progress > 0.98) failures.push({ state, a, b });
                }
            }
            return failures;
        });
        assert.deepEqual(timingChecks, [], 'Crossfades must be complementary and stay inside safe travel limits at every speed/scale.');
        // Independently assert the user-facing duration, not just agreement
        // between the two implementations: 10s means one handoff every 10s.
        const cadence = await page.evaluate(() => {
            document.getElementById('animation_length').value = 10;
            animationTest.updateShape();
            const state = animationTest.getSvgExportStates()[0];
            return {
                code: animationTest.buildPairedExportCode('css'),
                samples: [0, 8.9, 9, 9.5, 10, 18.9, 19, 19.5, 20].map(time =>
                    [0, 1].map(copy => animationTest.getOneDirectionFrame(state, time, copy).opacity))
            };
        });
        const opacityPairs = [[1, 0], [1, 0], [1, 0], [0.5, 0.5], [0, 1], [0, 1], [0, 1], [0.5, 0.5], [1, 0]];
        cadence.samples.forEach((pair, i) => pair.forEach((opacity, copy) =>
            assert.ok(Math.abs(opacity - opacityPairs[i][copy]) < 1e-9, '10s handoff cadence must match the selected duration')));
        assert.match(cadence.code, /20s linear -1s infinite/);
        assert.match(cadence.code, /20s linear -11s infinite/);
        assert.match(cadence.code, /5%\{opacity:1;/);
        assert.match(cadence.code, /55(?:\.0+)?%\{transform:/);
        // Test the mirror strategy independently of the fade strategy. Pixel
        // snapshots must repeat exactly after a pair, with alpha buildup confined
        // to the requested one-pixel seam overlap.
        await output.setViewportSize({ width: 1440, height: 800 });
        for (const scale of [1, 1.3]) for (const shape of [0, 1, 2, 3]) for (const direction of ['top', 'bottom', 'left', 'right']) {
            await page.goto(url + '/?dividerDirection=' + direction + '&si=' + shape + '&animate=true&oneDirection=true&mirrorLoop=true&animLength=10&animLongAxis=' + scale);
            await page.waitForFunction(() => window.animationTest && !document.getElementById('sd-loader'));
            const data = await page.evaluate(() => {
                const css = animationTest.buildPairedExportCode('css');
                const svg = animationTest.buildPairedExportCode('svg');
                const mask = animationTest.buildPairedExportCode('mask');
                return { css, svg, mask, files: animationTest.getMaskFiles(), share: animationTest.buildShareUrl(), canvas: [0, 20, 40].map(animationTest.drawAt) };
            });
            assert.equal(data.canvas[0], data.canvas[1], 'Canvas must repeat exactly after 20s.');
            assert.equal(data.canvas[0], data.canvas[2], 'Canvas must repeat exactly after 40s.');
            assert.match(data.share, /mirrorLoop=true/);
            assert.doesNotMatch(data.css, /opacity:0|alternate/);
            assert.match(data.css, /background-size:calc\([^;]+% - 2px\)|background-size:100% calc\([^;]+% - 2px\)/, 'Pair size must include both 1px join adjustments.');
            assert.match(data.css, /translate[XY]\(calc\(-[^)]+% \+ 2px\)\)/, 'Animation travel must match the shorter pair period.');
            for (const format of ['css', 'svg', 'mask']) {
                let code = data[format];
                if (format === 'mask') data.files.forEach(file => { code = code.replaceAll(file.fileName, 'data:image/svg+xml,' + encodeURIComponent(file.svg)); });
                const className = format === 'css' ? code.match(/^\.([^\s{]+)/)[1] : code.match(/<div class="([^"]+)"/)[1];
                await output.setContent('<style>html,body{margin:0;background:transparent}#host{position:relative;width:800px;height:400px}</style>' + (format === 'css'
                    ? '<style>' + code + '</style><div id="host" class="' + className + '"></div>'
                    : '<div id="host">' + code + '</div>'));
                const capture = async (ms) => {
                    await output.evaluate(ms => document.getAnimations().forEach(a => { a.pause(); a.currentTime = ms; }), ms);
                    return output.locator('#host').screenshot({ omitBackground: true, animations: 'allow' });
                };
                const start = await capture(0);
                assert.deepEqual(await capture(20000), start, format + ' must repeat exactly at the loop reset.');
                const middle = await capture(5000);
                if (process.env.MIRROR_SCREENSHOT_PATH && scale === 1 && shape === 0 && direction === 'top' && format === 'css') {
                    await output.evaluate(() => { document.body.style.background = 'white'; });
                    fs.writeFileSync(process.env.MIRROR_SCREENSHOT_PATH, await capture(5000));
                    await output.evaluate(() => { document.body.style.background = 'transparent'; });
                }
                const pixels = await output.evaluate(async encoded => {
                    const image = new Image(); image.src = 'data:image/png;base64,' + encoded; await image.decode();
                    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
                    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
                    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
                    let maxAlpha = 0;
                    const columns = Array(canvas.width).fill(0), rows = Array(canvas.height).fill(0);
                    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
                        const alpha = pixels[(y * canvas.width + x) * 4 + 3];
                        maxAlpha = Math.max(maxAlpha, alpha); columns[x] = Math.max(columns[x], alpha); rows[y] = Math.max(rows[y], alpha);
                    }
                    return { maxAlpha, columns, rows };
                }, middle.toString('base64'));
                assert.ok(pixels.maxAlpha > 0, format + ' must render visible shape pixels.');
                if (shape >= 2) assert.ok(pixels.maxAlpha <= 192, format + ' must limit alpha buildup to the requested 1px overlap.');
                const axis = ['top', 'bottom'].includes(direction) ? pixels.columns : pixels.rows;
                if (shape >= 2) assert.ok(axis.filter(alpha => alpha > 128).length <= 3, format + ' must confine alpha buildup to the 1px overlap and its antialiased edges.');
                const seam = Math.round(axis.length * scale / 2 - 1);
                assert.ok(axis[seam - 1] >= (shape >= 2 ? 127 : 254) && axis[seam] >= (shape >= 2 ? 127 : 254), JSON.stringify({ format, shape, scale, direction, seam, alpha: axis.slice(seam - 3, seam + 4) }));
            }
        }
        await page.evaluate(() => {
            const responsive = document.getElementById('mobile-ready');
            responsive.checked = true; responsive.dispatchEvent(new Event('change', { bubbles: true }));
        });
        assert.equal(await page.locator('#tablet-mirror-loop-checkbox').isChecked(), true);
        assert.equal(await page.locator('#mobile-mirror-loop-checkbox').isChecked(), true);
        await page.evaluate(() => {
            document.getElementById('tablet-mirror-loop-checkbox').checked = false;
            document.getElementById('mobile-one-direction-checkbox').checked = false;
            document.getElementById('gradient-checkbox').checked = true;
            ['', 'tablet-', 'mobile-'].forEach(prefix => { document.getElementById(prefix + 'animation_long_axis').value = 2; });
            animationTest.updateShape();
        });
        const mirrorShare = await page.evaluate(() => animationTest.buildShareUrl());
        await page.goto(url + mirrorShare);
        await page.waitForFunction(() => window.animationTest && !document.getElementById('sd-loader'));
        assert.equal(await page.locator('#mirror-loop-checkbox').isChecked(), true);
        assert.equal(await page.locator('#tablet-mirror-loop-checkbox').isChecked(), false);
        for (const format of ['css', 'svg', 'mask']) {
            const code = await page.evaluate(format => animationTest.buildPairedExportCode(format), format);
            const className = format === 'css' ? code.match(/^\.([^\s{]+)/)[1] : code.match(/<div class="([^"]+)"/)[1];
            await output.setContent(format === 'css' ? '<style>' + code + '</style><div class="' + className + '" style="width:800px;height:400px"></div>' : code);
            for (const [width, mode] of [[500, 'alternate'], [800, 'one-direction'], [1440, 'mirror-loop']]) {
                await output.setViewportSize({ width, height: 800 });
                const actual = await output.evaluate(({ className, format }) => {
                    const host = document.querySelector('.' + className);
                    const element = format === 'css' ? host : [...host.children].find(e => getComputedStyle(e).display !== 'none').firstElementChild;
                    const style = getComputedStyle(element, format === 'css' ? '::before' : null);
                    return { name: style.animationName, direction: style.animationDirection };
                }, { className, format });
                if (mode === 'alternate') assert.equal(actual.direction, 'alternate');
                else assert.ok(actual.name.endsWith(mode), JSON.stringify({ format, width, mode, actual }));
            }
            if (format === 'svg') {
                const duplicateIds = await output.evaluate(() => {
                    const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
                    return ids.length - new Set(ids).size;
                });
                assert.equal(duplicateIds, 0, 'Mirrored SVG gradients must have unique IDs.');
            }
        }
        await page.locator('#mirror-loop-checkbox').uncheck();
        const stationary = await page.evaluate(() => {
            document.getElementById('animation_long_axis').value = 1;
            animationTest.updateShape();
            const state = animationTest.getSvgExportStates()[0];
            return { frames: [0, 1].map(copy => animationTest.getOneDirectionFrame(state, 3.9, copy)), code: animationTest.buildPairedExportCode('css') };
        });
        assert.deepEqual(stationary.frames.map(f => f.opacity), [1, 0]);
        assert.deepEqual(errors, []);
        if (process.env.SCREENSHOT_PATH) await page.screenshot({ path: process.env.SCREENSHOT_PATH });
        console.log('PASS: CSS/canvas fade parity, exact 10s cadence; mirror pixels repeat exactly across two loops for all edges, aspect modes, opaque/translucent shapes, and all exports; preserved alpha, joined edges, gradient IDs, mixed responsive modes, URL restoration, and legacy animation.');
    } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
