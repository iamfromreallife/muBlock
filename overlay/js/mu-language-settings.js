/* muBlock extension UI language preference.
 * The original Lite settings and service-worker configuration remain intact.
 * The original native select is retained by muBlock's dropdown styling.
 */
import {
  LANGUAGE_KEY, availableLocales, selectedLanguage, activeLocale, muGetMessage
} from './mu-language.js';

const behaviorHeading=document.querySelector(
  'section[data-pane="settings"] h3[data-i18n="behaviorSectionLabel"]'
);
if(behaviorHeading && !document.getElementById('mu-extension-language')){
  const row=document.createElement('div');
  row.className='mu-language-row';
  row.id='mu-extension-language';
  const label=document.createElement('label');
  label.htmlFor='mu-extension-language-select';
  label.textContent=muGetMessage('muLanguageLabel') || 'Extension language';
  const select=document.createElement('select');
  select.id='mu-extension-language-select';
  select.setAttribute('aria-label',label.textContent);
  const system=document.createElement('option');
  system.value='system';
  system.textContent=muGetMessage('muLanguageSystem') || 'Follow browser language';
  select.append(system);
  const viewer=activeLocale.replace(/_/g,'-');
  let names;
  try {names=new Intl.DisplayNames([viewer],{type:'language'});}
  catch {names=new Intl.DisplayNames(['en'],{type:'language'});}
  for(const locale of availableLocales){
    const tag=locale.replace(/_/g,'-');
    const option=document.createElement('option');
    option.value=locale;
    try {option.textContent=names.of(tag)||tag;}
    catch {option.textContent=tag;}
    if(option.textContent===tag)option.textContent=tag;
    select.append(option);
  }
  select.value=selectedLanguage;
  row.append(label,select);
  behaviorHeading.after(row);
  select.addEventListener('change',async()=>{
    if(select.value===selectedLanguage)return;
    select.disabled=true;
    try{
      await chrome.storage.local.set({[LANGUAGE_KEY]:select.value});
      // Open extension pages receive the change and reload with the new
      // bundle. Native Chrome UI locale remains controlled by the browser.
    }catch(reason){
      console.error('muBlock language preference could not be saved',reason);
      select.disabled=false;
    }
  });
}
