/* Sync CSS track fill with actual native slider values. No animations. */
const sliders = new WeakSet();
function attachMaterialSlider(slider) {
  if(sliders.has(slider))return;
  sliders.add(slider);
  const sync=()=>{
    const min=Number(slider.min||0),max=Number(slider.max||100),value=Number(slider.value);
    const percent=max>min&&Number.isFinite(value)
      ? Math.max(0,Math.min(100,100*(value-min)/(max-min))) : 0;
    slider.style.setProperty('--mu-range-progress',percent.toFixed(3)+'%');
  };
  slider.addEventListener('input',sync);
  slider.addEventListener('change',sync);
  new MutationObserver(sync).observe(slider,{
    attributes:true,attributeFilter:['min','max','value','disabled']
  });
  sync();
}
document.querySelectorAll('input[type="range"]').forEach(attachMaterialSlider);
new MutationObserver(records=>{
  for(const record of records){
    for(const node of record.addedNodes){
      if(node.nodeType!==Node.ELEMENT_NODE)continue;
      if(node.matches?.('input[type="range"]'))attachMaterialSlider(node);
      node.querySelectorAll?.('input[type="range"]').forEach(attachMaterialSlider);
    }
  }
}).observe(document.documentElement,{childList:true,subtree:true});
