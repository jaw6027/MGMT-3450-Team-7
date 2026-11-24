import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server.mjs';

async function fixture(t,options={}) {
 const dataDir=mkdtempSync(join(tmpdir(),'cstc-test-'));
 const app=createApp({dataDir,...options});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+app.server.address().port;
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.db.close();rmSync(dataDir,{recursive:true,force:true});});
 const client=()=>{let cookie='';return async(path,method='GET',data)=>{const res=await fetch(base+'/api/'+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie},body:data===undefined?undefined:JSON.stringify(data)});if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];return {status:res.status,body:await res.json()};};};
 const as=async id=>{const request=client();assert.equal((await request('session','POST',{id})).status,200);return request;};
 return {...app,base,dataDir,as,client};
}
const draft={title:'Training introduction',platform:'LinkedIn',format:'Text',caption:'Explore training options with CSTC. https://www.cstcsafety.com/',reviewer:'reviewer',publisher:'publisher',campaign:'cam-1',audience:'aud-1',zone:'America/Los_Angeles',planned:'2026-11-24T01:30:00-08:00',deadline:'2026-11-23T12:00:00-08:00',assetIds:[],factsConfirmed:true,technical:false,cta:'Website'};
async function configure(admin){const s=(await admin('state')).body;const requirements=structuredClone(s.settings.requirements);requirements.LinkedIn.reviewedAt='2026-11-24';const accounts=structuredClone(s.settings.accounts);accounts.LinkedIn={url:'https://www.linkedin.com/company/example-test-only/',verified:true};assert.equal((await admin('settings','PUT',{requirements,accounts})).status,200);}
test('manual workflow: revision, approval, reminders, preparation, publication, inquiries and reporting persist',async t=>{
 const f=await fixture(t),admin=await f.as('admin'),author=await f.as('author'),reviewer=await f.as('reviewer'),publisher=await f.as('publisher'),analyst=await f.as('analyst');
 assert.equal((await f.client()('state')).status,401);await configure(admin);
 const audience=await author('audiences','POST',{name:'Test operations team',assumptions:'Illustrative test only'});assert.equal(audience.status,200);
 const camp=await author('campaigns','POST',{name:'Test introduction',offering:'Safety training',offeringConfirmed:true,audience:audience.body.id});assert.equal(camp.status,200);
 const created=await author('posts','POST',{...draft,campaign:camp.body.id,audience:audience.body.id});assert.equal(created.status,200);const id=created.body.id;
 let p=(await author('state')).body.posts.find(p=>p.id===id);assert.equal(p.status,'Draft');assert.equal(p.author,'author');
 assert.equal((await author(`posts/${id}/transition`,'POST',{status:'In Review',version:1})).status,200);
 assert.equal((await reviewer(`posts/${id}/comment`,'POST',{text:'Please clarify the invitation.'})).status,200);
 assert.equal((await reviewer(`posts/${id}/transition`,'POST',{status:'Changes Requested',version:1})).status,200);
 assert.equal((await author(`posts/${id}`,'PUT',{...draft,title:'Revised introduction',caption:draft.caption+' Ask about your team.',version:1})).status,200);
 assert.equal((await author(`posts/${id}/transition`,'POST',{status:'In Review',version:2})).status,200);
 assert.equal((await reviewer(`posts/${id}/transition`,'POST',{status:'Approved',version:2})).status,200);
 assert.equal((await publisher(`posts/${id}/transition`,'POST',{status:'Ready to Post',version:2})).status,200);
 p=(await publisher('state')).body.posts.find(p=>p.id===id);assert.equal(p.mode,'Manual');assert.equal(Date.parse(p.planned),Date.parse('2026-11-24T09:30:00Z'));assert.equal(p.publication,undefined);assert.equal((await publisher(`posts/${id}/prepare`)).status,200);
 assert.equal((await publisher(`posts/${id}/transition`,'POST',{status:'Posted',version:2,'final-0':true,'final-1':true,'final-2':true,'final-3':true,'final-4':true,liveUrl:'https://www.linkedin.com/feed/update/test-only',actualAt:'2026-11-24T12:00:00-08:00'})).status,200);
 const lead=await analyst('leads','POST',{contact:'Test organization',status:'New',channel:'Call',campaign:camp.body.id,source:'integration-confirmed'});assert.equal(lead.status,200);
 const m=await analyst('metrics','POST',{platform:'LinkedIn',reach:'',impressions:0,likes:0,comments:0,shares:0,saves:0});assert.equal(m.status,200);
 const final=(await admin('state')).body;assert.equal(final.posts.find(p=>p.id===id).publication.confirmation,'Team-confirmed publication');assert.equal(final.leads[0].source,'Manual entry');assert.equal(final.metrics[0].reach,'');assert.equal(final.metrics[0].impressions,0);assert.equal(final.posts.find(p=>p.id==='post-2').status,'Draft');assert(final.audit.length>5);
 const saved=JSON.parse(f.db.prepare('SELECT body FROM workspace WHERE id=1').get().body);assert.equal(saved.posts.find(p=>p.id===id).status,'Posted');
 assert.equal((await author(`posts/${id}`,'PUT',{...draft,version:2})).status,400);
});
test('permissions, own approval, technical review, approval invalidation, stale edits and separate platform status',async t=>{
 const f=await fixture(t),admin=await f.as('admin'),author=await f.as('author'),reviewer=await f.as('reviewer'),publisher=await f.as('publisher');
 assert.equal((await author('settings','PUT',{paused:true})).status,403);assert.equal((await author('metrics','POST',{})).status,403);assert.equal((await author('leads','POST',{contact:'X',status:'New'})).status,403);
 const own=(await admin('posts','POST',{...draft,title:'Own draft',reviewer:'reviewer'})).body.id;await admin(`posts/${own}/transition`,'POST',{status:'In Review',version:1});assert.equal((await admin(`posts/${own}/transition`,'POST',{status:'Approved',version:1})).status,400);
 const id=(await author('posts','POST',{...draft,title:'Technical',caption:'A technical test',technical:true})).body.id;await author(`posts/${id}/transition`,'POST',{status:'In Review',version:1});
 assert.equal((await reviewer(`posts/${id}/transition`,'POST',{status:'Approved',version:1})).status,400);
 assert.equal((await reviewer(`posts/${id}/transition`,'POST',{status:'Approved',version:1,technicalReviewed:true})).status,200);
 assert.equal((await publisher(`posts/${id}/transition`,'POST',{status:'Ready to Post',version:1})).status,400);
 assert.equal((await author(`posts/${id}`,'PUT',{...draft,caption:'An edited test',technical:true,version:1})).status,200);
 const p=(await author('state')).body.posts.find(p=>p.id===id);assert.equal(p.status,'Draft');assert.equal(p.technicalApproved,false);assert.equal(p.approvedBy,undefined);
 assert.equal((await author(`posts/${id}`,'PUT',{...draft,version:1})).status,409);
 assert.equal((await publisher(`posts/${id}/transition`,'POST',{status:'Ready to Post',version:2})).status,400);
});
test('unambiguous dates, disconnected accounts, duplicate slots and disabled automatic/ad operations',async t=>{
 const f=await fixture(t),admin=await f.as('admin'),author=await f.as('author'),reviewer=await f.as('reviewer'),publisher=await f.as('publisher');
 assert.equal((await author('posts','POST',{...draft,planned:'2026-11-01T01:30:00'})).status,400);
 assert.equal((await author('posts','POST',{...draft,zone:'not-a-zone'})).status,400);
 assert.equal((await admin('settings','PUT',{automatic:true})).status,400);assert.equal((await admin('settings','PUT',{advertising:true})).status,400);
 const id=(await author('posts','POST',draft)).body.id;await author(`posts/${id}/transition`,'POST',{status:'In Review',version:1});await reviewer(`posts/${id}/transition`,'POST',{status:'Approved',version:1});
 assert.equal((await publisher(`posts/${id}/transition`,'POST',{status:'Scheduled',version:1})).status,400);
 assert.equal((await publisher(`posts/${id}/transition`,'POST',{status:'Ready to Post',version:1})).status,400);
 await configure(admin); // configuration invalidates approval
 await author(`posts/${id}/transition`,'POST',{status:'In Review',version:2});await reviewer(`posts/${id}/transition`,'POST',{status:'Approved',version:2});
 await author('posts','POST',{...draft,title:'Duplicate',caption:'Different text, same time'});
 const s=(await admin('state')).body;assert(s.checks[id].errors.some(e=>e.includes('Duplicate')));
 await admin('settings','PUT',{paused:true});assert.equal((await admin('state')).body.settings.paused,true);
 assert.equal((await admin('adPlans','POST',{name:'Test only',budget:10,live:true,status:'Approved'})).body.id.length>0,true);assert.equal((await admin('state')).body.adPlans[0].live,false);
});
test('media validates file signature, permission and reviewer authorization',async t=>{
 const f=await fixture(t),author=await f.as('author'),reviewer=await f.as('reviewer');
 assert.equal((await author('assets','POST',{name:'fake',mime:'image/png',data:Buffer.from('<script>').toString('base64')})).status,400);
 const upload=await author('assets','POST',{name:'Test pixel',mime:'image/png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',rights:'Test asset permission',alt:'Test pixel'});assert.equal(upload.status,201);
 assert.equal((await author(`assets/${upload.body.id}/approve`,'POST',{})).status,403);
 assert.equal((await reviewer(`assets/${upload.body.id}/approve`,'POST',{})).status,200);
 assert.equal((await reviewer(`assets/${upload.body.id}`,'PUT',{expires:'2020-01-01'})).status,200);
 assert.equal((await reviewer(`assets/${upload.body.id}/approve`,'POST',{})).status,400);
});
test('shared mode requires passwords, blocks identity simulation and persists users across restarts',async t=>{
 const previous=process.env.ADMIN_PASSWORD;process.env.ADMIN_PASSWORD='a-long-test-password-123';t.after(()=>{if(previous===undefined)delete process.env.ADMIN_PASSWORD;else process.env.ADMIN_PASSWORD=previous;});
 const f=await fixture(t,{demo:false}),client=f.client();assert.equal((await client('session','POST',{id:'admin'})).status,401);assert.equal((await client('session','POST',{id:'admin',password:'wrong'})).status,401);assert.equal((await client('session','POST',{id:'admin',password:process.env.ADMIN_PASSWORD})).status,200);
 assert.equal((await client('users','POST',{id:'team-member',name:'Team member',password:'another-long-password',roles:['Reviewer'],qualified:true})).status,201);
 assert.equal((await client('bootstrap')).body.demo,false);assert.deepEqual((await client('bootstrap')).body.users,[]);
 const response=await fetch(f.base+'/api/settings',{method:'PUT',headers:{'Content-Type':'application/json',Origin:'https://untrusted.example'},body:'{}'});assert.equal(response.status,403);
});
test('durable simulation queue deduplicates, pauses, reconciles uncertainty, retries and cancels on edits',async t=>{
 const f=await fixture(t),admin=await f.as('admin'),author=await f.as('author'),reviewer=await f.as('reviewer'),publisher=await f.as('publisher');await configure(admin);
 const id=(await author('posts','POST',{...draft,caption:'Queue test only',planned:''})).body.id;await author(`posts/${id}/transition`,'POST',{status:'In Review',version:1});await reviewer(`posts/${id}/transition`,'POST',{status:'Approved',version:1});
 assert.equal((await publisher('publishing-simulation','POST',{action:'enqueue',postId:id})).status,400);
 await admin('settings','PUT',{paused:false});
 const j=(await publisher('publishing-simulation','POST',{action:'enqueue',postId:id})).body.job;
 const duplicate=(await publisher('publishing-simulation','POST',{action:'enqueue',postId:id})).body.job;assert.equal(j.id,duplicate.id);assert.equal(j.status,'Queued');
 const step=(action,outcome)=>publisher('publishing-simulation','POST',{action,outcome,id:j.id});
 await admin('settings','PUT',{paused:true});assert.equal((await step('step')).status,400);await admin('settings','PUT',{paused:false});
 assert.equal((await step('step')).body.job.status,'Processing');assert.equal((await step('step','uncertain')).body.job.status,'Uncertain');assert.equal((await step('retry')).status,400);
 assert.equal((await step('reconcile','not-created')).body.job.status,'Failed');assert.equal((await step('retry')).body.job.status,'Queued');assert.equal((await step('step')).body.job.attempts,2);
 assert.equal((await step('step','confirmed')).body.job.status,'Simulated confirmation');assert.equal((await step('retry')).status,400);
 assert.equal((await publisher('state')).body.posts.find(p=>p.id===id).status,'Approved');
 const saved=JSON.parse(f.db.prepare('SELECT body FROM workspace WHERE id=1').get().body);assert.equal(saved.jobs.length,1);assert.equal(saved.jobs[0].status,'Simulated confirmation');
 const id2=(await author('posts','POST',{...draft,caption:'Cancel test only',planned:''})).body.id;await author(`posts/${id2}/transition`,'POST',{status:'In Review',version:1});await reviewer(`posts/${id2}/transition`,'POST',{status:'Approved',version:1});await publisher('publishing-simulation','POST',{action:'enqueue',postId:id2});
 await author(`posts/${id2}`,'PUT',{...draft,caption:'Edited cancel test',planned:'',version:1});assert.equal((await publisher('state')).body.jobs.find(j=>j.postId===id2).status,'Cancelled');
});
test('data and access controls survive a complete server restart',async()=>{
 const dataDir=mkdtempSync(join(tmpdir(),'cstc-restart-'));let app=createApp({dataDir,demo:true});let base,cookie;
 const open=async()=>{await new Promise(r=>app.server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+app.server.address().port;};
 try{await open();const login=await fetch(base+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"id":"admin"}'});cookie=login.headers.get('set-cookie').split(';')[0];
 const headers={'Content-Type':'application/json',Cookie:cookie};await fetch(base+'/api/audiences',{method:'POST',headers,body:'{"name":"Restart persistence"}'});
 await new Promise(r=>app.server.close(r));app.db.close();app=createApp({dataDir,demo:true});await open();const s=await (await fetch(base+'/api/state',{headers})).json();assert(s.audiences.some(a=>a.name==='Restart persistence'));assert.equal(s.user.id,'admin');
 const revoke=await fetch(base+'/api/users/author',{method:'PUT',headers,body:JSON.stringify({name:'Jordan Lee',roles:['Author'],disabled:true})});assert.equal(revoke.status,200);
 assert.equal((await fetch(base+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"id":"author"}'})).status,401);
 }finally{await new Promise(r=>app.server.close(r));app.db.close();rmSync(dataDir,{recursive:true,force:true});}
});
test('daylight-saving offsets identify distinct instants; contact and configuration checks remain explicit',async t=>{
 const f=await fixture(t),admin=await f.as('admin'),author=await f.as('author');
 const a=(await author('posts','POST',{...draft,title:'First repeated hour',caption:'DST first occurrence',planned:'2026-11-01T01:30:00-07:00',deadline:''})).body.id;
 const b=(await author('posts','POST',{...draft,title:'Second repeated hour',caption:'DST second occurrence',planned:'2026-11-01T01:30:00-08:00',deadline:''})).body.id;
 const s=(await admin('state')).body;assert.equal(Date.parse(s.posts.find(p=>p.id===b).planned)-Date.parse(s.posts.find(p=>p.id===a).planned),3600000);
 assert.equal((await admin('settings','PUT',{zone:'invalid-zone'})).status,400);
 assert.equal((await admin('settings','PUT',{accounts:{LinkedIn:{verified:true,url:'https://untrusted.example/'}}})).status,400);
 const dm=(await author('posts','POST',{...draft,caption:'Contact destination test',planned:'',cta:'DM'})).body.id;
 assert((await author('state')).body.checks[dm].errors.some(e=>e.includes('messaging')));
 const tech=(await author('posts','POST',{...draft,caption:'OSHA regulation discussion needs review.',planned:'',technical:false})).body.id;
 assert.equal((await author('state')).body.posts.find(p=>p.id===tech).technical,true);
 assert.equal((await author('state')).body.leads.length,0);
});
