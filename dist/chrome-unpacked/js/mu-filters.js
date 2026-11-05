/*
 * muBlock custom filters. Two separate original Lite stores:
 * - picker-generated cosmetics in an editable text area;
 * - sandbox filters in Lite's original CodeMirror 6 editor.
 * Search never rewrites or loses the complete editable filter contents.
 */
import { browser,sendMessage } from './ext.js';
import { FilterEditor } from './filter-editor.js';
import * as sfp from './static-filtering-parser.js';
import punycode from './punycode.js';

const pane=document.querySelector('#mu-filters');
const sandbox=pane?.querySelector('#sandboxEditor');
const tr=key=>chrome.i18n.getMessage(key)||key;
const pt=(chrome.i18n.getUILanguage()||'en').toLowerCase().startsWith('pt');
const t=pt?{
 invalid:'Linha %: filtro cosmético inválido ou não suportado.',
 host:'Linha %: indique um domínio válido.',
 saved:'Filtros guardados.',reverted:'Alterações revertidas.',
 changed:'Alterações por guardar.',external:'Os filtros foram alterados noutra janela. Reverta antes de guardar.',
 imported:'Filtros anexados. Prima Guardar para aplicar.',
 empty:'Não existem filtros para exportar.',error:'Erro ao guardar os filtros.',
 search:'Pesquisar filtros…',matches:'resultados',none:'Nenhum filtro encontrado.'
}:{
 invalid:'Line %: invalid or unsupported cosmetic filter.',
 host:'Line %: a valid hostname is required.',
 saved:'Filters saved.',reverted:'Changes reverted.',
 changed:'Unsaved changes.',external:'Filters changed in another window. Revert before saving.',
 imported:'Filters appended. Select Save to apply.',
 empty:'There are no filters to export.',error:'Unable to save filters.',
 search:'Search filters…',matches:'results',none:'No matching filters.'
};

if(pane&&sandbox&&!pane.querySelector('#mu-site-textarea')){
 let ready=false,saving=false,conflict=false,saved='',original=[],sandboxEditor=null;
 const site=document.createElement('section');site.className='mu-editor-panel mu-site-filters';
 const title=document.createElement('h2');title.textContent=tr('customFiltersPageName');
 site.append(title);
 const searchGroup=document.createElement('div');searchGroup.className='mu-site-search';
 const search=document.createElement('input');search.id='mu-site-search';search.type='search';
 search.placeholder=t.search;search.autocomplete='off';search.spellcheck=false;
 search.setAttribute('aria-label',t.search);
 const counter=document.createElement('span');counter.id='mu-site-search-count';
 counter.setAttribute('role','status');counter.setAttribute('aria-live','polite');
 searchGroup.append(search,counter);site.append(searchGroup);
 const box=document.createElement('textarea');box.id='mu-site-textarea';box.rows=22;box.spellcheck=false;
 box.setAttribute('aria-label',title.textContent);
 box.placeholder=tr('customFiltersImportTextareaPlaceholder');
 const results=document.createElement('div');results.id='mu-site-search-results';
 results.className='mu-filtered-editor';results.hidden=true;
 const resultsOverlay=document.createElement('pre');resultsOverlay.id='mu-filtered-highlight';
 resultsOverlay.setAttribute('aria-hidden','true');
 const resultsText=document.createElement('textarea');resultsText.id='mu-filtered-textarea';
 resultsText.spellcheck=false;resultsText.wrap='soft';resultsText.rows=22;
 resultsText.setAttribute('aria-label',t.search);
 results.append(resultsOverlay,resultsText);site.append(box,results);
 const toolbar=document.createElement('div');toolbar.className='mu-site-actions';
 function button(id,key,callback,extra=''){
   const b=document.createElement('button');b.type='button';b.id=id;
   b.className='mu-button '+extra;b.textContent=tr(key);b.addEventListener('click',callback);
   toolbar.append(b);return b;
 }
 const saveBtn=button('mu-site-save','saveButton',saveSite,'mu-button-primary');
 const revertBtn=button('mu-site-revert','revertButton',revertSite,'mu-button-quiet');
 const importBtn=button('mu-site-import','importAndAppendButton',()=>file.click());
 const exportBtn=button('mu-site-export','exportButton',exportSite);
 const file=document.createElement('input');file.type='file';file.accept='.txt,text/plain';
 file.hidden=true;file.addEventListener('change',importSite);toolbar.append(file);
 site.append(toolbar);
 const status=document.createElement('p');status.id='mu-site-status';status.setAttribute('role','status');
 status.setAttribute('aria-live','polite');site.append(status);

 const sandPanel=document.createElement('section');sandPanel.className='mu-editor-panel mu-sandbox-panel';
 const sandTitle=document.createElement('h2');sandTitle.id='mu-sandbox-heading';
 sandTitle.textContent=tr('sandboxEditorLabel');sandPanel.append(sandTitle);
 const note=document.createElement('p');note.className='mu-editor-note';
 note.textContent=tr('sandboxEditorUserScriptsInfo').replaceAll('uBO Lite','muBlock');
 sandPanel.append(note,sandbox);pane.prepend(site,sandPanel);

 const pretty=s=>{if(!s.startsWith('{'))return s;try{return JSON.parse(s).raw||s;}catch{return s;}};
 const ORDER_KEY='muBlockSiteFilterOrderV1';
 let recentOrder=null;
 const idFor=(host,selector)=>JSON.stringify([host,selector]);
 const flatten=entries=>entries.flatMap(([host,selectors])=>selectors.map(selector=>({
   id:idFor(host,selector),line:punycode.toUnicode(host)+'##'+pretty(selector)
 })));
 const displayed=(entries,order=recentOrder)=>{
   const flat=flatten(entries);
   if(!Array.isArray(order))return flat.map(entry=>entry.line).join('\n');
   const present=new Map(flat.map(entry=>[entry.id,entry.line]));
   return order.filter(id=>present.has(id)).map(id=>present.get(id)).join('\n');
 };
 async function syncOrder(entries,addedManually=[]){
   const keys=flatten(entries).map(x=>x.id),live=new Set(keys);
   if(recentOrder===null){
     const data=await browser.storage.local.get(ORDER_KEY);
     recentOrder=Array.isArray(data?.[ORDER_KEY])?data[ORDER_KEY]:null;
   }
   // Keep known identifiers across Lite's temporary removeAll/addMany during
   // a backup restore. Only present filters are displayed, so stale IDs never
   // appear in the editor or affect its backing store.
   const old=Array.isArray(recentOrder)?recentOrder.slice():[];
   const known=new Set(old);
   // Lite does not provide historical creation timestamps. New picker rules
   // are placed first while older records keep their saved presentation order.
   const fresh=keys.filter(id=>!known.has(id)).reverse();
   const manual=addedManually.map(([h,s])=>idFor(h,s)).reverse();
   const manualSet=new Set(manual);
   recentOrder=[...manual,...fresh.filter(id=>!manualSet.has(id)),
                ...old.filter(id=>!manualSet.has(id))];
   await browser.storage.local.set({[ORDER_KEY]:recentOrder});
 }
 const clone=entries=>entries.map(([h,a])=>[h,a.slice()]);
 const message=(value,error=false)=>{
   status.textContent=value;status.classList.toggle('mu-editor-error',error);
 };
 const dirty=()=>box.value.replace(/\r\n/g,'\n').trimEnd()!==saved.trimEnd();
 function buttons(){
   saveBtn.disabled=!ready||saving||conflict||!dirty();
   revertBtn.disabled=!ready||saving||(!dirty()&&!conflict);
   importBtn.disabled=!ready||saving;exportBtn.disabled=!ready||saving;
   box.disabled=!ready||saving;
   if(dirty()&&!conflict)message(t.changed);
   else if(status.textContent===t.changed)message('');
 }

 // Live search is a real editable textarea: matching complete lines, one per
 // line. Edits are merged back into the full source without losing unshown
 // filters, and Save/Revert continue to use Lite's original storage mechanism.
 let matchedIndexes=[];
 function syncHighlights(){
   const query=search.value.trim();
   const text=resultsText.value, lo=text.toLocaleLowerCase(), needle=query.toLocaleLowerCase();
   const frag=document.createDocumentFragment();
   let offset=0,hit;
   if(needle){
     while((hit=lo.indexOf(needle,offset))!==-1){
       frag.append(document.createTextNode(text.slice(offset,hit)));
       const mark=document.createElement('mark');
       mark.textContent=text.slice(hit,hit+query.length);
       frag.append(mark);offset=hit+query.length;
     }
   }
   frag.append(document.createTextNode(text.slice(offset)));
   // Final newlines must stay visible in the overlay.
   if(text.endsWith('\n'))frag.append(document.createTextNode('\u200b'));
   resultsOverlay.replaceChildren(frag);
   resultsOverlay.scrollTop=resultsText.scrollTop;
   resultsOverlay.scrollLeft=resultsText.scrollLeft;
 }
 function renderSearch(){
   const query=search.value.trim().toLocaleLowerCase();
   const filtering=query.length>0;
   box.hidden=filtering;results.hidden=!filtering;
   if(!filtering){
     counter.textContent='';matchedIndexes=[];
     resultsText.value='';resultsOverlay.replaceChildren();
     return;
   }
   const matches=[];
   const lines=box.value.replace(/\r\n/g,'\n').split('\n');
   for(let i=0;i<lines.length;i++){
     if(lines[i].toLocaleLowerCase().includes(query)){
       matches.push({index:i,text:lines[i]});
     }
   }
   matchedIndexes=matches.map(x=>x.index);
   resultsText.value=matches.map(x=>x.text).join('\n');
   resultsText.placeholder=matches.length?'' : t.none;
   resultsText.disabled=!ready||saving;
   counter.textContent=matches.length+' '+t.matches;
   syncHighlights();
 }
 function mergeFilteredEdit(){
   if(!ready||saving)return;
   const full=box.value.replace(/\r\n/g,'\n').split('\n');
   const edited=resultsText.value===''?[]:resultsText.value.replace(/\r\n/g,'\n').split('\n');
   const matched=new Set(matchedIndexes);
   const merged=[],nextIndexes=[];
   let used=0;
   // Reconcile all matching lines in source order, leaving every unmatched
   // source line in place. Even deletions in the filtered view cannot delete
   // a nonmatching filter.
   for(let i=0;i<full.length;i++){
     if(matched.has(i)){
       if(used<edited.length){
         nextIndexes.push(merged.length);
         merged.push(edited[used++]);
       }
     }else{
       merged.push(full[i]);
     }
   }
   // New lines in a filtered view are appended without moving or erasing
   // unrelated source lines. An initially empty match view can add rules too.
   while(used<edited.length){
     nextIndexes.push(merged.length);
     merged.push(edited[used++]);
   }
   box.value=merged.join('\n');
   matchedIndexes=nextIndexes;
   buttons();
   syncHighlights();
 }
 search.addEventListener('input',renderSearch);
 resultsText.addEventListener('input',mergeFilteredEdit);
 resultsText.addEventListener('scroll',syncHighlights,{passive:true});
 resultsText.addEventListener('keydown',e=>{
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){
     e.preventDefault();saveSite();
   }
 });
 async function loadSite(force=false){
   if(saving)return;
   const data=await sendMessage({what:'getAllCustomFilters'});
   if(!Array.isArray(data))throw Error('Invalid site-filter response');
   await syncOrder(data);
   const text=displayed(data);
   if(!force&&ready&&dirty()){
     if(text!==saved){conflict=true;message(t.external,true);buttons();}
     return;
   }
   original=clone(data);saved=text;box.value=text;ready=true;conflict=false;
   message('');buttons();renderSearch();
 }
 function revertSite(){
   box.value=saved;conflict=false;buttons();message(t.reverted);
   renderSearch();loadSite(true).catch(e=>message(String(e),true));
 }
 function parseAll(raw){
   const existing=new Map();
   for(const [h,selectors] of original)for(const selector of selectors){
     const line=punycode.toUnicode(h)+'##'+pretty(selector);
     const entries=existing.get(line)||[];entries.push([h,selector]);existing.set(line,entries);
   }
   const parser=new sfp.AstFilterParser({nativeCssHas:true,trustedSource:true});
   const result=new Map();
   for(const [i,src] of raw.replace(/\r\n/g,'\n').split('\n').entries()){
     const line=src.trim();if(!line)continue;
     let newPairs=[];
     if(existing.get(line)?.length)newPairs=[existing.get(line).shift()];
     else {
       parser.parse(line);
       if(parser.hasError()||parser.isException()||!parser.isCosmeticFilter()||
          typeof parser.result.compiled!=='string'||!parser.result.compiled)
         throw Error(t.invalid.replace('%',i+1));
       for(const {hn,bad,not} of parser.getExtFilterDomainIterator()){
         if(!hn||bad||not||hn.includes('/')||hn.includes('*'))
           throw Error(t.host.replace('%',i+1));
         newPairs.push([hn,parser.result.compiled]);
       }
       if(!newPairs.length)throw Error(t.host.replace('%',i+1));
     }
     for(const [h,selector] of newPairs){
       const set=result.get(h)||new Set();set.add(selector);result.set(h,set);
     }
   }
   return [...result].map(([h,selectors])=>[h,[...selectors]]);
 }
 async function saveSite(){
   if(!ready||saving||conflict)return;
   let proposed;
   try{proposed=parseAll(box.value);}catch(e){message(e.message,true);return;}
   const before=clone(original);
   const oldMap=new Map(before.map(([h,a])=>[h,new Set(a)]));
   const newMap=new Map(proposed.map(([h,a])=>[h,new Set(a)]));
   const add=[],remove=[];
   for(const [h,set] of newMap){
     const old=oldMap.get(h)||new Set(),delta=[...set].filter(s=>!old.has(s));
     if(delta.length)add.push([h,delta]);
   }
   for(const [h,set] of oldMap){
     const after=newMap.get(h)||new Set(),delta=[...set].filter(s=>!after.has(s));
     if(delta.length)remove.push([h,delta]);
   }
   saving=true;buttons();
   try{
     for(const [hostname,selectors] of add)
       await sendMessage({what:'addCustomFilters',hostname,selectors});
     for(const [hostname,selectors] of remove)
       await sendMessage({what:'removeCustomFilters',hostname,selectors});
     original=clone(proposed);
     await syncOrder(original,add.flatMap(([h,ss])=>ss.map(s=>[h,s])));
     saved=displayed(original);box.value=saved;message(t.saved);renderSearch();
   } catch(e){
     try{
       await sendMessage({what:'removeAllCustomFilters',hostname:'*'});
       if(before.length)await sendMessage({what:'addManyCustomFilters',entries:before});
     }catch(rollback){console.error('Restoring site filters failed:',rollback);}
     conflict=true;message(t.error+' '+String(e),true);
   }finally{saving=false;buttons();}
 }
 async function importSite(){
   const incoming=file.files?.[0];file.value='';if(!incoming||!ready)return;
   if(incoming.size>8*1024*1024){message(t.error,true);return;}
   try{
     box.value=[box.value.trimEnd(),(await incoming.text()).trim()].filter(Boolean).join('\n');
     buttons();renderSearch();message(t.imported);
   }catch(e){message(t.error+' '+String(e),true);}
 }
 function exportSite(){
   if(!box.value.trim()){message(t.empty);return;}
   const blob=new Blob([box.value.trim()+'\n'],{type:'text/plain;charset=utf-8'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='muBlock-site-filters.txt';a.click();
   setTimeout(()=>URL.revokeObjectURL(url),1200);
 }
 box.addEventListener('input',()=>{buttons();renderSearch();});
 box.addEventListener('keydown',e=>{
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){
     e.preventDefault();saveSite();
   }
 });
 class SandboxEditor extends FilterEditor{
   async loadContent(){
     const text=await sendMessage({what:'getSandboxFilters'});
     await super.loadContent(typeof text==='string'?text:'');
   }
   async saveContent(){
     if(!this.contentChanged())return;
     await sendMessage({what:'setSandboxFilters',text:this.getContent()});
     await super.saveContent();
   }
 }
 let started=false;
 async function start(){
   if(started)return;started=true;
   try{
     sandboxEditor=new SandboxEditor(sandbox.querySelector('.cm-container'));
     await Promise.all([sandboxEditor.loadContent(),loadSite(true)]);
   }catch(e){started=false;message(t.error+' '+String(e),true);}
 }
 const onPane=()=>{if(document.body.dataset.pane==='filters')start();};
 new MutationObserver(onPane).observe(document.body,{attributes:true,attributeFilter:['data-pane']});
 onPane();
 browser.storage.local.onChanged.addListener((changes,area)=>{
   if(area!==undefined&&area!=='local')return;
   if(Object.keys(changes).some(k=>k.startsWith('site.'))&&!saving)
     loadSite().catch(e=>message(String(e),true));
   if(changes.sandboxFilters&&sandboxEditor&&!sandboxEditor.contentChanged())
     sandboxEditor.loadContent().catch(console.error);
 });
}
