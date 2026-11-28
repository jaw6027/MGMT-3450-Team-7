import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createCustomerApp} from '../server.mjs';
import {localDay} from '../model.mjs';

async function fixture(t,options={}){
 const dataDir=mkdtempSync(join(tmpdir(),'cstc-inspection-'));const app=createCustomerApp({dataDir,...options});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+app.server.address().port;
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.db.close();rmSync(dataDir,{recursive:true,force:true});});
 const client=()=>{let cookie='';return async(path,method='GET',body)=>{const res=await fetch(origin+'/api/'+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];return {status:res.status,body:await res.json()};};};
 const as=async id=>{const c=client();assert.equal((await c('session','POST',{id})).status,200);return c;};return {...app,origin,dataDir,client,as};
}
const pdf=Buffer.from('%PDF-1.4\n% isolated test document, no actual inspection\n%%EOF').toString('base64');
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
async function upload(c,purpose='report',siteId='site-a') {const r=await c('files','POST',{orgId:siteId==='site-b'?'org-b':'org-a',siteId,name:'test.pdf',mime:'application/pdf',data:pdf,purpose,permissionConfirmed:true});assert.equal(r.status,200,JSON.stringify(r.body));return r.body.id;}
const inspection={siteId:'site-a',orgId:'org-a',title:'Test inspection',type:'Inspection',scheduledAt:'2026-12-15T09:00:00-08:00',zone:'America/Los_Angeles',owner:'coordinator',scope:'Test scope only',source:'Illustrative scheduling source',guideId:'guide-a'};
const finding={title:'Test cited finding',classification:'Official citation',category:'Documentation',severity:'High',severityReviewed:true,location:'Test area',description:'Isolated test; not an actual citation.',inspectorNotes:'Test notes',source:'Test source reference',citationReference:'TEST-ONLY-1',authority:'Test issuing authority',jurisdiction:'Test jurisdiction',sourceReviewed:true,originalDueDate:'2026-12-20',deadlineType:'Agency deadline',deadlineSource:'Test citation document',zone:'America/Los_Angeles',assignedTo:'customer-a',nextAction:'Follow the test workflow only.',requiredReinspection:true};

test('persistent inspection-to-evidence-to-reinspection and external acceptance workflow',async t=>{
 const f=await fixture(t),coordinator=await f.as('coordinator'),inspector=await f.as('inspector'),customer=await f.as('customer-a');
 const i=(await coordinator('inspections','POST',inspection)).body;assert.equal(i.state,'Scheduled');
 const reportId=await upload(coordinator);const completed=await coordinator(`inspections/${i.id}/report`,'POST',{version:i.version,fileId:reportId,actualAt:new Date().toISOString()});assert.equal(completed.status,200);
 const reviewed=await inspector(`inspections/${i.id}/review`,'POST',{version:completed.body.version,outcome:'Accepted',reviewConfirmed:true});assert.equal(reviewed.body.state,'Reviewed');
 const authorityId=await upload(inspector,'authority');const created=await inspector('findings','POST',{...finding,inspectionId:i.id,sourceFileId:authorityId});assert.equal(created.status,200,JSON.stringify(created.body));let record=created.body;
 assert.equal((await customer(`findings/${record.id}/close`,'POST',{version:record.version})).status,403);
 record=(await customer(`findings/${record.id}/start`,'POST',{version:record.version})).body;
 const image=await customer('files','POST',{orgId:'org-a',siteId:'site-a',name:'correction.png',mime:'image/png',data:png,purpose:'correction',permissionConfirmed:true});assert.equal(image.status,200);
 assert.equal((await customer(`findings/${record.id}/draft`,'POST',{version:record.version,fileIds:[image.body.id],note:'Saved recoverable draft correction.'})).status,200);
 assert((await customer('state')).body.records.some(r=>r.kind==='draft'&&r.findingId===record.id));
 record=(await customer(`findings/${record.id}/proof`,'POST',{version:record.version,fileIds:[image.body.id],note:'First correction evidence submission.'})).body;assert.equal(record.state,'Evidence submitted');
 record=(await inspector(`findings/${record.id}/review`,'POST',{version:record.version,decision:'Request more evidence',note:'Please provide the remaining test evidence.'})).body;assert.equal(record.state,'Changes requested');
 record=(await customer(`findings/${record.id}/proof`,'POST',{version:record.version,fileIds:[image.body.id],note:'Revised test evidence and completion explanation.'})).body;
 record=(await inspector(`findings/${record.id}/review`,'POST',{version:record.version,decision:'Approve correction',note:'Qualified review of test evidence recorded.',reviewConfirmed:true})).body;assert.equal(record.state,'Correction verified');
 assert.equal((await inspector(`findings/${record.id}/close`,'POST',{version:record.version})).status,400);
 const re=(await coordinator('inspections','POST',{...inspection,title:'Test re-inspection',type:'Re-inspection',parentId:i.id,findingIds:[record.id]})).body;
 const reReport=(await coordinator(`inspections/${re.id}/report`,'POST',{version:re.version,fileId:reportId,actualAt:new Date().toISOString()})).body;
 assert.equal((await inspector(`inspections/${re.id}/review`,'POST',{version:reReport.version,outcome:'Accepted',reviewConfirmed:true})).status,200);
 const stillNeedsAuthority=await inspector(`findings/${record.id}/close`,'POST',{version:record.version});assert.equal(stillNeedsAuthority.status,400);assert.match(stillNeedsAuthority.body.error,/authority acceptance/);
 const accepted=await inspector(`findings/${record.id}/acceptance`,'POST',{version:record.version,fileId:authorityId,authority:'Test authority',reference:'TEST-ACCEPTANCE',acceptedAt:localDay()});assert.equal(accepted.status,200,JSON.stringify(accepted.body));record=accepted.body;
 record=(await inspector(`findings/${record.id}/close`,'POST',{version:record.version})).body;assert.equal(record.state,'Closed');assert.equal(record.originalDueDate,finding.originalDueDate);assert.equal(record.citationReference,'TEST-ONLY-1');
 const state=(await customer('state')).body;assert.equal(state.records.filter(r=>r.kind==='evidence'&&r.findingId===record.id).length,2);assert.equal(state.records.find(r=>r.id===record.id).externalAcceptance.source,'Staff-recorded external acceptance; no agency API confirmation');
 const stored=JSON.parse(f.db.prepare('SELECT data FROM records WHERE id=?').get(record.id).data);assert.equal(stored.state,'Closed');assert(state.activity.some(a=>a.action.includes('Closed verified')));
});

test('tenant/property restrictions, drafts, files, qualified roles and immutable source records',async t=>{
 const f=await fixture(t),a=await f.as('customer-a'),b=await f.as('customer-b'),staff=await f.as('coordinator'),reviewer=await f.as('inspector'),admin=await f.as('admin');
 assert.equal((await f.client()('state')).status,401);assert.equal((await b('records/finding-a')).status,404);assert.equal((await a('records/site-b')).status,404);assert((await a('state')).body.records.every(r=>r.orgId==='org-a'));
 assert.equal((await a('inspections','POST',inspection)).status,403);assert.equal((await staff('findings','POST',finding)).status,403);
 assert.equal((await a('findings/finding-a','PUT',{version:1,severity:'Low',originalDueDate:'2099-01-01'})).status,400);
 const privateFile=await upload(reviewer,'authority','site-b');assert.equal((await a('files/'+privateFile)).status,404);
 const guide=(await staff('guides','POST',{siteId:'site-a',title:'Draft source',body:'Draft instructions, not approved.',source:'Test only'})).body;assert.equal((await a('records/'+guide.id)).status,404);
 const s=(await a('state')).body;assert(!s.records.some(r=>r.id===guide.id));
 assert.equal((await admin('users','POST',{id:'restricted',name:'Property restricted',roles:['Customer'],orgIds:['org-a'],siteIds:['site-a'],password:'a-long-password-for-tests'})).status,200);
 const restricted=await f.as('restricted');assert.equal((await restricted('records/site-a2')).status,404);assert((await restricted('state')).body.records.filter(r=>r.kind==='site').every(r=>r.id==='site-a'));
 assert.equal((await a('findings/finding-a/draft','POST',{version:1,note:'Private draft notes'})).status,200);assert(!(await staff('state')).body.records.some(r=>r.kind==='draft'));
 assert.equal((await a('files','POST',{orgId:'org-a',siteId:'site-a',name:'bad.png',mime:'image/png',data:Buffer.from('<script>').toString('base64'),purpose:'correction',permissionConfirmed:true})).status,400);
});

test('self-review, stale versions, original deadlines, reminders and permission rechecks',async t=>{
 const f=await fixture(t),admin=await f.as('admin'),inspector=await f.as('inspector'),customer=await f.as('customer-a');
 let r=(await admin('records/finding-a')).body;
 r=(await admin('findings/finding-a/start','POST',{version:r.version})).body;
 r=(await admin('findings/finding-a/proof','POST',{version:r.version,note:'Demonstration administrator recorded test correction.'})).body;
 assert.equal((await admin('findings/finding-a/review','POST',{version:r.version,decision:'Approve correction',note:'Own evidence',reviewConfirmed:true})).status,400);
 assert.equal((await inspector('findings/finding-a/review','POST',{version:r.version-1,decision:'Approve correction',note:'Stale edit',reviewConfirmed:true})).status,409);
 const source=await upload(inspector,'authority');const original=r.originalDueDate;
 const ext=await inspector('findings/finding-a/extension','POST',{version:r.version,dueDate:'2027-01-15',fileId:source,authority:'Test authorized extension',reason:'Test documentary authorization.'});assert.equal(ext.status,200);r=ext.body;assert.equal(r.originalDueDate,original);assert.equal(r.extensions[0].dueDate,'2027-01-15');
 assert.equal((await customer('findings/finding-a/extension','POST',{version:r.version,dueDate:'2099-01-01'})).status,403);
 assert((await customer('state')).body.reminders.some(x=>x.id==='finding-a'&&x.date==='2027-01-15'&&x.delivery.includes('not configured')));
 const revoked=await admin('users/customer-a','PUT',{disabled:true});assert.equal(revoked.status,200);assert.equal((await customer('state')).status,401);assert.equal((await f.client()('session','POST',{id:'customer-a'})).status,401);
});

test('permit and renewal review distinguish unverified records, applications and authority-issued evidence',async t=>{
 const f=await fixture(t),customer=await f.as('customer-a'),coordinator=await f.as('coordinator'),inspector=await f.as('inspector');
 const project=(await customer('projects','POST',{siteId:'site-a',title:'Test project',scope:'Illustrative work scope',jurisdiction:'Test jurisdiction',start:'2026-12-01',end:'2026-12-10'})).body;
 let permit=(await coordinator('permits','POST',{projectId:project.id,title:'Potential permit — test',authority:'Test authority',source:'Test source',reason:'Needs applicability review.',owner:'coordinator',zone:'America/Los_Angeles'})).body;assert.equal(permit.state,'Needs applicability review');
 assert.equal((await customer(`permits/${permit.id}/review`,'POST',{version:1,state:'Issued'})).status,403);
 permit=(await customer(`permits/${permit.id}/application`,'POST',{version:permit.version,reference:'Test application'})).body;assert.equal(permit.state,'Submitted');assert.equal(permit.applicabilityReviewed,false);
 assert.equal((await inspector(`permits/${permit.id}/review`,'POST',{version:permit.version,state:'Issued',source:'Test source',authority:'Test authority',reason:'Test reviewed applicability',reviewConfirmed:true})).status,404);
 const documentId=await upload(inspector,'permit');permit=(await inspector(`permits/${permit.id}/review`,'POST',{version:permit.version,state:'Issued',source:'Test source',authority:'Test authority',reason:'Test reviewed applicability',reviewConfirmed:true,documentId,issuedAt:'2026-11-01',expires:'2026-12-01'})).body;assert.equal(permit.state,'Issued');
 const credential=(await customer('credentials','POST',{siteId:'site-a',title:'Test relevant credential',issuer:'Test issuer',source:'Test document',expires:'2026-12-20',zone:'America/Los_Angeles',owner:'customer-a'})).body;
 assert.equal((await customer('state')).body.reminders.find(r=>r.id===credential.id).status,'Verify source');
 assert.equal((await inspector(`credentials/${credential.id}/review`,'POST',{version:credential.version,reviewConfirmed:true})).status,200);
 assert.equal((await customer('state')).body.reminders.find(r=>r.id===credential.id).verified,true);
});

test('shared mode uses password authentication and rejects cross-origin mutation',async t=>{
 const previous=process.env.CUSTOMER_ADMIN_PASSWORD;process.env.CUSTOMER_ADMIN_PASSWORD='a-strong-test-password-123';t.after(()=>{if(previous===undefined)delete process.env.CUSTOMER_ADMIN_PASSWORD;else process.env.CUSTOMER_ADMIN_PASSWORD=previous;});
 const f=await fixture(t,{demo:false}),client=f.client();assert.equal((await client('session','POST',{id:'admin'})).status,401);assert.equal((await client('session','POST',{id:'admin',password:process.env.CUSTOMER_ADMIN_PASSWORD})).status,200);
 assert.deepEqual((await client('bootstrap')).body.users,[]);assert.equal((await client('state')).body.records.length,0);
 const res=await fetch(f.origin+'/api/organizations',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.example'},body:'{}'});assert.equal(res.status,403);
 assert.equal((await client('organizations','POST',{name:'Real setup test',segment:'Other'})).status,200);
});

test('files stay private before release; reviewed historical reports remain available',async t=>{
 const f=await fixture(t),staff=await f.as('coordinator'),reviewer=await f.as('inspector'),customer=await f.as('customer-a'),admin=await f.as('admin');
 const i=(await staff('inspections','POST',inspection)).body,reportId=await upload(staff);
 assert.equal((await customer('files/'+reportId)).status,404);
 assert(!(await customer('state')).body.files.some(x=>x.id===reportId));
 const completed=(await staff(`inspections/${i.id}/report`,'POST',{version:i.version,fileId:reportId,actualAt:new Date().toISOString()})).body;
 assert.equal((await customer('files/'+reportId)).status,404);
 const reviewed=(await reviewer(`inspections/${i.id}/review`,'POST',{version:completed.version,outcome:'Accepted',reviewConfirmed:true})).body;
 const response=await fetch(f.origin+'/api/files/'+reportId);assert.equal(response.status,401);
 assert((await customer('state')).body.files.some(x=>x.id===reportId));assert.equal(reviewed.reportVersions[0].outcome,'Accepted');
 const other=await staff('files','POST',{siteId:'site-a',name:'revised.pdf',mime:'application/pdf',data:Buffer.from('%PDF-1.4\nrevision2').toString('base64'),purpose:'report',permissionConfirmed:true});
 await staff(`inspections/${i.id}/report`,'POST',{version:reviewed.version,fileId:other.body.id,actualAt:new Date().toISOString()});
 const revised=(await customer('records/'+i.id)).body;assert.equal(revised.state,'Completed');assert.equal(revised.outcome,undefined);assert.equal(revised.approvedReportId,undefined);
 const visible=(await customer('state')).body.files;assert(visible.some(x=>x.id===reportId));assert(!visible.some(x=>x.id===other.body.id));
 await admin('users','POST',{id:'peer-customer',name:'Other property member',roles:['Customer'],orgIds:['org-a'],password:'another-test-password-123'});const peer=await f.as('peer-customer');
 const privateUpload=await customer('files','POST',{siteId:'site-a',name:'private.png',mime:'image/png',data:png,purpose:'correction',permissionConfirmed:true});
 assert.equal((await peer('files/'+privateUpload.body.id)).status,404);
 const submitted=await customer('findings/finding-a/proof','POST',{version:1,note:'Published correction evidence to permitted property members.',fileIds:[privateUpload.body.id]});assert.equal(submitted.status,200);
 assert((await peer('state')).body.files.some(x=>x.id===privateUpload.body.id));
});

test('disputes preserve deadlines; recurring task completion is idempotent and prep owners are scoped',async t=>{
 const f=await fixture(t),customer=await f.as('customer-a'),reviewer=await f.as('inspector'),original=(await customer('records/finding-a')).body.originalDueDate;
 const disputed=(await customer('findings/finding-a/dispute','POST',{version:1,note:'Isolated test clarification; no deadline suspension.',fileIds:[]})).body;assert.equal(disputed.state,'Assigned');assert.equal(disputed.originalDueDate,original);
 assert.equal((await customer('inspections/inspection-a/prep-owner','POST',{version:1,taskId:'access',owner:'customer-b',dueDate:'2027-01-01'})).status,400);
 assert.equal((await customer('inspections/inspection-a/prep-owner','POST',{version:1,taskId:'access',owner:'customer-a',dueDate:'2027-01-01'})).status,200);
 assert((await customer('state')).body.reminders.some(r=>r.kind==='Preparation milestone'));
 assert.equal((await customer('reminder-settings','POST',{leadDays:14})).status,200);assert.equal((await customer('state')).body.reminderSettings.leadDays,14);assert.equal((await reviewer('state')).body.reminderSettings.leadDays,30);assert.equal((await customer('reminder-settings','POST',{leadDays:900})).status,400);
 const task=(await reviewer('tasks','POST',{findingId:'finding-a',title:'Reviewed recurring test task',body:'Test only',source:'Test reference',required:false,owner:'customer-a',dueDate:'2027-01-31',zone:'America/Los_Angeles',recurrence:'Monthly'})).body;
 const done=(await customer(`tasks/${task.id}/complete`,'POST',{version:task.version})).body;assert.equal(done.state,'Completed');
 assert.equal((await customer(`tasks/${task.id}/complete`,'POST',{version:done.version})).status,400);
 const next=(await customer('state')).body.records.filter(r=>r.previousTaskId===task.id);assert.equal(next.length,1);assert.equal(next[0].dueDate,'2027-02-28');assert.equal((await customer('records/finding-a')).body.state,'Assigned');
});

test('database, sessions, private files and saved evidence drafts survive server restart',async t=>{
 const dataDir=mkdtempSync(join(tmpdir(),'cstc-restart-'));let app=createCustomerApp({dataDir,demo:true});
 const listen=async()=>{await new Promise(r=>app.server.listen(0,'127.0.0.1',r));return 'http://127.0.0.1:'+app.server.address().port;};let origin=await listen();
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.db.close();rmSync(dataDir,{recursive:true,force:true});});
 const signed=await fetch(origin+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:'customer-a'})}),cookie=signed.headers.get('set-cookie').split(';')[0];
 const call=async(path,body)=>{const r=await fetch(origin+'/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});assert.equal(r.status,200);return r.json();};
 const file=await call('files',{siteId:'site-a',name:'draft.png',mime:'image/png',data:png,purpose:'correction',permissionConfirmed:true});await call('findings/finding-a/draft',{version:1,note:'Recover this draft after a full backend restart.',fileIds:[file.id]});
 await new Promise(r=>app.server.close(r));app.db.close();app=createCustomerApp({dataDir,demo:true});origin=await listen();
 const state=await call('state');assert(state.records.some(r=>r.kind==='draft'&&r.note.includes('full backend restart')));assert(state.files.some(r=>r.id===file.id));
 const download=await fetch(origin+'/api/files/'+file.id,{headers:{Cookie:cookie}});assert.equal(download.status,200);assert.equal(Buffer.from(await download.arrayBuffer()).toString('base64'),png);
});
