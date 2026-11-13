// Explicit opt-in integration test against an isolated development fixture.
// Supply TEST_USER_FILE outside the repository; never use a real person's account.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM,VirtualConsole} from 'jsdom';
const creds=JSON.parse(readFileSync(process.env.TEST_USER_FILE,'utf8'));
const url=process.env.PUBLIC_SUPABASE_URL,key=process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const bundle=await build({entryPoints:['src/workspace.js'],bundle:true,format:'iife',write:false,define:{SUPABASE_URL:JSON.stringify(url),SUPABASE_KEY:JSON.stringify(key)}});
const html=readFileSync('public/index.html','utf8');
const instances=[];
function start(storage={}){
 const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(e.type!=='css-parsing')console.error(e.message);});
 const d=new JSDOM(html,{url:'https://studio.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
 const w=d.window;w.fetch=async (...args)=>{const r=await fetch(...args);if(String(args[0]).includes("save_survey_draft"))console.log("Draft request status",r.status);return r;};w.Headers=Headers;w.Request=Request;w.Response=Response;w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.confirm=()=>true;
 for(const [k,v] of Object.entries(storage))w.localStorage.setItem(k,v);
 w.eval(bundle.outputFiles[0].text);instances.push(d);return w;
}
async function wait(w,fn){for(let i=0;i<250;i++){if(fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out. '+w.document.querySelector('#notice').textContent+' STATE '+w.document.querySelector('#save-state')?.textContent);}
const $=(w,s)=>w.document.querySelector(s);
function input(w,s,value){$(w,s).value=value;$(w,s).dispatchEvent(new w.Event('input',{bubbles:true}));}
async function login(w){await wait(w,()=>$(w,'#login'));input(w,'#email',creds.email);input(w,'#password',creds.password);$(w,'#login button[type=submit]').click();await wait(w,()=>$(w,'#new-space')||$(w,'#new-project'));}
try{
 console.log("Starting real auth check");const a=start();await login(a);console.log("Signed in");if($(a,'#new-space')){input(a,'#space-name','Integration test workspace');$(a,'#new-space button').click();await wait(a,()=>$(a,'#new-project'));}
 input(a,'#project-name','Persisted integration survey');$(a,'#new-project button').click();await wait(a,()=>$(a,'#add'));$(a,'#add').click();input(a,'#q-text','How urgent is this workflow?');$(a,'#save').click();await wait(a,()=>$(a,'#save-state').textContent.startsWith('Saved · revision 1'));
 console.log("Saved first draft");const storage=Object.fromEntries(Object.keys(a.localStorage).map(k=>[k,a.localStorage.getItem(k)]));
 console.log("Starting second session");const b=start(storage);await wait(b,()=>$(b,'[data-open]'));$(b,'[data-open]').click();await wait(b,()=>$(b,'#q-text'));assert.equal($(b,'#q-text').value,'How urgent is this workflow?');
 console.log('Second session loaded');input(a,'#q-text','First session update');$(a,'#save').click();await wait(a,()=>$(a,'#save-state').textContent.startsWith('Saved · revision 2'));
 console.log('First session updated');input(b,'#q-text','Stale session update');$(b,'#save').click();await wait(b,()=>$(b,'#save-state').textContent.startsWith('Conflict'));assert.equal($(b,'#q-text').value,'Stale session update');
 console.log('Conflict detected');$(b,'#reload').click();await wait(b,()=>$(b,'#q-text')?.value==='First session update');
 console.log('Reloaded latest');$(b,'#logout').click();await wait(b,()=>$(b,'#login'));await login(b);$(b,'[data-open]').click();await wait(b,()=>$(b,'#q-text'));assert.equal($(b,'#q-text').value,'First session update');
 console.log('PASS: real auth, create workspace/project, save, reload session, conflict retention, reload, logout/login persistence');
}finally{for(const d of instances)d.window.close();}
