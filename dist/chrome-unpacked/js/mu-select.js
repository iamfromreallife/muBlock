/* Material-like accessible dropdowns, maintaining Lite's original select events. */
const enhancedSelects=new Set();let selectSequence=0;
function enhanceMuSelect(native){
 if(!native||native.multiple||native.dataset.muEnhanced)return;
 native.dataset.muEnhanced='true';
 const wrapper=document.createElement('span');wrapper.className='mu-select-wrap';
 native.before(wrapper);wrapper.append(native);
 const trigger=document.createElement('button');trigger.className='mu-select-trigger';trigger.type='button';
 trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');
 trigger.setAttribute('aria-expanded','false');
 const menuId='mu-select-menu-'+(++selectSequence);
 trigger.setAttribute('aria-controls',menuId);
 const label=document.createElement('span');label.className='mu-select-value';
 const arrow=document.createElement('span');arrow.className='mu-select-chevron';
 arrow.setAttribute('aria-hidden','true');
 arrow.innerHTML='<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>';
 trigger.append(label,arrow);wrapper.append(trigger);
 native.classList.add('mu-native-select');native.tabIndex=-1;native.setAttribute('aria-hidden','true');
 const ownerLabel=native.id?document.querySelector('label[for="'+native.id+'"]'):null;
 trigger.setAttribute('aria-label',ownerLabel?.textContent.trim()||
   native.getAttribute('aria-label')||native.name||'Select');
 ownerLabel?.addEventListener('click',e=>{e.preventDefault();trigger.focus();});
 const menu=document.createElement('div');menu.id=menuId;
 menu.className='mu-select-menu';menu.setAttribute('role','listbox');menu.hidden=true;
 document.body.append(menu);
 const state={trigger,menu,opened:false,entries:[]};enhancedSelects.add(state);
 function sync(){
   label.textContent=native.selectedOptions?.[0]?.textContent.trim()||'';
   trigger.disabled=native.disabled;
   if(state.opened){
     for(const {option,element} of state.entries){
       element.classList.toggle('selected',option.selected);
       element.setAttribute('aria-selected',String(option.selected));
     }
   }
 }
 function choose(option){
   if(option.disabled)return;
   native.value=option.value;
   native.dispatchEvent(new Event('input',{bubbles:true}));
   native.dispatchEvent(new Event('change',{bubbles:true}));
   close(true);sync();
 }
 function build(){
   state.entries=[];const content=document.createDocumentFragment();
   function addOption(option){
     const element=document.createElement('button');element.type='button';
     element.className='mu-select-option';element.setAttribute('role','option');
     element.id=menuId+'-item-'+state.entries.length;
     element.textContent=option.textContent.trim();element.tabIndex=-1;
     element.disabled=option.disabled;
     element.setAttribute('aria-selected',String(option.selected));
     element.classList.toggle('selected',option.selected);
     element.addEventListener('click',()=>choose(option));
     state.entries.push({option,element});content.append(element);
   }
   for(const child of native.children){
     if(child.tagName==='OPTION')addOption(child);
     if(child.tagName==='OPTGROUP'){
       const group=document.createElement('div');group.className='mu-select-group';
       group.setAttribute('role','presentation');group.textContent=child.label;
       content.append(group);
       for(const option of child.children)if(option.tagName==='OPTION')addOption(option);
     }
   }
   menu.replaceChildren(content);
 }
 function layout(){
   const rect=trigger.getBoundingClientRect();
   const width=Math.min(innerWidth-24,Math.max(rect.width,420));
   menu.style.width=Math.max(180,width)+'px';
   menu.style.maxHeight=Math.max(160,Math.floor(innerHeight*.65))+'px';
   menu.style.left=Math.max(12,Math.min(rect.left,innerWidth-width-12))+'px';
   const height=menu.getBoundingClientRect().height;
   const above=rect.top-10,below=innerHeight-rect.bottom-10;
   menu.style.top=(height>below&&above>below?
     Math.max(10,rect.top-height-5):Math.max(10,rect.bottom+5))+'px';
 }
 function focusOption(index){
   const valid=state.entries.filter(x=>!x.element.disabled);
   if(!valid.length)return;
   const item=valid[(index+valid.length)%valid.length];
   item.element.focus();item.element.scrollIntoView({block:'nearest'});
 }
 function close(focus=false){
   state.opened=false;menu.hidden=true;trigger.setAttribute('aria-expanded','false');
   if(focus)trigger.focus();
 }
 function open(start='selected'){
   if(native.disabled)return;
   for(const other of enhancedSelects)if(other!==state&&other.opened){
     other.menu.hidden=true;other.opened=false;other.trigger.setAttribute('aria-expanded','false');
   }
   build();state.opened=true;menu.hidden=false;
   trigger.setAttribute('aria-expanded','true');sync();layout();
   const index=state.entries.findIndex(x=>x.option.selected);
   if(start==='first')focusOption(0);
   else if(start==='last')focusOption(state.entries.filter(x=>!x.element.disabled).length-1);
   else focusOption(index<0?0:index);
 }
 trigger.addEventListener('click',()=>state.opened?close():open());
 trigger.addEventListener('keydown',e=>{
   if(['ArrowDown','Enter',' '].includes(e.key)){
     e.preventDefault();open(e.key==='ArrowDown'?'first':'selected');
   }else if(e.key==='ArrowUp'){e.preventDefault();open('last');}
   else if(e.key==='Escape')close();
 });
 menu.addEventListener('keydown',e=>{
   const valid=state.entries.filter(x=>!x.element.disabled);
   const index=valid.findIndex(x=>x.element===document.activeElement);
   if(e.key==='Escape'){e.preventDefault();close(true);return;}
   if(e.key==='Tab'){close();return;}
   if(e.key==='ArrowDown'){e.preventDefault();focusOption(index+1);}
   if(e.key==='ArrowUp'){e.preventDefault();focusOption(index-1);}
   if(e.key==='Home'){e.preventDefault();focusOption(0);}
   if(e.key==='End'){e.preventDefault();focusOption(valid.length-1);}
 });
 document.addEventListener('pointerdown',e=>{
   if(state.opened&&!menu.contains(e.target)&&!trigger.contains(e.target))close();
 },{capture:true});
 window.addEventListener('resize',()=>{if(state.opened)layout();});
 window.addEventListener('scroll',()=>{if(state.opened)layout();},true);
 native.addEventListener('change',sync);
 new MutationObserver(()=>{sync();if(state.opened){build();layout();}}).observe(native,{
   subtree:true,childList:true,characterData:true,attributes:true,
   attributeFilter:['disabled','label','selected']
 });
 sync();
}
for(const select of document.querySelectorAll('select:not([multiple])'))enhanceMuSelect(select);
new MutationObserver(records=>{
 for(const record of records)for(const node of record.addedNodes){
   if(node.nodeType!==Node.ELEMENT_NODE)continue;
   if(node.matches?.('select:not([multiple])'))enhanceMuSelect(node);
   node.querySelectorAll?.('select:not([multiple])').forEach(enhanceMuSelect);
 }
}).observe(document.body,{childList:true,subtree:true});
