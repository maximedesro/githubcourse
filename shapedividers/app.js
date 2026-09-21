function initShapeDividersApp() {
/* obfuscation JS 
    */
    
    let decoyCSS = `
@media (min-width:1025px){

.ssvg_divider::before{
content:'';
position: absolute;
bottom: -0.1vw;
left: -0.1vw;
right: -0.1vw;
top: -0.1vw; 
transform:scaleX(1.2);
transform-origin: 100% 0;
animation: 10s infinite alternate shape-anim-1 linear;
background-size: 100% 90px;
background-position: 50% 0%;
background-repeat: no-repeat;     
z-index: 3;
pointer-events: none;
background-image: url('data:image/svg+xml;charset=utf8, <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 1" preserveAspectRatio="none"><path d="M0 0h10L5 1z" fill="%23fbd8c2"/></svg>'); 
}
@media (min-width:2100px){
.ssvg_divider::before{
background-size: 100% calc(2vw + 90px);
}
}
@keyframes shape-anim-1f {
  100% {
    transform: scaleX(1.2) translateX(calc(100% - (100% / 1.2)));
  }
}
 }`
 
 let otherDecoyCSS = `
@media (min-width:1025px){

.svg_dividere::before{
content:'';
position: absolute;
bottom: -0.1vw;
left: -0.1vw;
right: -0.1vw;
top: -0.1vw; 
transform:scaleX(1.2);
transform-origin: 100% 0;
animation: 10s infinite alternate shape-anim-1 linear;
background-size: 100% 90px;
background-position: 50% 0%;
background-repeat: no-repeat;     
z-index: 3;
pointer-events: none;
background-image: url('data:image/svg+xml;charset=utf8, <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 1" preserveAspectRatio="none"><path d="M0 0h10L5 1z" fill="%23fbd8c2"/></svg>'); 
}
@media (min-width:2100px){
.svg_dividere::before{
background-size: 100% calc(2vw + 90px);
}
}
@keyframes shape-anim-1f {
  100% {
    transform: scaleX(1.2) translateX(calc(100% - (100% / 1.2)));
  }
}
 }`
    
    
let containerDiv = document.querySelector('.htmlpreview > div');

let headerElement = document.getElementsByTagName("head")[0];

let css = document.createElement("style");


    
    for (let i=0; i<100; i++){
        let viewFramer = document.createElement('div');
        viewFramer.className = 'auto';
        viewFramer.setAttribute('id','responsive_view_framer-' + i);
        let previewDecoyDiv = document.createElement('div');
        previewDecoyDiv.className = 'previewer top';
        previewDecoyDiv.setAttribute('id','previewer-' + i);
        let obDiv = document.createElement('div');
        let liDiv = document.createElement('li');
        obDiv.className = 'image_div svg_divider-' + i;
        obDiv.innerHTML = `
::before`;
        viewFramer.append(previewDecoyDiv);
        previewDecoyDiv.append(obDiv);
        obDiv.append(liDiv);
        containerDiv.prepend(viewFramer);
        
        let decoycssdivs = document.createElement("style");
        if (i < 54){
            decoycssdivs.innerHTML = decoyCSS;
            headerElement.appendChild(decoycssdivs);
        } else if (i == 54) {
            headerElement.appendChild(css);
            } else {
            decoycssdivs.innerHTML = otherDecoyCSS;
            headerElement.appendChild(decoycssdivs);
        }
    }
    


    
let images = containerDiv.children;
let frag = document.createDocumentFragment();
while (images.length) {
frag.appendChild(images[Math.floor(Math.random() * images.length)]);
}
containerDiv.appendChild(frag);

let colorDivision = document.createElement('div');
    colorDivision.className = 'color_div';
    containerDiv.append(colorDivision);

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



function updateSettingsfromURL(){

if (!urlStylesLoaded){
if (urlParams.has('dividerDirection')){
[...genform.dividerdirection].filter((r => r.value == urlParams.get('dividerDirection')))[0].checked = true;
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


[...genform.tabletdividerdirection].filter((r => r.value == urlParams.get('tabletDividerDirection')))[0].checked = true;
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



[...genform.mobiledividerdirection].filter((r => r.value == urlParams.get('mobileDividerDirection')))[0].checked = true;
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
 
 
 
   sliders.forEach((e,i) =>{
   e.querySelector("span").innerHTML = e.querySelector("input").value;
   applyFill(e.querySelector("input"));
    });
    
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

let views = document.querySelectorAll('.view_select div');
let viewsSettings = document.querySelectorAll('.desktop_settings, .tablet_settings, .mobile_settings');


let previewerFrame = document.getElementById("responsive_view_framer");
let previewer = document.getElementById("previewer");
let colorDiv = document.querySelector('.color_div');
let shapeDividerDemoDiv = document.querySelector('.image_div');

let alreadyChangedView = false;

let previewClasses = ['auto', 'tablet-portrait', 'mobile-portrait'];
views.forEach((v, i) => {
   v.addEventListener('click', function() {
      views.forEach(e => e.classList.remove('active'));
      v.classList.add('active');
      viewsSettings.forEach(e => e.style.display = 'none');
      viewsSettings[i].style.display = 'block';
      previewerFrame.setAttribute("class", previewClasses[i]);
      
      
      /* Sync tablet and mobile on first click with desktop */
      if (!alreadyChangedView && !urlParams.has('tabletDividerDirection')){
   document.getElementById('mobile-shape-color').value = document.getElementById('shape-color').value;
   [...genform.mobiledividerdirection].filter((r => r.value == ([...genform.dividerdirection].filter((r) => r.checked)[0] || {}).value))[0].checked = true;
   document.getElementById("mobile-long_axis").value = document.getElementById("long_axis").value;
   document.getElementById("mobile-short_axis").value = document.getElementById("short_axis").value;
   document.getElementById("mobile-position").value = document.getElementById("position").value;
   document.getElementById('mobile-flipped-checkbox').checked = document.getElementById('flipped-checkbox').checked;
   document.getElementById('mobile-animate-checkbox').checked = document.getElementById('animate-checkbox').checked;
   document.getElementById('mobile-animation_length').value = document.getElementById('animation_length').value;
   document.getElementById('mobile-animation_long_axis').value = document.getElementById('animation_long_axis').value;
   document.getElementById("mobile-shape-color-code").value = document.getElementById('shape-color-code').value;
   mobileShapeIndex = shapeIndex;


   document.getElementById('tablet-shape-color').value = document.getElementById('shape-color').value;
   [...genform.tabletdividerdirection].filter((r => r.value == ([...genform.dividerdirection].filter((r) => r.checked)[0] || {}).value))[0].checked = true;
   document.getElementById("tablet-long_axis").value = document.getElementById("long_axis").value;
   document.getElementById("tablet-short_axis").value = document.getElementById("short_axis").value;
   document.getElementById("tablet-position").value = document.getElementById("position").value;
   document.getElementById('tablet-flipped-checkbox').checked = document.getElementById('flipped-checkbox').checked;
   document.getElementById('tablet-animate-checkbox').checked = document.getElementById('animate-checkbox').checked;
   document.getElementById('tablet-animation_length').value = document.getElementById('animation_length').value;
   document.getElementById('tablet-animation_long_axis').value = document.getElementById('animation_long_axis').value;
   document.getElementById("tablet-shape-color-code").value = document.getElementById('shape-color-code').value;
   tabletShapeIndex = shapeIndex;

      colorDiv.style.backgroundColor = '#' + shapeColor;


   previewer.className = 'previewer ' + dividerDirection;
   
   sliders.forEach((e,i) =>{
   e.querySelector("span").innerHTML = e.querySelector("input").value;
   applyFill(e.querySelector("input"));
    });
    
      alreadyChangedView = true;
      } 
      
      updateShape();
      updatePreview();
      updateSelectedShape();
   });
});

let viewsSelect = document.querySelector('.view_select');

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

let longAxisContainers = document.querySelectorAll('.long-axis-container');
let positionContainers = document.querySelectorAll('.position-container');
let flippedContainers = document.querySelectorAll('.flipped-container');
let animationLengthContainers = document.querySelectorAll('.animation-length-container');
let animationLongAxisContainers = document.querySelectorAll('.animation-long-axis-container');


function updateShape() {

   updateSettingsfromURL();
    
   shapeColor = document.getElementById('shape-color').value.slice(1);
   dividerDirection = ([...genform.dividerdirection].filter((r) => r.checked)[0] || {}).value;
   longAxisValue = document.getElementById("long_axis").value;
   shortAxisValue = document.getElementById("short_axis").value;
   positionValue = document.getElementById("position").value;
   flipped = document.getElementById('flipped-checkbox').checked ? true : false;
   animate = document.getElementById('animate-checkbox').checked ? true : false;
   animLength = document.getElementById('animation_length').value;
   animLongAxis = document.getElementById('animation_long_axis').value;
   
   animHorName = 'shape-anim-' + copiedCount;
   animVerName = 'shape-ver-anim-' + copiedCount;
   






   selectedShape = svgDividers[shapeIndex][dividerDirection].replaceAll('%23000000', '%23' + shapeColor).replaceAll('#', '%23');
   shapeRatio = svgDividers[shapeIndex].ratio;
   
   mobileReady = document.getElementById('mobile-ready').checked ? true : false;




   if (views[0].classList.contains('active')) {
      colorDiv.style.backgroundColor = '#' + shapeColor;
   }

   previewer.className = 'previewer ' + dividerDirection;

   if (animate){ 
       longAxisContainers[0].style.display = 'none';
       positionContainers[0].style.display = 'none';
       flippedContainers[0].style.display = 'none';
       animationLengthContainers[0].style.display = 'block';
       animationLongAxisContainers[0].style.display = 'block';
      } else {
       longAxisContainers[0].style.display = 'block';
       positionContainers[0].style.display = 'block';
       flippedContainers[0].style.display = 'flex';
       animationLengthContainers[0].style.display = 'none';
       animationLongAxisContainers[0].style.display = 'none';
           if (longAxisValue < 170){
        positionContainers[0].style.display = 'none';
        document.getElementById("position").value = 50;
    } else {
        positionContainers[0].style.display = 'block';
    }

       }



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

      tabletShapeColor = document.getElementById('tablet-shape-color').value.slice(1);
      tabletDividerDirection = ([...genform.tabletdividerdirection].filter((r) => r.checked)[0] || {}).value;
      tabletLongAxisValue = document.getElementById("tablet-long_axis").value;
      tabletShortAxisValue = document.getElementById("tablet-short_axis").value;
      tabletPositionValue = document.getElementById("tablet-position").value;
      tabletFlipped = document.getElementById('tablet-flipped-checkbox').checked ? true : false;
           tabletAnimate = document.getElementById('tablet-animate-checkbox').checked ? true : false;
   tabletAnimLength = document.getElementById('tablet-animation_length').value;
   tabletAnimLongAxis = document.getElementById('tablet-animation_long_axis').value;
   
   if (tabletAnimate){ 
       longAxisContainers[1].style.display = 'none';
       positionContainers[1].style.display = 'none';
       flippedContainers[1].style.display = 'none';
       animationLengthContainers[1].style.display = 'block';
       animationLongAxisContainers[1].style.display = 'block';
       
       
       } else {
       longAxisContainers[1].style.display = 'block';
       positionContainers[1].style.display = 'block';
       flippedContainers[1].style.display = 'flex';
       animationLengthContainers[1].style.display = 'none';
       animationLongAxisContainers[1].style.display = 'none';

       if (tabletLongAxisValue < 170){
        positionContainers[1].style.display = 'none';
        document.getElementById("tablet-position").value = 50;
    } else {
        positionContainers[1].style.display = 'block';
    }

       }

       
   
      tabletSelectedShape = svgDividers[tabletShapeIndex][tabletDividerDirection].replaceAll('%23000000', '%23' + tabletShapeColor).replaceAll('#', '%23');
      tabletShapeRatio = svgDividers[tabletShapeIndex].ratio;

      if (views[1].classList.contains('active')) {
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

      mobileShapeColor = document.getElementById('mobile-shape-color').value.slice(1);
      mobileDividerDirection = ([...genform.mobiledividerdirection].filter((r) => r.checked)[0] || {}).value;
      mobileLongAxisValue = document.getElementById("mobile-long_axis").value;
      mobileShortAxisValue = document.getElementById("mobile-short_axis").value;
      mobilePositionValue = document.getElementById("mobile-position").value;
      mobileFlipped = document.getElementById('mobile-flipped-checkbox').checked ? true : false;
      
      mobileAnimate = document.getElementById('mobile-animate-checkbox').checked ? true : false;
   mobileAnimLength = document.getElementById('mobile-animation_length').value;
   mobileAnimLongAxis = document.getElementById('mobile-animation_long_axis').value;
   
   if (mobileAnimate){ 
       longAxisContainers[2].style.display = 'none';
       positionContainers[2].style.display = 'none';
       flippedContainers[2].style.display = 'none';
       animationLengthContainers[2].style.display = 'block';
       animationLongAxisContainers[2].style.display = 'block';
       } else {
       longAxisContainers[2].style.display = 'block';
       positionContainers[2].style.display = 'block';
       flippedContainers[2].style.display = 'flex';
       animationLengthContainers[2].style.display = 'none';
       animationLongAxisContainers[2].style.display = 'none';

       if (mobileLongAxisValue < 170){
        positionContainers[2].style.display = 'none';
        document.getElementById("mobile-position").value = 50;
    } else {
        positionContainers[2].style.display = 'block';
    }

    
       }

       

      mobileSelectedShape = svgDividers[mobileShapeIndex][mobileDividerDirection].replaceAll('%23000000', '%23' + mobileShapeColor).replaceAll('#', '%23');
      mobileShapeRatio = svgDividers[mobileShapeIndex].ratio;
      
      if (views[2].classList.contains('active')) {
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

   if (mobileReady) {
      if (views[0].classList.contains('active')) {
         css.innerHTML = shapeDiv;
         previewer.className = 'previewer ' + dividerDirection;

      } else if (views[1].classList.contains('active')) {
         css.innerHTML = tabletShapeDiv;
         previewer.className = 'previewer ' + tabletDividerDirection;

      } else {
         css.innerHTML = mobileShapeDiv;
         previewer.className = 'previewer ' + mobileDividerDirection;

      }
   } else {
      css.innerHTML = shapeDiv;
   }
   
   
             premiumCheck();
   

};

let copyCodeButton = document.getElementById("copye");
let premiumButton = document.getElementById("premium");
let loginButton = document.getElementById("login");

copyCodeButton.addEventListener("click", () => updateURL(false));
copyCodeButton.addEventListener("click", copyCode);


let settingsWindow = document.querySelector('.settings_window');

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


settingsWindow.addEventListener('mouseleave',function(){
    copyCodeButton.innerText = 'Copy code';
});





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
 
 let shareLink = document.getElementById('share');
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
      slider.querySelector("span").innerHTML = event.target.value;
      applyFill(event.target);
   });
   applyFill(slider.querySelector("input"));
});

function applyFill(slider) {
   const percentage = (100 * (slider.value - slider.min)) / (slider.max - slider.min);
   const bg = `linear-gradient(90deg, ${settings.fill} ${percentage}%, ${settings.background} ${percentage + 0.1}%)`;
   slider.style.background = bg;
}

updateShape();

let element = document.createElement('div');

element.classList.add('container');
document.body.appendChild(element);

let hoverHereHint = document.createElement('div');
hoverHereHint.className = 'hover-here-hint';
hoverHereHint.textContent = 'Hover here';
document.body.appendChild(hoverHereHint);

element.addEventListener('mouseenter', function () {
   if (!hoverHereHint) return;
   hoverHereHint.classList.add('is-hidden');

   hoverHereHint.addEventListener('transitionend', function () {
      hoverHereHint.remove();
      hoverHereHint = null;
   }, { once: true });
}, { once: true });

function updatePreview() {

   element.innerHTML = '';
   element.className = 'container';
   if (views[0].classList.contains('active')) {
      element.classList.add(dividerDirection);
   } else if (views[1].classList.contains('active')) {
      element.classList.add(tabletDividerDirection);
   } else {
      element.classList.add(mobileDividerDirection);
   }
   
   svgDividers.forEach((e, i) => {
      let newElement = document.createElement('div');
      newElement.classList.add(e.slug);
      if (e.pro) {
         newElement.classList.add('premium');
      }
      if (views[0].classList.contains('active')) {
         newElement.classList.add(dividerDirection);
         newElement.innerHTML = e[dividerDirection];
      } else if (views[1].classList.contains('active')) {
         newElement.classList.add(tabletDividerDirection);
         newElement.innerHTML = e[tabletDividerDirection];
      } else {
         newElement.classList.add(mobileDividerDirection);
         newElement.innerHTML = e[mobileDividerDirection];
      }

      element.appendChild(newElement);


      newElement.addEventListener('click', updateFormOptionsAndSelectedShapeStyling);
      
      function updateFormOptionsAndSelectedShapeStyling() {
         if (views[0].classList.contains('active')) {
            shapeIndex = i;
         } else if (views[1].classList.contains('active')) {
            tabletShapeIndex = i;
         } else {
            mobileShapeIndex = i;
         }
         document.querySelectorAll('.container div').forEach(e => e.classList.remove('selected'));
         newElement.classList.add('selected');


             premiumCheck();
         
         
         if (views[0].classList.contains('active')) {
            if (e.ratio){
         document.getElementById('animation_long_axis').value = 3;
         document.getElementById('animation_long_axis').setAttribute('max','4');
         } else {
         document.getElementById('animation_long_axis').value = 4;
         document.getElementById('animation_long_axis').setAttribute('max','10');
         }
         } else if (views[1].classList.contains('active')) {
         if (e.ratio){
         document.getElementById('tablet-animation_long_axis').value = 3;
         document.getElementById('tablet-animation_long_axis').setAttribute('max','4');
         } else {
         document.getElementById('tablet-animation_long_axis').value = 4;
         document.getElementById('tablet-animation_long_axis').setAttribute('max','10');
         }
         } else {
         if (e.ratio){
         document.getElementById('mobile-animation_long_axis').value = 3;
         document.getElementById('mobile-animation_long_axis').setAttribute('max','4');
         } else {
         document.getElementById('mobile-animation_long_axis').value = 4;
         document.getElementById('mobile-animation_long_axis').setAttribute('max','10');
         }
         }
         sliders.forEach((e,i) =>{
   e.querySelector("span").innerHTML = e.querySelector("input").value;
   applyFill(e.querySelector("input"));
    });

         updateShape();
      };
      
      
   });

}

updatePreview();

document.querySelector('.container div').classList.add('selected');

function updateSelectedShape() {
   document.querySelectorAll('.container div').forEach(e => e.classList.remove('selected'));
   if (views[0].classList.contains('active')) {
      document.querySelectorAll('.container div')[shapeIndex].classList.add('selected');
   } else if (views[1].classList.contains('active')) {
      document.querySelectorAll('.container div')[tabletShapeIndex].classList.add('selected');
   } else {
      document.querySelectorAll('.container div')[mobileShapeIndex].classList.add('selected');
   }
}

directionEntry.forEach((e, i) => {
   e.onchange = function() {
      updatePreview();
      updateSelectedShape();
   };
});

let preview = document.querySelector('.preview');
    preview.addEventListener('mouseenter',function(){
        jQuery('.settings_window').fadeOut('quick');
    });
    preview.addEventListener('mouseleave',function(){
        jQuery('.settings_window').fadeIn('quick');
    });

let formElement = document.querySelector('.elementor-form');
let formCreatedShape = document.getElementById('form-field-createdshape');
let formSi = document.getElementById('form-field-si');
let formTsi = document.getElementById('form-field-tsi');
let formMsi = document.getElementById('form-field-msi');
let formMobileReady = document.getElementById('form-field-mobileready');
let formAnimated = document.getElementById('form-field-animated');


function formUpdate(){
    formCreatedShape.value = location.href;
    formSi.value = svgDividers[shapeIndex].si;
    formTsi.value = svgDividers[tabletShapeIndex].si;
    formMsi.value = svgDividers[mobileShapeIndex].si;
    formMobileReady.value = mobileReady;
    formAnimated.value = animate || (mobileReady && (tabletAnimate || mobileAnimate));
    jQuery('.elementor-button[type="submit"]').click();
}



copyCodeButton.addEventListener("click", formUpdate);

}

(function bootShapeDividersApp() {
    if (typeof svgDividers !== 'undefined') {
        initShapeDividersApp();
        return;
    }

    const existingShapesScript = document.querySelector('script[data-shapedividers-shapes]');

    if (existingShapesScript) {
        if (existingShapesScript.dataset.loaded === 'true') {
            initShapeDividersApp();
        } else {
            existingShapesScript.addEventListener('load', initShapeDividersApp, { once: true });
        }
        return;
    }

    const shapesScript = document.createElement('script');
    shapesScript.src = '/wp-content/uploads/shapes.js';
    shapesScript.dataset.shapedividersShapes = 'true';

    shapesScript.addEventListener('load', function () {
        shapesScript.dataset.loaded = 'true';

        if (typeof svgDividers === 'undefined') {
            console.error('ShapeDividers: shapes.js loaded, but svgDividers is still unavailable.');
            return;
        }

        initShapeDividersApp();
    }, { once: true });

    shapesScript.addEventListener('error', function () {
        console.error('ShapeDividers: failed to load /wp-content/uploads/shapes.js');
    }, { once: true });

    document.head.appendChild(shapesScript);
})();
