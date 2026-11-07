// Pure generation tests: no browser, network or runtime animation JavaScript.
// Run: node shapedividers/tests/animation-layers.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const app = fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
function fn(name) {
    const start = app.indexOf('function '+name+'(');
    assert.ok(start >= 0,name);
    const end = app.indexOf('\n}',start)+2;
    return app.slice(start,end);
}
const recipeStart = app.indexOf('const SD_MOTION_IMAGES');
const recipeEnd = app.indexOf('\nfunction initShapeDividersApp',recipeStart);
const fields = app.slice(app.indexOf('const motionFields'),app.indexOf('function motionControlId'));
const fixture = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 200" preserveAspectRatio="none"><defs><clipPath id="native"><rect width="1000" height="200"/></clipPath></defs><g clip-path="url(#native)"><path fill="#000" opacity=".5" d="M0 200V80Q250 0 500 80T1000 80V200Z"/></g></svg>';
// Only parse the known source fixture. Browser DOMParser handles real artwork;
// Python's XML parser below independently validates every complete generated SVG.
class SourceParser {
    parseFromString(text) {
        const attrs = text.match(/^<svg\b([^>]*)>/)[1];
        return {documentElement:{getAttribute(name){return attrs.match(new RegExp(name+'="([^"]+)"'))?.[1] || null;},innerHTML:text.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'')}};
    }
}
const sandbox = {DOMParser:SourceParser,svgDividers:[{bottom:fixture,top:fixture,left:fixture,right:fixture}],console};
vm.createContext(sandbox);
vm.runInContext(app.slice(recipeStart,recipeEnd)+'\n'+fields+'\n'+[
    'getSvgViewBoxMetrics','normalizeSvgForCanvas','replaceSvgColorsWithPaint','replaceInlineSvgColorsWithCurrentColor',
    'namespaceInlineSvgIds','getMotionSparkParticles','buildMotionSparksSvg','getMotionSparksLayout','buildMotionSvg','hasMotionEffects','getMotionLayout',
    'getSvgStateDeclarations','formatDeclarationRule','addClassToInlineSvg',
    'buildMotionExportCode','getPairedStateCss','getMirroredStateCss','getOneDirectionTiming','getOneDirectionFrame','getDepthLayers'
].map(fn).join('\n')+'\nthis.recipes=SD_MOTION_RECIPES;this.defaults=motionFields;',sandbox);
const defaults = sandbox.defaults;
assert.equal(Object.keys(sandbox.recipes).length,15);
const state = {key:'desktop',shapeIndex:0,direction:'bottom',color:'ffffff',gradientColor:'f5c4ff',longAxis:100,shortAxis:140,position:50,animate:true,animationLength:10,animationLongAxis:4,ratio:false};
const outputs = [];
let cases = 0;
for (const key of Object.keys(sandbox.recipes)) for(const intensity of ['0','1','2']) for(const direction of ['bottom','top','left','right']) for(const gradient of [false,true]) {
    const e = {...defaults,motion:'none',intensity,lightColor:'#12ab34',ribbonA:'#123456',ribbonB:'#654321',ribbonC:'#abcdef',sparkColor:'#eeddcc'};
    if (sandbox.recipes[key] && ['moving-light','variation-light-moon'].includes(key)) e.light = key;
    else if (key === 'creative-iridescent') e.ribbon = true;
    else if (key === 'creative-sparks') e.sparks = true;
    else if (['contour-pulse','variation-contour-double','molten-edge','creative-echo'].includes(key)) e.edge = key;
    else e.motion = key;
    const s = {...state,direction,gradient,effects:e};
    const svg = sandbox.buildMotionSvg(s,'test-'+cases++);
    assert.doesNotMatch(svg,/@(?:ID|USE|IMAGE\d+)@|<script\b|onload=/);
    assert.match(svg,/opacity=".5"/,'Source opacity must survive');
    const geometry = !['none','scroll'].includes(e.motion) || e.edge !== 'none';
    if(geometry) {
        assert.match(svg,/y1="288" x2="0" y2="296"/,'Blend must finish before the fixed 7.5% foot');
        assert.match(svg,/mix-blend-mode:plus-lighter/,'Complementary alpha must add without darkening translucent shapes');
    } else {
        assert.match(svg,/^<svg[^>]+viewBox="0 0 1000 200" preserveAspectRatio="none"/,'Surface effects retain the native viewport');
        assert.doesNotMatch(svg,/y="32" width="1200" height="288"/,'Surface effects must not add headroom');
    }
    assert.doesNotMatch(svg,/<clipPath id="[^"]+-(?:upper|foot)"/,'No touching antialiased clip edges');
    assert.match(svg,/fill="#ffffff"|fill="url\(#[^)]+-paint\)"/,'A base color matching a preset must not be recolored');
    if(e.light !== 'none') assert.match(svg,/lighting-color="#12ab34"/);
    if(e.ribbon) for(const color of [e.ribbonA,e.ribbonB,e.ribbonC]) assert.ok(svg.includes(color));
    if(e.sparks) {
        const sparks = sandbox.buildMotionSparksSvg(s,'sparks-'+cases);
        assert.ok(sparks.includes(e.sparkColor));
        assert.match(sparks,/75%,100%\{opacity:0\}/);
        assert.equal((sparks.match(/vector-effect="non-scaling-stroke"/g)||[]).length,[36,52,72][Number(intensity)]);
        outputs.push(sparks);
    }
    if(gradient) assert.match(svg,/-paint" x1="0" y1="1" x2="0" y2="0"/,'Canonical bottom gradient starts at the section join, matching the static gradient');
    assert.equal(/id="[^"]+-paint"/.test(svg),gradient,'Only emit a paint gradient when enabled');
    const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
    assert.equal(new Set(ids).size,ids.length,'IDs must be unique');
    for(const ref of svg.matchAll(/(?:href="#|url\(#)([^"\)]+)["\)]/g)) assert.ok(ids.includes(ref[1]),'Unresolved reference '+ref[1]);
    outputs.push(svg);
}
// Each native orientation and aspect-ratio policy must survive surface effects,
// including wide slice artwork, nonzero viewBox origins and original alpha.
for(const direction of ['bottom','top','left','right']) for(const preserve of ['none','xMidYMin slice','xMaxYMid slice','xMidYMid meet']) {
    const native=fixture.replace('0 0 1000 200','-40 -70 7000 420').replace('preserveAspectRatio="none"','preserveAspectRatio="'+preserve+'"');
    sandbox.svgDividers[0][direction]=native;
    for(const surface of [{light:'moving-light'},{light:'variation-light-moon'},{ribbon:true},{sparks:true}]) {
        const svg=sandbox.buildMotionSvg({...state,direction,oneDirection:true,depthLayers:true,effects:{...defaults,...surface}},'native');
        assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-40 -70 7000 420" preserveAspectRatio="'+preserve+'"'));
        assert.match(svg,/opacity=".5"/);
        assert.doesNotMatch(svg,/y="32"|height="288"/);
        assert.ok(svg.includes('translate(-40 -70) scale('));
        outputs.push(svg);
    }
    sandbox.svgDividers[0][direction]=fixture;
}
// Combined passes reference prior passes, retaining one copy of path geometry.
const combined = {...state,gradient:true,effects:{...defaults,motion:'swell-map',edge:'creative-echo',light:'variation-light-moon',ribbon:true,sparks:true}};
const stacked = sandbox.buildMotionSvg(combined,'stack');
assert.equal((stacked.match(/<path\b/g)||[]).length,1);
assert.equal((stacked.match(/<symbol\b/g)||[]).length,1);
assert.match(stacked,/mix-blend-mode:plus-lighter/);
assert.match(stacked,/cubic-bezier/);
assert.match(stacked,/@media\(prefers-reduced-motion:reduce\)/);
outputs.push(stacked);
const slow = sandbox.buildMotionSvg({...combined,animationLength:20},'slow');
assert.match(slow,/dur="20s"/);
assert.match(sandbox.buildMotionSparksSvg({...combined,animationLength:20},'slow-sparks'),/--flight:9.4s/,'Spark speed follows duration');
assert.match(slow,/23.8s/,'Echo speed follows duration');
assert.equal(sandbox.hasMotionEffects({...state,animate:false,effects:combined.effects}),false);
// Particle geometry and viewport coverage must be independent of both long-axis
// controls, position, scrolling transforms and the source shape's aspect ratio.
for(const direction of ['bottom','top','left','right']) {
    const base={...combined,direction};
    const large={...base,longAxis:400,animationLongAxis:10,position:12,ratio:true};
    assert.equal(sandbox.buildMotionSparksSvg(base,'same-sparks'),sandbox.buildMotionSparksSvg(large,'same-sparks'));
    assert.equal(JSON.stringify(sandbox.getMotionSparksLayout(base,'sparks')),JSON.stringify(sandbox.getMotionSparksLayout(large,'sparks')));
    const layout=sandbox.getMotionSparksLayout(large,'sparks');
    assert.equal(layout.declarations[direction==='bottom'||direction==='top'?'width':'height'],'100%');
    assert.equal(layout.declarations.transform,'none');assert.equal(layout.declarations.animation,'none');
}
assert.equal(sandbox.buildMotionSparksSvg({...combined,animate:false},'disabled'),'');
// Exercise full responsive SVG and inline-mask packaging with a mixed static state.
sandbox.getSvgExportStates=()=>[combined,{...state,key:'tablet',animate:false,effects:defaults},{...state,key:'mobile',effects:{...defaults,motion:'css-rock'}}];
sandbox.mobileReady=true;sandbox.shapeCSSName='shape-test';
sandbox.getPlainExportSvg=()=>fixture;
const svgCode = sandbox.buildMotionExportCode('svg');
assert.match(svgCode,/> :not\(\.shape-test-svg-desktop\)\{display:none\}/,'Desktop must hide the tablet selection with equal CSS specificity');
assert.match(svgCode,/@media\(min-width:768px\)/);assert.match(svgCode,/@media\(min-width:1025px\)/);
assert.doesNotMatch(svgCode,/<script\b|@ID@/);
const maskCode = sandbox.buildMotionExportCode('mask');
assert.match(maskCode,/maskUnits="userSpaceOnUse"/);assert.doesNotMatch(maskCode,/mask-image/);
// The mask's outer paint follows exactly the same color order as static SVGs.
sandbox.mobileReady=false;
for(const [direction,vector] of Object.entries({bottom:'x1="0" y1="1" x2="0" y2="0"',top:'x1="0" y1="0" x2="0" y2="1"',left:'x1="0" y1="0" x2="1" y2="0"',right:'x1="1" y1="0" x2="0" y2="0"'})) {
    sandbox.getSvgExportStates=()=>[{...state,direction,gradient:true,effects:{...defaults,motion:'css-rock'}}];
    assert.ok(sandbox.buildMotionExportCode('mask').includes('-mask-paint" '+vector+'>'));
}
// Surface effects must keep the paired animation geometry and depth timings.
const litLoop={...state,oneDirection:true,mirrorLoop:false,effects:{...defaults,light:'variation-light-moon',ribbon:true,sparks:true}};
assert.match(sandbox.getPairedStateCss(litLoop,'lit',0).keyframes,/one-direction/);
assert.match(sandbox.getPairedStateCss({...litLoop,mirrorLoop:true},'lit',0).keyframes,/mirror/);
for(const layer of sandbox.getDepthLayers({...litLoop,oneDirection:false,depthLayers:true})) {
    const css=sandbox.getPairedStateCss(layer.state,'lit',0);
    assert.ok(css.declarations.animation.startsWith(layer.state.animationLength+'s infinite alternate'));
}
const local=sandbox.getPairedStateCss({...state,effects:{...defaults,motion:'css-rock'}},'local',0);
assert.equal(local.declarations.animation,'none','A responsive local-motion viewport must not acquire Scrolling');
// Full loop/depth exports delegate to the common paired renderer without
// dropping effects, instead of silently using an ordinary alternating loop.
let pairedCalls=0;
sandbox.buildPairedExportCode=format=>{assert.equal(format,'svg');pairedCalls++;return 'paired-with-effects';};
sandbox.getSvgExportStates=()=>[litLoop];
assert.equal(sandbox.buildMotionExportCode('svg'),'paired-with-effects');
sandbox.getSvgExportStates=()=>[{...litLoop,oneDirection:false,depthLayers:true}];
assert.equal(sandbox.buildMotionExportCode('svg'),'paired-with-effects');
assert.equal(pairedCalls,2);
// Legacy handoffs keep at least one fully visible shape during every fade.
for(let t=0;t<40;t+=.1) {
    const frames = [0,1].map(copy=>sandbox.getOneDirectionFrame(state,t,copy));
    assert.equal(Math.max(...frames.map(f=>f.opacity)),1);
}
assert.equal(JSON.stringify(sandbox.getDepthLayers({...state,depthLayers:true}).map(l=>l.state.animationLength)),JSON.stringify([19,14,10]));
if (process.env.SD_MOTION_REVIEW_DIR) {
    fs.mkdirSync(process.env.SD_MOTION_REVIEW_DIR,{recursive:true});
    const frame = code => '<!doctype html><style>body{margin:0;background:#173b50}.host{position:relative;width:100vw;height:320px;margin-top:40px;background:#222}</style><div class="host">'+code+'</div>';
    fs.writeFileSync(path.join(process.env.SD_MOTION_REVIEW_DIR,'svg.html'),frame(svgCode));
    fs.writeFileSync(path.join(process.env.SD_MOTION_REVIEW_DIR,'mask.html'),frame(maskCode));
}
const check = spawnSync('python3',['-c','import sys,json,xml.etree.ElementTree as E\nfor s in json.load(sys.stdin): E.fromstring(s)'],{input:JSON.stringify(outputs),encoding:'utf8',maxBuffer:1024*1024});
assert.equal(check.status,0,check.stderr);
console.log('Passed '+cases+' SVG recipe/intensity/direction/gradient cases, stacked colors, shared geometry, timing, reduced motion, and responsive SVG/mask packaging.');
