/* Compact, localized muBlock popup; the original Lite popup.js owns filtering. */
import { muGetMessage, capitalizeFirstLetter } from './mu-language.js';
const main=document.querySelector('main');
const slider=document.querySelector('.filteringModeSlider');
const hostname=document.querySelector('#hostname');
const tr=key=>muGetMessage(key)||key;
const paths=[
 '<circle cx="12" cy="12" r="9"/><path d="M5 5l14 14"/>',
 '<path d="M12 3 20 6v6c0 5-3 8-8 10-5-2-8-5-8-10V6z"/>',
 '<path d="m12 2 9 4v6c0 5-4 8.5-9 10-5-1.5-9-5-9-10V6z"/><path d="m8.3 12 2.5 2.5 5-5.3"/>',
 '<path d="m12 2 9 4v6c0 5-4 8.5-9 10-5-1.5-9-5-9-10V6z"/><path d="m9 12 2 2 4.5-4.5"/><path d="M8 17h8"/>'
];
const icon=path=>'<span class="mu-icon"><svg viewBox="0 0 24 24" aria-hidden="true">'+path+'</svg></span>';
if(main&&slider&&hostname&&!document.querySelector('#mu-sitebar')){
 const header=document.createElement('header');header.id='mu-popup-header';
 const brand=document.createElement('span');brand.className='mu-pop-brand';
 brand.innerHTML='<img src="img/mu-logo.svg" alt=""><span>muBlock</span>';
 const controls=document.createElement('div');controls.className='mu-header-actions';
 for(const id of ['gotoMatchedRules']){
   const el=document.getElementById(id);
   if(el){
     el.classList.add('mu-header-tool');el.setAttribute('role','button');
     el.setAttribute('aria-label',id==='gotoDashboard'?tr('popupTipDashboard'):el.title||id);
     controls.append(el);
   }
 }
 header.append(brand,controls);main.prepend(header);
 const sitebar=document.createElement('div');sitebar.id='mu-sitebar';
 const power=document.createElement('button');power.id='mu-power';power.type='button';
 power.innerHTML=icon('<path d="M12 2v10"/><path d="M6.35 5.7A9 9 0 1 0 17.65 5.7"/>');
 sitebar.append(hostname,power);header.after(sitebar);
 const panel=document.createElement('section');panel.id='mu-modes-wrap';
 const heading=document.createElement('div');heading.className='mu-section-title';
 heading.textContent=capitalizeFirstLetter(tr('popupFilteringModeLabel'));
 const modes=document.createElement('div');modes.id='mu-mode-buttons';
 modes.setAttribute('role','group');modes.setAttribute('aria-label',heading.textContent);
 const buttons=[];
 for(let i=0;i<4;i++){
   const label=tr('filteringMode'+i+'Name');
   const b=document.createElement('button');b.type='button';b.className='mu-mode-btn';
   b.dataset.level=String(i);b.title=label;b.setAttribute('aria-label',label);
   b.setAttribute('aria-pressed','false');
   b.innerHTML=icon(paths[i]);
   const text=document.createElement('span');text.className='mu-mode-name';text.textContent=label;
   b.append(text);
   b.addEventListener('click',()=>select(i));
   modes.append(b);buttons.push(b);
 }
 panel.append(heading,modes);slider.before(panel);

 // Keep the original Lite Settings control and its existing click handler.
 // Only move its DOM node into a dedicated footer, after the website tools.
 const footer=document.createElement('section');footer.id='mu-popup-footer';
 const version=document.createElement('span');version.id='mu-popup-footer-version';
 version.textContent='muBlock - based on uBlock Origin Lite '+
   chrome.runtime.getManifest().version;
 footer.append(version);
 const settings=document.getElementById('gotoDashboard');
 if(settings){
   settings.classList.add('mu-footer-settings');
   settings.setAttribute('role','button');
   settings.setAttribute('aria-label',tr('popupTipDashboard'));
   footer.append(settings);
 }
 main.append(footer);

 // Per-site cosmetic CSS filtering switch. It uses a real persisted
 // background rule; network blocking and site filtering mode are unchanged.
 const localTools=document.querySelector('.toolMenu.localTools');
 const unpicker=document.getElementById('gotoUnpicker');
 if(localTools&&unpicker&&!document.getElementById('mu-cosmetic-toggle')){
   const cosmetic=document.createElement('button');
   cosmetic.id='mu-cosmetic-toggle';
   cosmetic.type='button';
   cosmetic.className='tool enabled';
   cosmetic.setAttribute('role','switch');
   cosmetic.setAttribute('aria-checked','false');
   cosmetic.setAttribute('aria-label',tr('muDisableCosmeticFiltering'));
   cosmetic.innerHTML=icon(
     '<path d="M3 3l18 18"/><path d="M10.6 5.2A10.5 10.5 0 0 1 12 5c4.7 0 8.4 3 10 7a12 12 0 0 1-3.2 4.4"/><path d="M6.3 6.3A12 12 0 0 0 2 12c1.6 4 5.3 7 10 7a10 10 0 0 0 3.7-.6"/><path d="M9.7 9.7a3.2 3.2 0 0 0 4.6 4.6"/>'
   );
   const label=document.createElement('span');
   label.className='mu-cosmetic-label';
   label.textContent=tr('muDisableCosmeticFiltering');
   const status=document.createElement('span');
   status.className='mu-cosmetic-check';
   status.setAttribute('aria-hidden','true');
   status.textContent='✓';
   cosmetic.append(label,status);
   unpicker.after(cosmetic);

   let tabId=null,site='',isDisabled=false,pending=false;
   function renderCosmetic(){
     cosmetic.disabled=pending||!site;
     cosmetic.setAttribute('aria-checked',String(isDisabled));
     cosmetic.classList.toggle('mu-cosmetic-active',isDisabled);
     cosmetic.title=isDisabled
       ? tr('muCosmeticDisabledForSite')
       : tr('muDisableCosmeticFiltering');
   }
   async function loadCosmetic(){
     try{
       const [tab]=await chrome.tabs.query({
         active:true,currentWindow:true
       });
       if(!tab||typeof tab.id!=='number')return;
       const url=new URL(tab.url||'');
       if(!/^https?:$/.test(url.protocol)||!url.hostname)return;
       tabId=tab.id;
       site=url.hostname;
       pending=true;renderCosmetic();
       isDisabled=Boolean(await chrome.runtime.sendMessage({
         what:'muGetCosmeticFiltering',hostname:site
       }));
     }catch(reason){
       console.error('muBlock: cosmetic exception lookup failed',reason);
       site='';
     }finally{
       pending=false;renderCosmetic();
     }
   }
   cosmetic.addEventListener('click',async()=>{
     if(pending||!site)return;
     pending=true;renderCosmetic();
     try{
       const result=await chrome.runtime.sendMessage({
         what:'muSetCosmeticFiltering',hostname:site,disabled:!isDisabled
       });
       if(!result||typeof result.disabled!=='boolean'){
         throw new Error('Could not save the site cosmetic rule');
       }
       const changed=result.disabled!==isDisabled;
       isDisabled=result.disabled;
       if(changed&&Number.isInteger(tabId)){
         await chrome.tabs.reload(tabId);
       }
     }catch(reason){
       console.error('muBlock: cosmetic exception update failed',reason);
       cosmetic.title=tr('muCosmeticRuleError');
     }finally{
       pending=false;renderCosmetic();
     }
   });
   renderCosmetic();
   loadCosmetic();
 }

 let active=null,last=2;
 function select(n){
   if(document.body.classList.contains('busy')||document.body.classList.contains('nodata'))return;
   slider.querySelector('span[data-level="'+n+'"]')?.click();
 }
 function sync(){
   const n=Number.parseInt(slider.dataset.level,10),valid=Number.isInteger(n)&&n>=0&&n<=3;
   const disabled=document.body.classList.contains('nodata');
   if(valid){active=n;if(n>0)last=n;}
   power.disabled=!valid||disabled;
   power.classList.toggle('off',!valid||n===0);
   power.setAttribute('aria-pressed',String(valid&&n!==0));
   power.setAttribute('aria-label',tr('filteringMode'+(valid&&n!==0?0:last)+'Name'));
   power.title=power.getAttribute('aria-label');
   for(let i=0;i<4;i++){
     buttons[i].disabled=!valid||disabled;
     buttons[i].setAttribute('aria-pressed',String(valid&&i===n));
   }
 }
 power.addEventListener('click',()=>{if(!power.disabled&&active!==null)select(active===0?last:0);});
 // Lite can populate the no-website message after muBlock draws the popup.
 // Capitalize its first actual letter in every language, without altering
 // legitimate site hostnames or changing Lite's popup initialization logic.
 function titleCaseNoWebsite() {
   if(!document.body.classList.contains('nodata')) return;
   const message=capitalizeFirstLetter(tr('popupNoWebsite'));
   if(hostname.textContent!==message)hostname.textContent=message;
 }
 new MutationObserver(titleCaseNoWebsite).observe(
   hostname,{childList:true,characterData:true,subtree:true}
 );
 new MutationObserver(titleCaseNoWebsite).observe(
   document.body,{attributes:true,attributeFilter:['class']}
 );
 titleCaseNoWebsite();
 new MutationObserver(sync).observe(slider,{attributes:true,attributeFilter:['data-level']});
 new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
 sync();
}
