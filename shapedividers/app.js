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

const css = document.createElement('style');
css.dataset.shapedividersRuntime = 'true';
document.head.appendChild(css);

let shareUrl, shareMobileUrl, shareUrlActive;
let stateObj = { id: "100" };

    function updateURL(copyToClipboard = false){
    

shareUrl = `/?dividerDirection=${dividerDirection}&longAxisValue=${longAxisValue}&shortAxisValue=${shortAxisValue}&positionValue=${positionValue}&flipped=${flipped}&animate=${animate}&animLength=${animLength}&animLongAxis=${animLongAxis}&shapeColor=${shapeColor}&si=${svgDividers[shapeIndex].si}&shapeRatio=${shapeRatio}&mobileReady=${mobileReady}`;

shareMobileUrl = `&tabletDividerDirection=${tabletDividerDirection}&tabletLongAxisValue=${tabletLongAxisValue}&tabletShortAxisValue=${tabletShortAxisValue}&tabletPositionValue=${tabletPositionValue}&tabletFlipped=${tabletFlipped}&tabletAnimate=${tabletAnimate}&tabletAnimLength=${tabletAnimLength}&tabletAnimLongAxis=${tabletAnimLongAxis}&tabletShapeColor=${tabletShapeColor}&tsi=${svgDividers[tabletShapeIndex].si}&tabletShapeRatio=${tabletShapeRatio}&mobileDividerDirection=${mobileDividerDirection}&mobileLongAxisValue=${mobileLongAxisValue}&mobileShortAxisValue=${mobileShortAxisValue}&mobilePositionValue=${mobilePositionValue}&mobileFlipped=${mobileFlipped}&mobileAnimate=${mobileAnimate}&mobileAnimLength=${mobileAnimLength}&mobileAnimLongAxis=${mobileAnimLongAxis}&mobileShapeColor=${mobileShapeColor}&msi=${svgDividers[mobileShapeIndex].si}&mobileShapeRatio=${mobileShapeRatio}`;

          
          if (mobileReady){
    window.history.replaceState(
        stateObj,
        "shape",
        shareUrl + shareMobileUrl
    );

    if (copyToClipboard) {
        navigator.clipboard.writeText(
            window.location.origin + shareUrl + shareMobileUrl
        );
    }

    stateObj.id++;
} else {
    window.history.replaceState(
        stateObj,
        "shape",
        shareUrl
    );

    if (copyToClipboard) {
        navigator.clipboard.writeText(
            window.location.origin + shareUrl
        );
    }

    stateObj.id++;
}
       
       shareUrlActive = true;
       
    }
    
    
 
    
       /* Update everything based on the URL , itiration through an object */

/*
const entries = urlParams.entries();

for(const entry of entries) {
  window[entry[0]] = entry[1];
}*/










const queryString = window.location.search;

const urlParams = new URLSearchParams(queryString);
let urlStylesLoaded = false;

function checkRadioByValue(group, value) {
    const radio = [...group].find((item) => item.value === value);
    if (radio) {
        radio.checked = true;
    }
}



function updateSettingsfromURL(){

if (!urlStylesLoaded){
if (urlParams.has('dividerDirection')){
checkRadioByValue(genform.dividerdirection, urlParams.get('dividerDirection'));
document.getElementById("long_axis").value = urlParams.get('longAxisValue');
document.getElementById("short_axis").value = urlParams.get('shortAxisValue');
document.getElementById("position").value = urlParams.get('positionValue');
document.getElementById('flipped-checkbox').checked = ('true' == urlParams.get('flipped') );
document.getElementById('animate-checkbox').checked = ('true' == urlParams.get('animate'));
document.getElementById('animation_length').value = urlParams.get('animLength');
if (urlParams.has('animLongAxis')) {
    document.getElementById('animation_long_axis').value =
        urlParams.get('animLongAxis');
}
document.getElementById('shape-color').value = '#' + urlParams.get('shapeColor');
document.getElementById('shape-color-code').value = '#' + urlParams.get('shapeColor');
shapeIndex = getShapeIndex('si');
document.getElementById('mobile-ready').checked = ('true' == urlParams.get('mobileReady'));

urlStylesLoaded = true;
}
if (urlParams.has('tabletDividerDirection')){


checkRadioByValue(genform.tabletdividerdirection, urlParams.get('tabletDividerDirection'));
document.getElementById("tablet-long_axis").value = urlParams.get('tabletLongAxisValue');
document.getElementById("tablet-short_axis").value = urlParams.get('tabletShortAxisValue');
document.getElementById("tablet-position").value = urlParams.get('tabletPositionValue');
document.getElementById('tablet-flipped-checkbox').checked = ('true' == urlParams.get('tabletFlipped') );
document.getElementById('tablet-animate-checkbox').checked = ('true' == urlParams.get('tabletAnimate'));
document.getElementById('tablet-animation_length').value = urlParams.get('tabletAnimLength');
if (urlParams.has('tabletAnimLongAxis')) {
    document.getElementById('tablet-animation_long_axis').value =
        urlParams.get('tabletAnimLongAxis');
}
document.getElementById('tablet-shape-color').value = '#' + urlParams.get('tabletShapeColor');
document.getElementById('tablet-shape-color-code').value = '#' + urlParams.get('tabletShapeColor');
tabletShapeIndex =  getShapeIndex('tsi');



checkRadioByValue(genform.mobiledividerdirection, urlParams.get('mobileDividerDirection'));
document.getElementById("mobile-long_axis").value = urlParams.get('mobileLongAxisValue');
document.getElementById("mobile-short_axis").value = urlParams.get('mobileShortAxisValue');
document.getElementById("mobile-position").value = urlParams.get('mobilePositionValue');
document.getElementById('mobile-flipped-checkbox').checked = ('true' == urlParams.get('mobileFlipped') );
document.getElementById('mobile-animate-checkbox').checked = ('true' == urlParams.get('mobileAnimate'));
document.getElementById('mobile-animation_length').value = urlParams.get('mobileAnimLength');
if (urlParams.has('mobileAnimLongAxis')) {
    document.getElementById('mobile-animation_long_axis').value =
        urlParams.get('mobileAnimLongAxis');
}
document.getElementById('mobile-shape-color').value = '#' + urlParams.get('mobileShapeColor');
document.getElementById('mobile-shape-color-code').value = '#' + urlParams.get('mobileShapeColor');
mobileShapeIndex = getShapeIndex('msi');
}


setTimeout(function(){
document.querySelectorAll('.container div').forEach(e => e.classList.remove('selected'));
const selectedShapeElement = document.querySelectorAll('.container div')[shapeIndex];
if (selectedShapeElement) {
    selectedShapeElement.classList.add('selected');
}
 mobileReady? viewsSelect.style.display = 'flex' : null;
 }, 970);
 
 
 
   refreshRangeSliders();
    
}

}



function getShapeIndex(param){ 
    for (let i=0; i < svgDividers.length; i++){
    let siIngle = urlParams.get(param);
    if ( svgDividers[i].si == siIngle ){
        return i;
    } }};

/* Form styling in part from https://codepen.io/dapacreative/pen/bdzYEe */
   
let dividerDirection, longAxisValue, shortAxisValue, positionValue, flipped, animate, animLength, animLongAxis, animHorName, animVerName, shapeDiv, shapeColor, shapeIndex, selectedShape, shapeRatio, si;

let tabletDividerDirection, tabletLongAxisValue, tabletShortAxisValue, tabletPositionValue, tabletFlipped, tabletAnimate, tabletAnimLength, tabletAnimLongAxis, tabletAnimHorName, tabletAnimVerName, tabletShapeDiv, tabletShapeColor, tabletShapeIndex, tabletSelectedShape, tabletShapeRatio, tsi;

let mobileDividerDirection, mobileLongAxisValue, mobileShortAxisValue, mobilePositionValue, mobileFlipped, mobileAnimate, mobileAnimLength, mobileAnimHorName, mobileAnimVerName, mobileAnimLongAxis, mobileShapeDiv, mobileShapeColor, mobileShapeIndex, mobileSelectedShape, mobileShapeRatio, msi;

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

const views = document.querySelectorAll('.view_select div');
const viewsSettings = document.querySelectorAll('.desktop_settings, .tablet_settings, .mobile_settings');


const previewerFrame = document.getElementById("responsive_view_framer");
const previewer = document.getElementById("previewer");
const colorDiv = document.querySelector('.color_div');
let shapeDividerDemoDiv = document.querySelector('.image_div');

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

        if (!alreadyChangedView && !urlParams.has('tabletDividerDirection')) {
            syncResponsiveControlsFromDesktop();
            alreadyChangedView = true;
        }

        updateShape();
        renderShapePicker();
        updateSelectedShape();
    });
});

const viewsSelect = document.querySelector('.view_select');

document.getElementById('mobile-ready').addEventListener('change', function() {
   if (this.checked) {
      viewsSelect.style.display = 'flex';
   } else {
      viewsSelect.style.display = 'none';
      views.forEach(e => e.classList.remove('active'));
      views[0].classList.add('active');
      viewsSettings.forEach(e => e.style.display = 'none');
      viewsSettings[0].style.display = 'block';
      previewerFrame.setAttribute("class", previewClasses[0]);
   }
});



function premiumCheck() {

    const premiumRequired =
        animate ||
        (
            mobileReady &&
            (
                tabletAnimate ||
                mobileAnimate ||
                svgDividers[tabletShapeIndex].pro ||
                svgDividers[mobileShapeIndex].pro
            )
        ) ||
        svgDividers[shapeIndex].pro;

    if (!isPremium) {
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

const VIEWPORT_PREFIXES = ['', 'tablet', 'mobile'];

function prefixedId(prefix, baseId) {
    return prefix ? `${prefix}-${baseId}` : baseId;
}

function getCheckedDirection(prefix) {
    const groupName = prefix ? `${prefix}dividerdirection` : 'dividerdirection';
    return [...genform[groupName]].find((radio) => radio.checked)?.value || 'top';
}

function readViewportControls(prefix, selectedIndex) {
    const colorInput = document.getElementById(prefixedId(prefix, 'shape-color'));
    const longAxisInput = document.getElementById(prefixedId(prefix, 'long_axis'));
    const shortAxisInput = document.getElementById(prefixedId(prefix, 'short_axis'));
    const positionInput = document.getElementById(prefixedId(prefix, 'position'));
    const flippedInput = document.getElementById(prefixedId(prefix, 'flipped-checkbox'));
    const animateInput = document.getElementById(prefixedId(prefix, 'animate-checkbox'));
    const animationLengthInput = document.getElementById(prefixedId(prefix, 'animation_length'));
    const animationLongAxisInput = document.getElementById(prefixedId(prefix, 'animation_long_axis'));

    const direction = getCheckedDirection(prefix);
    const color = colorInput.value.slice(1);
    const selectedDivider = svgDividers[selectedIndex];

    return {
        direction,
        color,
        longAxis: longAxisInput.value,
        shortAxis: shortAxisInput.value,
        position: positionInput.value,
        flipped: flippedInput.checked,
        animate: animateInput.checked,
        animationLength: animationLengthInput.value,
        animationLongAxis: animationLongAxisInput.value,
        selectedShape: selectedDivider[direction]
            .replaceAll('%23000000', '%23' + color)
            .replaceAll('#', '%23'),
        ratio: selectedDivider.ratio,
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

function applyPreviewForActiveView() {
    const activeIndex = getActiveViewIndex();

    if (!mobileReady || activeIndex <= 0) {
        css.textContent = shapeDiv;
        previewer.className = 'previewer ' + dividerDirection;
        return;
    }

    if (activeIndex === 1) {
        css.textContent = tabletShapeDiv;
        previewer.className = 'previewer ' + tabletDividerDirection;
        return;
    }

    css.textContent = mobileShapeDiv;
    previewer.className = 'previewer ' + mobileDividerDirection;
}



function updateShape() {

   updateSettingsfromURL();
    
   const desktopState = readViewportControls('', shapeIndex);

   shapeColor = desktopState.color;
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

   if (getActiveViewIndex() === 0) {
      colorDiv.style.backgroundColor = '#' + shapeColor;
   }

   previewer.className = 'previewer ' + dividerDirection;

shapeDiv = `
${mobileReady? `@media (min-width:1025px){
` : `.svg_divider{
overflow:hidden;
position:relative;
}`}
.svg_divider::before{
content:'';
position: absolute;
bottom: -0.1vw;
left: -0.1vw;
right: -0.1vw;
top: -0.1vw; ${animate? `
transform:${(dividerDirection == 'top' || dividerDirection == 'bottom')? `scale${shapeRatio? '' : 'X'}(${animLongAxis});` : `scale${shapeRatio? '' : 'Y'}(${animLongAxis});`}
transform-origin: ${dividerDirection == 'top' ? '100% 0;' : dividerDirection == 'bottom' ? '100% 100%;' : dividerDirection == 'right' ? '100% 100%;' : dividerDirection == 'left' ? '0 100%;' : ''}
animation: ${animLength}s infinite alternate ${(dividerDirection == 'top' || dividerDirection == 'bottom')? `${animHorName}` : `${animVerName}`} linear;
background-size: ${(dividerDirection == 'top' || dividerDirection == 'bottom')? '100%' : shortAxisValue + 'px'} ${(dividerDirection == 'top' || dividerDirection == 'bottom')? shortAxisValue + 'px' : '100%'};` : `
background-size: ${(dividerDirection == 'top' || dividerDirection == 'bottom')? longAxisValue + '%' : shortAxisValue + 'px'} ${(dividerDirection == 'top' || dividerDirection == 'bottom')? shortAxisValue + 'px' : longAxisValue + '%'};`}
background-position: ${dividerDirection == 'left'? 0 : dividerDirection == 'right'? 100 : positionValue}% ${dividerDirection == 'top'? 0 : dividerDirection == 'bottom'? 100 : positionValue }%;
background-repeat: no-repeat;     ${(flipped && !animate) ? `
transform: rotate${ (dividerDirection == 'top' || dividerDirection == 'bottom')? 'Y' : 'X'}(180deg);` : ''}
z-index: 3;
pointer-events: none;
background-image: url('data:image/svg+xml;charset=utf8, ${selectedShape}'); 
}
${(dividerDirection == 'top' || dividerDirection == 'bottom')? `@media (min-width:2100px){
.svg_divider::before{
background-size: ${longAxisValue + '%'} ${'calc(2vw + ' + shortAxisValue + 'px)'};
}
}` : '' }
@keyframes ${(dividerDirection == 'top' || dividerDirection == 'bottom')? `${animHorName} {
  100% {
    transform: scale${shapeRatio? '' : 'X'}(${animLongAxis}) translateX(calc(100% - (100% / ${animLongAxis})));
  }
}

` : `${animVerName} {
  100% {
    transform: scale${shapeRatio? '' : 'Y'}(${animLongAxis}) translateY(calc(100% - (100% / ${animLongAxis})));
  }
}`}


${mobileReady? ' }' : ''}
`;



   if (mobileReady) {

      const tabletState = readViewportControls('tablet', tabletShapeIndex);

      tabletShapeColor = tabletState.color;
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

      if (getActiveViewIndex() === 1) {
         colorDiv.style.backgroundColor = '#' + tabletShapeColor;
      }

tabletShapeDiv = `
@media (min-width:768px){
.svg_divider::before{
content:'';
position: absolute;
bottom: -1px;
left: -1px;
right: -1px;
top: -1px; ${tabletAnimate? `
transform:${(tabletDividerDirection == 'top' || tabletDividerDirection == 'bottom')? `scale${tabletShapeRatio? '' : 'X'}(${tabletAnimLongAxis});` : `scale${tabletShapeRatio? '' : 'Y'}(${tabletAnimLongAxis});`}
transform-origin: ${tabletDividerDirection == 'top' ? '100% 0;' : tabletDividerDirection == 'bottom' ? '100% 100%;' : tabletDividerDirection == 'right' ? '100% 100%;' : tabletDividerDirection == 'left' ? '0 100%;' : ''}
animation: ${tabletAnimLength}s infinite alternate ${(tabletDividerDirection == 'top' || tabletDividerDirection == 'bottom')? `${animHorName}-tablet` : `${animVerName}-tablet`} linear;
background-size: ${(tabletDividerDirection == 'top' || tabletDividerDirection == 'bottom')? '100%' : tabletShortAxisValue + 'px'} ${(tabletDividerDirection == 'top' || tabletDividerDirection == 'bottom')? tabletShortAxisValue + 'px' : '100%'};` : `
background-size: ${(tabletDividerDirection == 'top' || tabletDividerDirection == 'bottom')? tabletLongAxisValue + '%' : tabletShortAxisValue + 'px'} ${(tabletDividerDirection == 'top' || tabletDividerDirection == 'bottom')? tabletShortAxisValue + 'px' : tabletLongAxisValue + '%'};`}
background-position: ${tabletDividerDirection == 'left'? 0 : tabletDividerDirection == 'right'? 100 : tabletPositionValue}% ${tabletDividerDirection == 'top'? 0 : tabletDividerDirection == 'bottom'? 100 : tabletPositionValue }%;
background-repeat: no-repeat;     ${(tabletFlipped && !tabletAnimate) ? `
transform: rotate${ (tabletDividerDirection == 'top' || tabletDividerDirection == 'bottom')? 'Y' : 'X'}(180deg);` : ''}
z-index: 3;
pointer-events: none;
background-image: url('data:image/svg+xml;charset=utf8, ${tabletSelectedShape}'); 
}
}
@keyframes ${(tabletDividerDirection == 'top' || tabletDividerDirection == 'bottom')? `${animHorName}-tablet {
  100% {
    transform: scale${tabletShapeRatio? '' : 'X'}(${tabletAnimLongAxis}) translateX(calc(100% - (100% / ${tabletAnimLongAxis})));
  }
}

` : `${animVerName}-tablet {
  100% {
    transform: scale${tabletShapeRatio? '' : 'Y'}(${tabletAnimLongAxis}) translateY(calc(100% - (100% / ${tabletAnimLongAxis})));
  }
}` }
`;

      const mobileState = readViewportControls('mobile', mobileShapeIndex);

      mobileShapeColor = mobileState.color;
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

      if (getActiveViewIndex() === 2) {
         colorDiv.style.backgroundColor = '#' + mobileShapeColor;
      }

mobileShapeDiv = `.svg_divider{
overflow:hidden;
position:relative;
}
.svg_divider::before{
content:'';
position: absolute;
bottom: -1px;
left: -1px;
right: -1px;
top: -1px; ${mobileAnimate? `
transform:${(mobileDividerDirection == 'top' || mobileDividerDirection == 'bottom')? `scale${mobileShapeRatio? '' : 'X'}(${mobileAnimLongAxis});` : `scale${mobileShapeRatio? '' : 'Y'}(${mobileAnimLongAxis});`}
transform-origin: ${mobileDividerDirection == 'top' ? '100% 0;' : mobileDividerDirection == 'bottom' ? '100% 100%;' : mobileDividerDirection == 'right' ? '100% 100%;' : mobileDividerDirection == 'left' ? '0 100%;' : ''}
animation: ${mobileAnimLength}s infinite alternate ${(mobileDividerDirection == 'top' || mobileDividerDirection == 'bottom')? `${animHorName}-mobile` : `${animVerName}-mobile`} linear;
background-size: ${(mobileDividerDirection == 'top' || mobileDividerDirection == 'bottom')? '100%' : mobileShortAxisValue + 'px'} ${(mobileDividerDirection == 'top' || mobileDividerDirection == 'bottom')? mobileShortAxisValue + 'px' : '100%'};` : `
background-size: ${(mobileDividerDirection == 'top' || mobileDividerDirection == 'bottom')? mobileLongAxisValue + '%' : mobileShortAxisValue + 'px'} ${(mobileDividerDirection == 'top' || mobileDividerDirection == 'bottom')? mobileShortAxisValue + 'px' : mobileLongAxisValue + '%'};`}
background-position: ${mobileDividerDirection == 'left'? 0 : mobileDividerDirection == 'right'? 100 : mobilePositionValue}% ${mobileDividerDirection == 'top'? 0 : mobileDividerDirection == 'bottom'? 100 : mobilePositionValue }%;
background-repeat: no-repeat;     ${(mobileFlipped && !mobileAnimate) ? `
transform: rotate${ (mobileDividerDirection == 'top' || mobileDividerDirection == 'bottom')? 'Y' : 'X'}(180deg);` : ''}
z-index: 3;
pointer-events: none;
background-image: url('data:image/svg+xml;charset=utf8, ${mobileSelectedShape}'); 
}
@keyframes ${(mobileDividerDirection == 'top' || mobileDividerDirection == 'bottom')? `${animHorName}-mobile {
  100% {
    transform: scale${mobileShapeRatio? '' : 'X'}(${mobileAnimLongAxis}) translateX(calc(100% - (100% / ${mobileAnimLongAxis})));
  }
}

` : `${animVerName}-mobile {
  100% {
    transform: scale${mobileShapeRatio? '' : 'Y'}(${mobileAnimLongAxis}) translateY(calc(100% - (100% / ${mobileAnimLongAxis})));
  }
}` }
`;



   };

   applyPreviewForActiveView();

             premiumCheck();
   

};

const copyCodeButton = document.getElementById("copye");
const premiumButton = document.getElementById("premium");
const loginButton = document.getElementById("login");

copyCodeButton.addEventListener("click", () => updateURL(false));
copyCodeButton.addEventListener("click", copyCode);


const settingsWindow = document.querySelector('.settings_window');

function copyCode() {
    copyCodeButton.innerText = 'Copied!';
    if (
    (
        svgDividers[shapeIndex].pro ||
        (
            mobileReady &&
            (
                svgDividers[tabletShapeIndex].pro ||
                svgDividers[mobileShapeIndex].pro
            )
        )
    ) &&
    !isPremium
) {
        let message = `Oups! Looks like you have selected a premium shape in one of the viewports! Get premium here : https://shapedividers.com/get-premium/ , or login here https://shapedividers.com/account/ if you have premium already!
        
        Thank you!`
        navigator.clipboard.writeText(message);
    } else {
        generateUniqueCSSName();
    if ((animate || tabletAnimate || mobileAnimate) && false){ /* remove && false to make this work */
   if (mobileReady) {
       copyRightCode();
      navigator.clipboard.writeText(mobileShapeDiv + tabletShapeDiv + shapeDiv + animationCSS);
   } else {
       copyRightCode()
      navigator.clipboard.writeText(shapeDiv + animationCSS);
   } }
   else {
       if (mobileReady) {
       copyRightCode();
      navigator.clipboard.writeText(mobileShapeDiv + tabletShapeDiv + shapeDiv);
   } else {
      copyRightCode();
      navigator.clipboard.writeText(shapeDiv);
   }
   }
}
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

/*
let copiedCount = 1;
console.log(copiedCount);
if (localStorage.getItem('copiedCountStorage') != null){
   copiedCount = +localStorage.getItem('copiedCountStorage');
} 
console.log(copiedCount);
*/


function generateUniqueCSSName(){
if (!isPremium){
    shapeCSSName = 'shapedividers_com-' + copiedCount;
} else {
    shapeCSSName = 'shape-' + copiedCount;
}
copiedCount = random(0, 9999);
}














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
transform:${(dividerDirection == 'top' || dividerDirection == 'bottom')? `scale${shapeRatio? '' : 'X'}(${animLongAxis});` : `scale${shapeRatio? '' : 'Y'}(${animLongAxis});`}
transform-origin: ${dividerDirection == 'top' ? '100% 0;' : dividerDirection == 'bottom' ? '100% 100%;' : dividerDirection == 'right' ? '100% 100%;' : dividerDirection == 'left' ? '0 100%;' : ''}
animation: ${animLength}s infinite alternate ${(mobileDividerDirection != dividerDirection || mobileShapeRatio != shapeRatio || mobileAnimLongAxis != animLongAxis || !mobileReady)? `${(dividerDirection == 'top' || dividerDirection == 'bottom')? `${animHorName}` : `${animVerName}`} ` : `${(dividerDirection == 'top' || dividerDirection == 'bottom')? `${animHorName}-mobile` : `${animVerName}-mobile`} `} linear;
background-size: ${(dividerDirection == 'top' || dividerDirection == 'bottom')? '100%' : shortAxisValue + 'px'} ${(dividerDirection == 'top' || dividerDirection == 'bottom')? shortAxisValue + 'px' : '100%'};` : `${(mobileAnimate || tabletAnimate)? `
animation:none;`:''}
background-size: ${(dividerDirection == 'top' || dividerDirection == 'bottom')? longAxisValue + '%' : shortAxisValue + 'px'} ${(dividerDirection == 'top' || dividerDirection == 'bottom')? shortAxisValue + 'px' : longAxisValue + '%'};`}
background-position: ${dividerDirection == 'left'? 0 : dividerDirection == 'right'? 100 : positionValue}% ${dividerDirection == 'top'? 0 : dividerDirection == 'bottom'? 100 : positionValue }%; ${(flipped && !animate) ? `
transform: rotate${ (dividerDirection == 'top' || dividerDirection == 'bottom')? 'Y' : 'X'}(180deg);` : ''} ${mobileReady? `${tabletSelectedShape == selectedShape? '': `
background-image: url('data:image/svg+xml;charset=utf8, ${selectedShape}'); `}` : `background-image: url('data:image/svg+xml;charset=utf8, ${selectedShape}'); `}
}
${mobileReady? '}' : ''}
${(dividerDirection == 'top' || dividerDirection == 'bottom')? `@media (min-width:2100px){
.${shapeCSSName}::before{
background-size: ${longAxisValue + '%'} ${'calc(2vw + ' + shortAxisValue + 'px)'};
}
}` : '' }
${animate? `
${(mobileDividerDirection != dividerDirection || mobileShapeRatio != shapeRatio || mobileAnimLongAxis != animLongAxis || !mobileReady)? `@keyframes ${(dividerDirection == 'top' || dividerDirection == 'bottom')? `${animHorName} {
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
      tabletFlipped = document.getElementById('tablet-flipped-checkbox').checked ? true : false;

      tabletSelectedShape = svgDividers[tabletShapeIndex][tabletDividerDirection].replaceAll('%23000000', '%23' + tabletShapeColor).replaceAll('#', '%23');

      if (views[1].classList.contains('active')) {
         colorDiv.style.backgroundColor = '#' + tabletShapeColor;
      }

tabletShapeDiv = `@media (min-width:768px){
.${shapeCSSName}::before{${tabletAnimate? `
transform:${(tabletDividerDirection == 'top' || tabletDividerDirection == 'bottom')? `scale${tabletShapeRatio? '' : 'X'}(${tabletAnimLongAxis});` : `scale${tabletShapeRatio? '' : 'Y'}(${tabletAnimLongAxis});`}
transform-origin: ${tabletDividerDirection == 'top' ? '100% 0;' : tabletDividerDirection == 'bottom' ? '100% 100%;' : tabletDividerDirection == 'right' ? '100% 100%;' : tabletDividerDirection == 'left' ? '0 100%;' : ''}
animation: ${tabletAnimLength}s infinite alternate ${(mobileDividerDirection != tabletDividerDirection || mobileShapeRatio != tabletShapeRatio || mobileAnimLongAxis != tabletAnimLongAxis)? `${(tabletDividerDirection == 'top' || tabletDividerDirection == 'bottom')? `${animHorName}-tablet` : `${animVerName}-tablet`}` : `${(tabletDividerDirection == 'top' || tabletDividerDirection == 'bottom')? `${animHorName}-mobile` : `${animVerName}-mobile`}`} linear;
background-size: ${(tabletDividerDirection == 'top' || tabletDividerDirection == 'bottom')? '100%' : tabletShortAxisValue + 'px'} ${(tabletDividerDirection == 'top' || tabletDividerDirection == 'bottom')? tabletShortAxisValue + 'px' : '100%'};` : `${(mobileAnimate)? `
animation:none;`:''}
background-size: ${(tabletDividerDirection == 'top' || tabletDividerDirection == 'bottom')? tabletLongAxisValue + '%' : tabletShortAxisValue + 'px'} ${(tabletDividerDirection == 'top' || tabletDividerDirection == 'bottom')? tabletShortAxisValue + 'px' : tabletLongAxisValue + '%'};`}
background-position: ${tabletDividerDirection == 'left'? 0 : tabletDividerDirection == 'right'? 100 : tabletPositionValue}% ${tabletDividerDirection == 'top'? 0 : tabletDividerDirection == 'bottom'? 100 : tabletPositionValue }%;  ${(tabletFlipped && !tabletAnimate) ? `
transform: rotate${ (tabletDividerDirection == 'top' || tabletDividerDirection == 'bottom')? 'Y' : 'X'}(180deg);` : ''} ${mobileSelectedShape == tabletSelectedShape? '': `
background-image: url('data:image/svg+xml;charset=utf8, ${tabletSelectedShape}'); `}
}  
}
${tabletAnimate? `
${(mobileDividerDirection != tabletDividerDirection || mobileShapeRatio != tabletShapeRatio || mobileAnimLongAxis != tabletAnimLongAxis)? `@keyframes ${(tabletDividerDirection == 'top' || tabletDividerDirection == 'bottom')? `${animHorName}-tablet {
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
      mobileFlipped = document.getElementById('mobile-flipped-checkbox').checked ? true : false;

      mobileSelectedShape = svgDividers[mobileShapeIndex][mobileDividerDirection].replaceAll('%23000000', '%23' + mobileShapeColor).replaceAll('#', '%23');
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
transform:${(mobileDividerDirection == 'top' || mobileDividerDirection == 'bottom')? `scale${mobileShapeRatio? '' : 'X'}(${mobileAnimLongAxis});` : `scale${mobileShapeRatio? '' : 'Y'}(${mobileAnimLongAxis});`}
transform-origin: ${mobileDividerDirection == 'top' ? '100% 0;' : mobileDividerDirection == 'bottom' ? '100% 100%;' : mobileDividerDirection == 'right' ? '100% 100%;' : mobileDividerDirection == 'left' ? '0 100%;' : ''}
animation: ${mobileAnimLength}s infinite alternate ${(mobileDividerDirection == 'top' || mobileDividerDirection == 'bottom')? `${animHorName}-mobile` : `${animVerName}-mobile`} linear;
background-size: ${(mobileDividerDirection == 'top' || mobileDividerDirection == 'bottom')? '100%' : mobileShortAxisValue + 'px'} ${(mobileDividerDirection == 'top' || mobileDividerDirection == 'bottom')? mobileShortAxisValue + 'px' : '100%'};` : `
background-size: ${(mobileDividerDirection == 'top' || mobileDividerDirection == 'bottom')? mobileLongAxisValue + '%' : mobileShortAxisValue + 'px'} ${(mobileDividerDirection == 'top' || mobileDividerDirection == 'bottom')? mobileShortAxisValue + 'px' : mobileLongAxisValue + '%'};`}
background-position: ${mobileDividerDirection == 'left'? 0 : mobileDividerDirection == 'right'? 100 : mobilePositionValue}% ${mobileDividerDirection == 'top'? 0 : mobileDividerDirection == 'bottom'? 100 : mobilePositionValue }%;    ${(mobileFlipped && !mobileAnimate) ? `
transform: rotate${ (mobileDividerDirection == 'top' || mobileDividerDirection == 'bottom')? 'Y' : 'X'}(180deg);` : ''}
background-image: url('data:image/svg+xml;charset=utf8, ${mobileSelectedShape}'); 
}
${mobileAnimate?`
@keyframes ${(mobileDividerDirection == 'top' || mobileDividerDirection == 'bottom')? `${animHorName}-mobile {
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
shareLink.addEventListener("click", () => updateURL(true));



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

function configureAnimationAxisForShape(shape) {
    const activeIndex = Math.max(0, getActiveViewIndex());
    const inputIds = [
        'animation_long_axis',
        'tablet-animation_long_axis',
        'mobile-animation_long_axis'
    ];

    const input = document.getElementById(inputIds[activeIndex]);
    if (!input) return;

    input.value = shape.ratio ? 3 : 4;
    input.max = shape.ratio ? 4 : 10;
}

function renderShapePicker() {
    const activeDirection = getActiveDirection();
    const activeShapeIndex = getActiveShapeIndex();

    shapePicker.className = `container ${activeDirection}`;

    const fragment = document.createDocumentFragment();

    svgDividers.forEach((shape, index) => {
        const item = document.createElement('div');
        item.dataset.shapeIndex = String(index);
        item.classList.add(shape.slug, activeDirection);

        if (shape.pro) item.classList.add('premium');
        if (index === activeShapeIndex) item.classList.add('selected');

        item.innerHTML = shape[activeDirection];
        fragment.appendChild(item);
    });

    shapePicker.replaceChildren(fragment);
}

shapePicker.addEventListener('click', (event) => {
    const item = event.target.closest('[data-shape-index]');
    if (!item || !shapePicker.contains(item)) return;

    const index = Number(item.dataset.shapeIndex);
    if (!Number.isInteger(index) || !svgDividers[index]) return;

    setActiveShapeIndex(index);
    configureAnimationAxisForShape(svgDividers[index]);
    renderShapePicker();
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

copyCodeButton.addEventListener("click", formUpdate);

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
