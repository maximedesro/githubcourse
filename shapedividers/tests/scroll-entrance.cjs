// Run with Playwright installed: node shapedividers/tests/scroll-entrance.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const shape = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200"><path fill="#000" d="M0 0H800V130Q600 20 400 130T0 130Z"/></svg>';
const fixtures = [{ si: 0, ratio: 'FALSE', category: 'Test', top: shape, bottom: shape, left: shape, right: shape }];
const creator = fs.readFileSync(path.join(root, 'purehtml.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8').replace('    return initialPreviewReady;',
    '    window.entranceTest = { generateCssExportCode, buildSvgExportCode, buildMaskExportCode };\n    return initialPreviewReady;');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

const server = http.createServer((req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname === '/app.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript' }).end(app);
    } else if (pathname === '/styles.css') {
        res.writeHead(200, { 'Content-Type': 'text/css' }).end(css);
    } else if (pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' }).end(
            '<!doctype html><link rel="stylesheet" href="/styles.css"><body id="github-html">' +
            creator + '<script>const isPremium=true;const svgDividers=' + JSON.stringify(fixtures) +
            ';</script><script src="/app.js"></script>'
        );
    } else {
        res.writeHead(404).end();
    }
});

async function scalesAt(page, selector, pseudo, positions) {
    return page.evaluate(async ({ selector, pseudo, positions }) => {
        const target = document.querySelector(selector);
        const samples = [];
        for (const position of positions) {
            window.scrollTo(0, position);
            for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame);
            const style = getComputedStyle(target, pseudo);
            samples.push({ scale: style.scale, animation: style.animationName, transform: style.transform });
        }
        return samples;
    }, { selector, pseudo, positions });
}

(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    try {
        browser = await chromium.launch({
            executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        });
        const page = await browser.newPage({ viewport: { width: 1440, height: 800 } });
        const output = await browser.newPage({ viewport: { width: 1440, height: 800 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('https://**/*', route => route.abort());
        const url = 'http://127.0.0.1:' + server.address().port;

        await page.goto(url);
        await page.waitForFunction(() => window.entranceTest && !document.getElementById('sd-loader'));
        const checkbox = page.getByRole('checkbox', { name: 'Enable Scroll Based Entrance Animation' });
        const settings = page.locator('#entrance-settings');
        const start = settings.getByLabel('Start of entrance (%)');
        assert.equal(await checkbox.isVisible(), false);
        await page.locator('#animate-checkbox').evaluate(input => input.click());
        assert.equal(await checkbox.isVisible(), true);
        assert.equal(await start.isVisible(), false);
        await checkbox.evaluate(input => input.click());
        assert.equal(await start.isVisible(), true);
        assert.equal(await page.locator('.sd-entrance-spacer').evaluate(el => el.offsetHeight), 800);
        assert.equal(await page.locator('.sd-entrance-spacer').textContent(), 'You can now scroll up and down to test.');

        const overlayOffsets = await page.locator('.tool-stage').evaluate(stage => {
            const top = stage.getBoundingClientRect().top;
            return ['.container', '.hover-here-hint'].map(selector =>
                stage.querySelector(selector).getBoundingClientRect().top - top);
        });
        assert.ok(overlayOffsets.every(offset => offset >= 0 && offset < 800));

        const bottom = await page.locator('.image_div').evaluate(el => el.getBoundingClientRect().bottom + scrollY);
        const positions = [bottom - 940, bottom - 870, bottom - 800, bottom - 870];
        const finish = settings.getByLabel('Full size at (%)');
        assert.equal(await finish.inputValue(), '200');
        const firstFullyInView = bottom - 800;
        const preview = await scalesAt(page, '.shape-divider-canvas', null,
            [firstFullyInView - 140, firstFullyInView, firstFullyInView + 30,
                firstFullyInView + 200, firstFullyInView + 30]);
        assert.deepEqual(preview.map(sample => sample.scale), ['1 0', '1 0.411765', '1 0.5', '1', '1 0.5']);

        await finish.fill('400');
        const extended = await scalesAt(page, '.shape-divider-canvas', null,
            [firstFullyInView + 230, firstFullyInView + 600]);
        assert.deepEqual(extended.map(sample => sample.scale), ['1 0.5', '1']);

        await settings.getByLabel('Starting scale (%)').fill('20');
        await start.fill('25');
        await finish.fill('75');
        await settings.getByLabel('Scale origin').selectOption('center');
        const adjusted = await scalesAt(page, '.shape-divider-canvas', null, positions);
        assert.deepEqual(adjusted.map(sample => sample.scale), ['1 0.2', '1 0.6', '1', '1 0.6']);

        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(await page.locator('.sd-entrance-spacer').isVisible(), false);
        assert.equal((await scalesAt(page, '.shape-divider-canvas', null, [0]))[0].scale, 'none');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await checkbox.evaluate(input => input.click());
        assert.equal(await page.locator('.sd-entrance-spacer').isVisible(), false);

        const directions = {
            top: { positions: [0, 70, 140, 70], expected: ['1 0', '1 0.5', '1', '1 0.5'] },
            bottom: { positions: [260, 330, 400, 330], expected: ['1 0', '1 0.5', '1', '1 0.5'] },
            left: { positions: [0, 200, 400, 200], expected: ['0 1', '0.5 1', '1', '0.5 1'] },
            right: { positions: [0, 200, 400, 200], expected: ['0 1', '0.5 1', '1', '0.5 1'] }
        };
        const base = '<style>body{margin:0}.spacer{height:800px}#host{position:relative;height:400px}</style><div class="spacer"></div>';
        for (const [direction, { positions: steps, expected }] of Object.entries(directions)) {
            await page.goto(url + '?animate=true&scrollEntrance=true&entranceEnd=100&dividerDirection=' + direction);
            await page.waitForFunction(() => window.entranceTest && !document.getElementById('sd-loader'));
            const exports = await page.evaluate(() => {
                const css = entranceTest.generateCssExportCode();
                return { css, svg: entranceTest.buildSvgExportCode(), mask: entranceTest.buildMaskExportCode() };
            });
            for (const [format, code] of Object.entries(exports)) {
                assert.match(code, /@supports \(view-timeline-name: --entrance\) \{/);
                const cssOnly = format === 'css';
                const name = code.match(cssOnly ? /\.([\w-]+)\{/ : /<div class="([^"]+)"/)[1];
                const markup = cssOnly
                    ? '<style>' + code + '</style><div id="host" class="' + name + '"></div>'
                    : '<div id="host">' + code + '</div>';
                await output.setContent(base + markup + '<div class="spacer"></div>');
                const samples = await scalesAt(output, '.' + name, cssOnly ? '::before' : null, steps);
                assert.deepEqual(samples.map(sample => sample.scale), expected, format + ' ' + direction);
                if (cssOnly) {
                    assert.equal(samples[0].animation.split(', ').length, 2);
                    assert.notEqual(samples[0].transform, 'none');
                }
            }
        }
        // CSS-only paired loops keep both animations on each of their copies.
        await page.goto(url + '?animate=true&scrollEntrance=true&entranceEnd=100&dividerDirection=top&oneDirection=true');
        await page.waitForFunction(() => window.entranceTest && !document.getElementById('sd-loader'));
        const paired = await page.evaluate(() => entranceTest.generateCssExportCode());
        const pairedName = paired.match(/\.([\w-]+)\s*\{/)[1];
        await output.setContent(base + '<style>' + paired + '</style><div id="host" class="' + pairedName +
            '"></div><div class="spacer"></div>');
        for (const pseudo of ['::before', '::after']) {
            const samples = await scalesAt(output, '.' + pairedName, pseudo, [0, 70, 140, 70]);
            assert.deepEqual(samples.map(sample => sample.scale), directions.top.expected);
            assert.equal(samples[1].animation.split(', ').length, 2);
        }

        // Force the feature query to fail and verify the original loop remains.
        const fallback = paired.replaceAll('(view-timeline-name: --entrance)', '(unsupported-entrance-test: true)');
        await output.setContent(base + '<style>' + fallback + '</style><div id="host" class="' + pairedName +
            '"></div><div class="spacer"></div>');
        const [fallbackSample] = await scalesAt(output, '.' + pairedName, '::before', [70]);
        assert.equal(fallbackSample.scale, 'none');
        assert.equal(fallbackSample.animation.split(', ').length, 1);
        assert.notEqual(fallbackSample.transform, 'none');

        // An SVG effect on desktop can coexist with a tablet-only entrance.
        await page.goto(url + '?mobileReady=true&responsiveConfigured=true&animate=true&effects=' +
            encodeURIComponent(JSON.stringify({ motion: 'css-rock' })) +
            '&tabletAnimate=true&tabletDividerDirection=right&tabletScrollEntrance=true');
        await page.waitForFunction(() => window.entranceTest && !document.getElementById('sd-loader'));
        const responsive = await page.evaluate(() => entranceTest.buildSvgExportCode());
        const responsiveName = responsive.match(/<div class="([^"]+)"/)[1];
        await output.setContent(base + '<div id="host">' + responsive + '</div><div class="spacer"></div>');
        const selector = '.' + responsiveName;
        assert.equal((await scalesAt(output, selector, null, [200]))[0].scale, 'none');
        await output.setViewportSize({ width: 900, height: 800 });
        const tablet = await scalesAt(output, selector, null, [0, 300, 600, 300]);
        assert.deepEqual(tablet.map(sample => sample.scale), directions.right.expected);

        assert.deepEqual(errors, []);
        console.log('Passed scroll entrance controls, preview, reduced motion, reversal, and CSS/SVG/mask export checks.');
    } finally {
        await browser?.close();
        server.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
