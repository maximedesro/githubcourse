// Run: node shapedividers/tests/animation-urls.cjs
// Exercise URL persistence without browser automation or a shape library fetch.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const app = fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
function fn(name) {
    const start = app.indexOf('function '+name+'(');
    assert.ok(start >= 0,name);
    return app.slice(start,app.indexOf('\n}',start)+2);
}
const fields = app.slice(app.indexOf('const motionFields'),app.indexOf('function motionControlId'));
let elements,groups,timers = new Map(),timerId = 0,historyUrl;
const prefixedId = (prefix,id)=>prefix ? prefix+'-'+id : id;
function resetControls() {
    elements = new Map();groups = {};
    ['', 'tablet','mobile'].forEach(prefix=> {
        const id = key=>prefixedId(prefix,key);
        const values = {long_axis:'100',short_axis:'140',position:'50',animation_length:'10',animation_long_axis:'4','shape-color':'#fbd8c2','gradient-color':'#fe6da8','shape-color-code':'#fbd8c2','gradient-color-code':'#fe6da8'};
        for(const [key,value] of Object.entries(values)) elements.set(id(key),{value,type:key.endsWith('-color') ? 'color' : 'text'});
        for(const key of ['flipped-checkbox','animate-checkbox','one-direction-checkbox','mirror-loop-checkbox','depth-layers-checkbox','gradient-checkbox']) elements.set(id(key),{type:'checkbox',checked:false});
        groups[prefix ? prefix+'dividerdirection' : 'dividerdirection'] = ['top','bottom','left','right'].map(value=>({value,checked:value==='bottom'}));
        for(const [field,value] of Object.entries(sandbox.defaults)) {
            elements.set(id('motion-'+field),{value,checked:value===true,type:typeof value === 'boolean' ? 'checkbox' : 'text',tagName:['motion','edge','light','intensity'].includes(field)?'SELECT':'INPUT'});
            if(field.endsWith('Color') || /^ribbon[A-C]$/.test(field)) elements.set(id('motion-'+field+'-hex'),{value});
        }
    });
    elements.set('mobile-ready',{checked:true,type:'checkbox'});
    sandbox.genform=groups;
}
const sandbox = {URLSearchParams,prefixedId,console,document:{getElementById:id=>{const element=elements.get(id);if(element)element.id=id;return element;}},
    window:{location:{pathname:'/creator/',hash:'#shape-divider-animations'},history:{state:{host:'preserved'},replaceState(state,title,url){assert.equal(state.host,'preserved');historyUrl=url;}},
        setTimeout(callback){const id=++timerId;timers.set(id,callback);return id;},clearTimeout(id){timers.delete(id);}},
    urlParams:new URLSearchParams(),urlStylesLoaded:false,shareUrlUpdateTimer:undefined,
    shapeIndex:0,tabletShapeIndex:1,mobileShapeIndex:2,alreadyChangedView:true,
    svgDividers:[{si:267,ratio:'FALSE'},{si:301,ratio:'TRUE'},{si:302,ratio:'FALSE'}],
    getActiveViewIndex:()=>2,syncGradientControl:()=>{},syncMotionChoice:()=>{},refreshRangeSliders:()=>{},
    viewsSelect:{style:{}},previewerFrame:{},previewClasses:['desktop-frame','tablet-frame','mobile-frame'],
    views:[0,1,2].map(()=>({classList:{toggle(name,value){this[name]=value;}}})),viewsSettings:[0,1,2].map(()=>({style:{}}))};
vm.createContext(sandbox);
vm.runInContext(fields+'\n'+['motionControlId','readMotionEffects','normalizeMotionEffects','getCheckedDirection','checkRadioByValue','getShapeIndex','setInputValueFromParam','setCheckboxFromParam','restoreViewportFromURL','updateSettingsfromURL','buildShareUrl','updateURL','scheduleShareUrlUpdate'].map(fn).join('\n')+'\nthis.defaults=motionFields;',sandbox);
resetControls();
const stacks = [
    {motion:'css-rock',edge:'creative-echo',light:'moving-light',ribbon:true,sparks:false,intensity:'0',lightColor:'#123456',ribbonA:'#223344',ribbonB:'#334455',ribbonC:'#445566',sparkColor:'#556677'},
    {motion:'swell-map',edge:'variation-contour-double',light:'variation-light-moon',ribbon:false,sparks:true,intensity:'2',lightColor:'#aabbcc',ribbonA:'#bbccdd',ribbonB:'#ccddee',ribbonC:'#ddeeff',sparkColor:'#eeffaa'},
    {motion:'rising',edge:'molten-edge',light:'none',ribbon:true,sparks:true,intensity:'1',lightColor:'#990011',ribbonA:'#880022',ribbonB:'#770033',ribbonC:'#660044',sparkColor:'#550055'}
];
['','tablet','mobile'].forEach((prefix,index)=> {
    Object.entries(stacks[index]).forEach(([field,value])=>{const input=elements.get(prefixedId(prefix,'motion-'+field));if(typeof value==='boolean')input.checked=value;else input.value=value;});
    elements.get(prefixedId(prefix,'animation_length')).value=['12','31','77'][index];
    elements.get(prefixedId(prefix,'animate-checkbox')).checked=index!==2;
    groups[prefix ? prefix+'dividerdirection' : 'dividerdirection'].forEach(r=>r.checked=r.value===['bottom','left','top'][index]);
});
const full = sandbox.buildShareUrl();
assert.match(full,/#shape-divider-animations$/);
const params = new URLSearchParams(full.split('?')[1].split('#')[0]);
assert.equal(params.get('view'),'mobile');
for(const [index,prefix] of ['','tablet','mobile'].entries()) assert.equal(JSON.stringify(JSON.parse(params.get(prefix ? prefix+'Effects':'effects'))),JSON.stringify(Object.fromEntries(Object.entries(stacks[index]).filter(([key,value])=>value!==sandbox.defaults[key]))));
// Restore independent controls, colors, checkboxes and the selected editor view.
resetControls();sandbox.shapeIndex=2;sandbox.tabletShapeIndex=0;sandbox.mobileShapeIndex=0;
sandbox.urlParams=params;sandbox.updateSettingsfromURL();
['','tablet','mobile'].forEach((prefix,index)=> {
    assert.equal(JSON.stringify(sandbox.readMotionEffects(prefix,{effective:false})),JSON.stringify({...sandbox.defaults,...stacks[index]}));
    assert.equal(elements.get(prefixedId(prefix,'animation_length')).value,['12','31','77'][index]);
    for(const color of ['lightColor','ribbonA','ribbonB','ribbonC','sparkColor']) assert.equal(elements.get(prefixedId(prefix,'motion-'+color+'-hex')).value,stacks[index][color]);
});
assert.deepEqual([sandbox.shapeIndex,sandbox.tabletShapeIndex,sandbox.mobileShapeIndex],[0,1,2]);
assert.equal(sandbox.views[2].classList.active,true);assert.equal(sandbox.previewerFrame.className,'mobile-frame');
// Switching Responsive off must preserve both inactive viewports and their data.
elements.get('mobile-ready').checked=false;
const hidden = new URLSearchParams(sandbox.buildShareUrl().split('?')[1].split('#')[0]);
assert.equal(hidden.get('mobileReady'),'false');assert.equal(hidden.get('view'),'desktop');
assert.equal(hidden.get('tabletEffects'),params.get('tabletEffects'));assert.equal(hidden.get('mobileEffects'),params.get('mobileEffects'));
// Store inactive layers even while an existing loop is selected.
elements.get('one-direction-checkbox').checked=true;
assert.equal(sandbox.readMotionEffects('').motion,'scroll');
assert.equal(JSON.parse(new URLSearchParams(sandbox.buildShareUrl().split('?')[1].split('#')[0]).get('effects')).motion,'css-rock');
// Unknown and malformed settings fall back to known values before restoration.
const safe=sandbox.normalizeMotionEffects({motion:'unknown',intensity:'999',lightColor:'javascript:alert(1)',ribbon:'true',sparks:true,extra:'ignored'});
assert.equal(safe.motion,'scroll');assert.equal(safe.intensity,'1');assert.equal(safe.lightColor,sandbox.defaults.lightColor);assert.equal(safe.ribbon,false);assert.equal(safe.sparks,true);assert.ok(!Object.hasOwn(safe,'extra'));
sandbox.urlParams=new URLSearchParams('effects=%7Bbad');assert.doesNotThrow(()=>sandbox.restoreViewportFromURL('','divider','si'));
// Debounce automatic address-bar updates and serialize the latest control values.
sandbox.scheduleShareUrlUpdate();sandbox.scheduleShareUrlUpdate();assert.equal(timers.size,1);
elements.get('animation_length').value='65';[...timers.values()][0]();
assert.equal(new URLSearchParams(historyUrl.split('?')[1].split('#')[0]).get('animLength'),'65');
console.log('Passed desktop/tablet/mobile animation URL round trips, all effect colors and flags, inactive viewport persistence, editor view restoration, malformed input, and automatic URL updates.');
