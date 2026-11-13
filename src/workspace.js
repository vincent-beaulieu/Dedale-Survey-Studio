import {createClient} from '@supabase/supabase-js';
const db=createClient(SUPABASE_URL,SUPABASE_KEY);
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const main=$('#workspace');
let user=null,workspace=null,project=null,doc=null,revision=0,selected=0,dirty=false,saving=false,conflict=false,timer;
const types={single:'Single choice',multi:'Multiple choice',short:'Short text',open:'Long text',number:'Number',scale:'Scale (0–10)'};
function notice(message='',error=false){$('#notice').textContent=message;$('#notice').classList.toggle('error',error);}
function fail(e){notice(e?.message||'The request failed. Your changes have not been saved. Please retry.',true);}
async function query(p){const {data,error}=await p;if(error)throw error;return data;}
function view(html){main.innerHTML=html;main.setAttribute('aria-busy','false');}
async function action(button,fn){button.disabled=true;try{await fn();}catch(e){fail(e);}finally{if(button.isConnected)button.disabled=false;}}
function auth(){
 user=null;$('#identity').textContent='';$('#logout').hidden=true;
 view(`<section class="card auth-card"><p class="eyebrow">WELCOME TO DEDALE</p><h1>Your research,<br>in one place.</h1><p class="lead">Sign in to create and save your questionnaires.</p><form id="login" class="work-form"><label>Email<input id="email" type="email" autocomplete="username" required></label><label>Password<input id="password" type="password" autocomplete="current-password" minlength="8" required></label><button class="btn btn-primary" type="submit">Sign in</button><button class="btn btn-ghost" id="signup" type="button">Create an account</button></form><p class="note">New accounts need email confirmation. After confirming, return here to sign in.</p></section>`);
 $('#login').onsubmit=e=>{e.preventDefault();const b=e.submitter;action(b,async()=>{notice();await query(db.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value}));await load();});};
 $('#signup').onclick=e=>{if(!$('#login').reportValidity())return;action(e.currentTarget,async()=>{await query(db.auth.signUp({email:$('#email').value.trim(),password:$('#password').value,options:{emailRedirectTo:location.origin}}));notice('If this address is eligible, a confirmation email has been sent. Confirm your email, then return here to sign in.');});};
}
async function load(){
 const result=await db.auth.getUser();if(result.error||!result.data.user){auth();return;}
 user=result.data.user;$('#identity').textContent=user.email;$('#logout').hidden=false;
 const spaces=await query(db.from('workspaces').select('id,name').order('created_at'));
 if(!spaces.length){view(`<section class="card auth-card"><h1>Create your workspace</h1><p class="lead">Only members can access its projects.</p><form id="new-space" class="work-form"><label>Workspace name<input id="space-name" value="Dedale Intelligence" maxlength="120" required></label><button class="btn btn-primary">Create workspace</button></form></section>`);$('#new-space').onsubmit=e=>{e.preventDefault();action(e.submitter,async()=>{await query(db.rpc('create_workspace',{workspace_name:$('#space-name').value.trim()}));await load();});};return;}
 workspace=spaces.find(s=>s.id===workspace?.id)||spaces[0];await overview(spaces);
}
async function overview(spaces){
 project=null;doc=null;dirty=false;conflict=false;clearTimeout(timer);
 const projects=await query(db.from('projects').select('id,name,created_at').eq('workspace_id',workspace.id).order('created_at',{ascending:false}));
 if(!spaces)spaces=await query(db.from('workspaces').select('id,name').order('created_at'));
 const members=await query(db.from('workspace_members').select('role').eq('workspace_id',workspace.id).eq('user_id',user.id));
 const editable=['owner','editor'].includes(members[0]?.role);
 view(`<p class="eyebrow">YOUR WORKSPACE</p><div class="row"><h1>Your surveys</h1><label>Workspace <select id="space">${spaces.map(s=>`<option value="${s.id}" ${s.id===workspace.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label></div><p class="lead">Create a questionnaire and pick up exactly where you left off.</p>${editable?`<section class="card"><form id="new-project" class="row"><label for="project-name">New survey</label><input id="project-name" placeholder="e.g. Green Project — Bank Flow" maxlength="200" required><button class="btn btn-primary">Create survey</button></form></section>`:''}<section class="project-list">${projects.length?projects.map(p=>`<article class="card project-row"><div><h2>${esc(p.name)}</h2><span class="chip draft">Draft</span> <small class="muted">Created ${new Date(p.created_at).toLocaleDateString()}</small></div><button class="btn btn-ghost" data-open="${p.id}">${editable?'Edit questionnaire':'View questionnaire'} →</button></article>`).join(''):'<p class="empty">No surveys yet. Create your first questionnaire above.</p>'}</section>`);
 $('#space').onchange=async e=>{workspace=spaces.find(s=>s.id===e.target.value);try{await overview(spaces);}catch(err){fail(err);}};
 if(editable)$('#new-project').onsubmit=e=>{e.preventDefault();action(e.submitter,async()=>{const name=$('#project-name').value.trim();const id=await query(db.rpc('create_project',{workspace:workspace.id,project_name:name}));await openProject({id,name},true);});};
 main.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>action(b,()=>openProject(projects.find(p=>p.id===b.dataset.open),editable)));
}
async function openProject(p,editable){
 const draft=await query(db.from('survey_drafts').select('document,revision').eq('project_id',p.id).single());
 project={...p,editable};doc=draft.document;revision=draft.revision;dirty=false;conflict=false;selected=0;
 if(!Array.isArray(doc.sections))throw new Error('Unsupported questionnaire format.');
 if(!doc.sections.length)doc.sections=[{id:crypto.randomUUID(),title:'Questions',qs:[]}];
 renderEditor();notice();
}
function questions(){return doc.sections.flatMap(s=>s.qs||[]);}
function renderEditor(){
 const qs=questions(),q=qs[selected],readOnly=!project.editable;
 view(`<button class="btn btn-ghost" id="back">← Your surveys</button><p class="eyebrow" style="margin-top:24px">QUESTIONNAIRE BUILDER</p><h1>${esc(project.name)}</h1><p class="lead">${qs.length} questions · Draft · ${readOnly?'Read-only access':'Changes are saved automatically'}</p><div class="editor-grid"><aside class="card outline">${qs.map((q,i)=>`<button class="btn btn-ghost ${i===selected?'selected':''}" data-question="${i}">Q${i+1} · ${esc(q.text.slice(0,24)||'New question')}</button>`).join('')}${!readOnly?'<button class="btn btn-primary" id="add">+ Add question</button>':''}</aside><section class="card">${q?`<div class="question"><label>Question<textarea id="q-text" rows="3" maxlength="2000" ${readOnly?'disabled':''}>${esc(q.text)}</textarea></label><label>Answer type<select id="q-type" ${readOnly?'disabled':''}>${Object.entries(types).map(([k,v])=>`<option value="${k}" ${q.type===k?'selected':''}>${v}</option>`).join('')}</select></label>${['single','multi'].includes(q.type)?`<label>Options — one per line<textarea id="q-options" rows="4" ${readOnly?'disabled':''}>${esc(q.opts.join('\n'))}</textarea></label>`:''}<label class="required"><input id="q-required" type="checkbox" ${q.req?'checked':''} ${readOnly?'disabled':''}>Required</label>${!readOnly?'<div class="row"><button class="btn btn-ghost" id="duplicate">Duplicate</button><button class="btn btn-ghost danger" id="delete">Delete question</button></div>':''}</div><section class="preview" aria-label="Question preview"><p class="eyebrow">RESPONDENT PREVIEW</p><h3 id="preview-title"></h3><div id="preview-answer"></div></section>`:'<h2>Start your questionnaire</h2><p class="lead">Add your first question using the button on the left.</p>'}</section></div><div class="save-bar"><span id="save-state" role="status" class="saved"></span>${!readOnly?'<button class="btn btn-primary" id="save">Save now</button>':''}<button class="btn btn-ghost" id="reload">Reload saved version</button></div>`);
 $('#back').onclick=()=>action($('#back'),async()=>{if(!await flush())return;await load();});
 main.querySelectorAll('[data-question]').forEach(b=>b.onclick=()=>{selected=+b.dataset.question;renderEditor();});
 if(q){preview(q);if(!readOnly){$('#q-text').oninput=e=>{q.text=e.target.value;preview(q);changed();};$('#q-type').onchange=e=>{q.type=e.target.value;if(!q.opts?.length)q.opts=['Option 1','Option 2'];changed();renderEditor();};$('#q-options')?.addEventListener('input',e=>{q.opts=e.target.value.split('\n');preview(q);changed();});$('#q-required').onchange=e=>{q.req=e.target.checked;changed();};$('#delete').onclick=()=>{for(const s of doc.sections)s.qs=s.qs.filter(x=>x.id!==q.id);selected=Math.max(0,selected-1);changed();renderEditor();};$('#duplicate').onclick=()=>{doc.sections[0].qs.push({...structuredClone(q),id:crypto.randomUUID()});selected=questions().length-1;changed();renderEditor();};}}
 if(!readOnly){$('#add').onclick=()=>{doc.sections[0].qs.push({id:crypto.randomUUID(),type:'single',text:'New question',opts:['Option 1','Option 2'],req:true});selected=questions().length-1;changed();renderEditor();$('#q-text').focus();};$('#save').onclick=()=>flush();}
 $('#reload').onclick=()=>action($('#reload'),async()=>{if(saving)return;if(dirty&&!confirm('Discard your unsaved changes and load the saved version?'))return;await openProject(project,project.editable);});
 status();
}
function preview(q){$('#preview-title').textContent=q.text;$('#preview-answer').innerHTML=['single','multi'].includes(q.type)?`<ul>${q.opts.map(o=>`<li>${esc(o)}</li>`).join('')}</ul>`:`<p class="muted">${esc(types[q.type])}${q.req?' · Required':''}</p>`;}
function status(){const s=$('#save-state');if(s)s.textContent=conflict?'Conflict — another session saved a newer version. Reload to continue.':saving?'Saving…':dirty?'Unsaved changes':`Saved · revision ${revision}`;}
function changed(){dirty=true;status();clearTimeout(timer);if(!conflict)timer=setTimeout(()=>save(),900);}
let pending=null;
async function save(){
 if(pending)return pending;if(!dirty||conflict||!project?.editable)return !dirty;
 const sent=JSON.stringify(doc),id=project.id;let succeeded=false;saving=true;status();
 pending=(async()=>{try{const next=await query(db.rpc('save_survey_draft',{project:id,expected_revision:revision,new_document:JSON.parse(sent)}));revision=next;dirty=JSON.stringify(doc)!==sent;succeeded=true;notice();return true;}catch(e){if(['40001','PT409'].includes(e.code))conflict=true;fail(['40001','PT409'].includes(e.code)?new Error('Another session saved a newer version. Your edits remain here. Copy any changes you need before reloading.'):e);return false;}finally{saving=false;pending=null;status();if(succeeded&&dirty&&!conflict)timer=setTimeout(()=>save(),300);}})();return pending;
}
async function flush(){clearTimeout(timer);if(pending)await pending;while(dirty&&!conflict){if(!await save())return false;}return !dirty;}
$('#overview').onclick=async()=>{try{if(await flush())await load();}catch(e){fail(e);}};
$('#logout').onclick=e=>action(e.currentTarget,async()=>{if(!await flush())return;await query(db.auth.signOut());project=null;doc=null;workspace=null;notice();auth();});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){clearTimeout(timer);auth();}});
load().catch(fail);
