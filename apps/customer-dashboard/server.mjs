import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {mkdirSync,chmodSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {roles,severities,sourceTypes,id,now,fail,string,choice,day,instant,zone,localDay,canSee,isStaff,summaries,reminderRecords,demonstrationSeed} from './model.mjs';

const root=dirname(fileURLToPath(import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
const arr=(value,label)=>{if(!Array.isArray(value)||value.length>100||value.some(v=>typeof v!=='string'))fail(`${label} must be a list of identifiers.`);return [...new Set(value)];};
const truth=value=>value===true;

export function createCustomerApp({dataDir=process.env.CUSTOMER_DATA_DIR||resolve(root,'data'),demo=process.env.CUSTOMER_DEMO_MODE!=='false',secure=process.env.CUSTOMER_COOKIE_SECURE==='true'}={}){
  mkdirSync(dataDir,{recursive:true,mode:0o700});chmodSync(dataDir,0o700);mkdirSync(resolve(dataDir,'files'),{recursive:true,mode:0o700});
  const db=new DatabaseSync(resolve(dataDir,'customer.sqlite'));
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS organizations(id TEXT PRIMARY KEY,name TEXT NOT NULL,segment TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,kind TEXT NOT NULL,org_id TEXT NOT NULL REFERENCES organizations(id),site_id TEXT,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
    CREATE INDEX IF NOT EXISTS records_scope ON records(org_id,site_id,kind);
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,roles TEXT NOT NULL,orgs TEXT NOT NULL,sites TEXT NOT NULL,salt TEXT NOT NULL,password_hash TEXT NOT NULL,qualified INTEGER NOT NULL DEFAULT 0,disabled INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),site_id TEXT NOT NULL,name TEXT NOT NULL,mime TEXT NOT NULL,bytes INTEGER NOT NULL,checksum TEXT NOT NULL,storage_name TEXT NOT NULL,purpose TEXT NOT NULL,owner TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,org_id TEXT,site_id TEXT,record_id TEXT,actor TEXT NOT NULL,action TEXT NOT NULL,at TEXT NOT NULL);
  `);
  const stored=db.prepare("SELECT value FROM metadata WHERE key='mode'").get()?.value;
  if(stored&&stored!==(demo?'demo':'shared')){db.close();throw Error('Workspace mode mismatch. Use separate CUSTOMER_DATA_DIR directories for demo and shared data.');}
  if(!stored)db.prepare("INSERT INTO metadata VALUES('mode',?)").run(demo?'demo':'shared');
  const userView=u=>u?{id:u.id,name:u.name,roles:JSON.parse(u.roles),orgIds:JSON.parse(u.orgs),siteIds:JSON.parse(u.sites),qualified:!!u.qualified,disabled:!!u.disabled}:null;
  const users=()=>db.prepare('SELECT * FROM users').all().map(userView);
  // Explicit columns keep the users schema easy to inspect and migrate.
  const createUser=(u,password)=>{const salt=randomBytes(16).toString('hex');db.prepare('INSERT INTO users(id,name,roles,orgs,sites,salt,password_hash,qualified,disabled) VALUES(?,?,?,?,?,?,?,?,0)').run(u.id,u.name,JSON.stringify(u.roles),JSON.stringify(u.orgIds),JSON.stringify(u.siteIds||[]),salt,scryptSync(password,salt,64).toString('hex'),u.qualified?1:0);};
  if(demo&&!db.prepare('SELECT id FROM users LIMIT 1').get()){
    const seed=demonstrationSeed();db.exec('BEGIN');
    try{
      for(const o of seed.organizations)db.prepare('INSERT INTO organizations VALUES(?,?,?)').run(o.id,o.name,o.segment);
      for(const r of seed.records)db.prepare('INSERT INTO records VALUES(?,?,?,?,?,1)').run(r.id,r.kind,r.orgId,r.siteId,JSON.stringify(r));
      for(const u of [
        {id:'admin',name:'Alex · demo administrator',roles:['Administrator','Coordinator','Inspector'],orgIds:['*'],qualified:true},
        {id:'inspector',name:'Sam · demo inspector',roles:['Inspector'],orgIds:['org-a','org-b'],qualified:true},
        {id:'coordinator',name:'Casey · demo coordinator',roles:['Coordinator'],orgIds:['org-a','org-b']},
        {id:'customer-a',name:'Jordan · sample commercial customer',roles:['Customer Manager','Customer'],orgIds:['org-a']},
        {id:'customer-b',name:'Taylor · sample municipal customer',roles:['Customer'],orgIds:['org-b']}
      ])createUser(u,randomBytes(24).toString('hex'));
      db.exec('COMMIT');
    }catch(e){db.exec('ROLLBACK');db.close();throw e;}
  }
  if(!demo&&!db.prepare('SELECT id FROM users LIMIT 1').get()){
    if(!process.env.CUSTOMER_ADMIN_PASSWORD||process.env.CUSTOMER_ADMIN_PASSWORD.length<14){db.close();throw Error('Set CUSTOMER_ADMIN_PASSWORD to at least 14 characters for first shared-mode startup.');}
    createUser({id:'admin',name:'Workspace administrator',roles:['Administrator'],orgIds:['*']},process.env.CUSTOMER_ADMIN_PASSWORD);
  }
  const records=()=>db.prepare('SELECT * FROM records').all().map(unpack);
  function unpack(row){return row?{...JSON.parse(row.data),id:row.id,kind:row.kind,orgId:row.org_id,siteId:row.site_id,version:row.version}:null;}
  const raw=identifier=>typeof identifier==='string'?unpack(db.prepare('SELECT * FROM records WHERE id=?').get(identifier)):null;
  const requireRole=(user,...allowed)=>{if(!allowed.some(r=>user.roles.includes(r)))fail('Your role cannot perform this action.',403);};
  const qualified=user=>{requireRole(user,'Inspector');if(!user.qualified)fail('A designated qualified reviewer is required.',403);};
  const get=(identifier,user,kind)=>{const r=raw(identifier);if(!r||!canSee(user,r)||(kind&&r.kind!==kind)||(r.kind==='draft'&&r.createdBy!==user.id)||(r.kind==='guide'&&r.state!=='Approved'&&!isStaff(user)))fail('Record not found.',404);return r;};
  const org=(identifier,user)=>{const o=db.prepare('SELECT * FROM organizations WHERE id=?').get(identifier);if(!o||!canSee(user,{orgId:identifier}))fail('Organization not found.',404);return o;};
  const site=(identifier,user,orgId)=>{const r=get(identifier,user,'site');if(orgId&&r.orgId!==orgId)fail('Property belongs to another organization.',403);return r;};
  // A property membership alone never releases an unreviewed report or another person's draft upload.
  const mayReadFile=(row,user)=>{
    if(!canSee(user,{orgId:row.org_id,siteId:row.site_id}))return false;
    if(isStaff(user)||row.owner===user.id)return true;
    return records().some(r=>canSee(user,r)&&(
      (r.kind==='evidence'&&r.fileIds.includes(row.id))||
      (r.kind==='inspection'&&r.reportVersions.some(v=>v.fileId===row.id&&v.reviewedAt))||
      (r.kind==='finding'&&((r.sourceVerifiedAt&&r.sourceFileId===row.id)||r.extensions.some(e=>e.fileId===row.id)||r.externalAcceptance?.fileId===row.id||r.disputes?.some(d=>d.fileIds.includes(row.id))||r.acceptanceHistory?.some(a=>a.fileId===row.id)))||
      (r.kind==='permit'&&r.state==='Issued'&&r.applicabilityReviewed&&r.documentId===row.id)));
  };
  const file=(identifier,user,siteId,purpose)=>{if(typeof identifier!=='string'||!identifier)fail('File not found or not permitted for this record.',404);const row=db.prepare('SELECT * FROM files WHERE id=?').get(identifier);if(!row||!mayReadFile(row,user)||(siteId&&row.site_id!==siteId)||(purpose&&row.purpose!==purpose))fail('File not found or not permitted for this record.',404);return row;};
  const audit=(user,record,action)=>db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?,?)').run(id(),record?.orgId||null,record?.kind==='site'?record.id:record?.siteId||null,record?.id||null,user.id,action,now());
  function insert(kind,orgId,siteId,data,user){const r={...data,id:id(),kind,orgId,siteId:siteId||null,createdBy:user.id,createdAt:now(),updatedBy:user.id,updatedAt:now(),version:1};db.prepare('INSERT INTO records VALUES(?,?,?,?,?,1)').run(r.id,kind,orgId,r.siteId,JSON.stringify(r));audit(user,r,'Created '+kind);return r;}
  function update(record,user,version,action){if(Number(version)!==record.version)fail('This record changed. Refresh before saving.',409);record.updatedAt=now();record.updatedBy=user.id;const result=db.prepare('UPDATE records SET data=?,version=version+1 WHERE id=? AND version=?').run(JSON.stringify(record),record.id,record.version);if(result.changes!==1)fail('This record changed. Refresh before saving.',409);record.version++;audit(user,record,action);return record;}
  function atomic(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
  function member(identifier,record){const u=users().find(u=>u.id===identifier&&!u.disabled);if(!u||!canSee(u,record))fail('Choose an active teammate with access to this property.');return u.id;}
  function findingActor(user,r){if(!isStaff(user)&&!user.roles.includes('Customer Manager')&&r.assignedTo!==user.id)fail('Only the assignee or an authorized manager can update this correction.',403);}
  function ensureVersion(r,b){if(Number(b.version)!==r.version)fail('This record changed. Refresh before continuing.',409);}
  function upload(b,user){
    const s=site(b.siteId,user,b.orgId);const name=string(b.name,'File name',{required:true,max:180}),purpose=choice(b.purpose,['correction','report','permit','guide','authority','credential'],'file purpose');
    if(['report','permit','guide','authority'].includes(purpose))requireRole(user,'Administrator','Coordinator','Inspector');
    if(typeof b.data!=='string'||!b.data.length||b.data.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(b.data))fail('Invalid base64 file data.');
    const bytes=Buffer.from(b.data,'base64');
    const signatures={
      'application/pdf':bytes.toString('ascii',0,5)==='%PDF-',
      'image/png':bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
      'image/jpeg':bytes[0]===255&&bytes[1]===216&&bytes[2]===255,
      'image/webp':bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'
    };
    if(!signatures[b.mime]||bytes.length>10*1024*1024)fail('Use a matching PDF, PNG, JPEG or WebP file up to 10 MB.');
    if(!truth(b.permissionConfirmed))fail('Confirm you have permission to share this file.');
    const checksum=hash(bytes),existing=db.prepare('SELECT id FROM files WHERE org_id=? AND site_id=? AND checksum=? AND purpose=? AND owner=?').get(s.orgId,s.id,checksum,purpose,user.id);if(existing)return {id:existing.id};
    const identifier=id(),storage=identifier+({ 'application/pdf':'.pdf','image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp'}[b.mime]);
    writeFileSync(resolve(dataDir,'files',storage),bytes,{mode:0o600});
    db.prepare('INSERT INTO files VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(identifier,s.orgId,s.id,name,b.mime,bytes.length,checksum,storage,purpose,user.id,now());
    audit(user,{id:identifier,orgId:s.orgId,siteId:s.id},'Uploaded '+purpose+' file; signature validated, malware scanning unavailable');return {id:identifier};
  }
  function mutate(path,b,user){
    if(path==='/api/reminder-settings'){
      const leadDays=Number(b.leadDays);if(![7,14,30,60,90].includes(leadDays))fail('Choose a supported advance reminder window.');db.prepare('INSERT INTO metadata(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('reminders:'+user.id,JSON.stringify({leadDays}));audit(user,null,'Updated personal in-app advance reminder window');return {leadDays};
    }
    if(path==='/api/organizations'){
      requireRole(user,'Administrator');const identifier=id();db.prepare('INSERT INTO organizations VALUES(?,?,?)').run(identifier,string(b.name,'Organization name',{required:true,max:150}),choice(b.segment,['Commercial','Municipal','Business partner','Other'],'customer segment'));audit(user,{id:identifier,orgId:identifier},'Created organization');return {id:identifier};
    }
    if(path==='/api/users'){
      requireRole(user,'Administrator');const identifier=string(b.id,'Username',{required:true,max:60});if(!/^[a-z0-9_-]{3,60}$/.test(identifier)||db.prepare('SELECT id FROM users WHERE id=?').get(identifier))fail('Use a unique lowercase username of 3–60 letters, digits, underscores or hyphens.');
      const assignedRoles=arr(b.roles,'Roles');if(!assignedRoles.length||assignedRoles.some(r=>!roles.includes(r)))fail('Choose valid roles.');const orgIds=arr(b.orgIds,'Organizations'),siteIds=arr(b.siteIds||[],'Properties');
      if(assignedRoles.includes('Administrator')&&(!orgIds.includes('*')||orgIds.length!==1))fail('Workspace administrators must explicitly have global organization access.');
      if(!orgIds.length||orgIds.some(o=>o==='*'?!assignedRoles.includes('Administrator'):!db.prepare('SELECT id FROM organizations WHERE id=?').get(o)))fail('Assign valid organizations; only administrators can have global access.');
      for(const identifier of siteIds){const s=raw(identifier);if(!s||s.kind!=='site'||(!orgIds.includes('*')&&!orgIds.includes(s.orgId)))fail('Assigned properties must belong to the selected organizations.');}
      const password=string(b.password,'Password',{required:true,max:200});if(password.length<14)fail('Use a password of at least 14 characters.');createUser({id:identifier,name:string(b.name,'Name',{required:true,max:120}),roles:assignedRoles,orgIds,siteIds,qualified:truth(b.qualified)},password);audit(user,null,'Created team member '+identifier);return {id:identifier};
    }
    if(path.startsWith('/api/users/')){
      requireRole(user,'Administrator');const identifier=path.split('/').at(-1),target=users().find(u=>u.id===identifier);if(!target)fail('User not found.',404);if(identifier===user.id)fail('Use a separate administrator to change your own access.');
      if(b.disabled!==undefined)db.prepare('UPDATE users SET disabled=? WHERE id=?').run(truth(b.disabled)?1:0,identifier);
      if(b.password){const password=string(b.password,'Password',{required:true,max:200});if(password.length<14)fail('Use a password of at least 14 characters.');const salt=randomBytes(16).toString('hex');db.prepare('UPDATE users SET salt=?,password_hash=? WHERE id=?').run(salt,scryptSync(password,salt,64).toString('hex'),identifier);}
      db.prepare('DELETE FROM sessions WHERE user_id=?').run(identifier);audit(user,null,'Updated/revoked team access for '+identifier);return {ok:true};
    }
    if(path==='/api/files')return upload(b,user);
    if(path==='/api/sites'){
      requireRole(user,'Administrator','Coordinator');org(b.orgId,user);return insert('site',b.orgId,null,{name:string(b.name,'Property name',{required:true,max:150}),address:string(b.address,'Address',{max:300}),jurisdiction:string(b.jurisdiction,'Jurisdiction',{max:150}),contact:string(b.contact,'Responsible contact',{max:150}),propertyType:string(b.propertyType,'Property type',{max:150}),requirements:string(b.requirements,'Scope and applicable requirement sources'),notes:string(b.notes,'Notes')},user);
    }
    if(path==='/api/guides'){
      requireRole(user,'Administrator','Coordinator','Inspector');const s=site(b.siteId,user,b.orgId);return insert('guide',s.orgId,s.id,{title:string(b.title,'Guide title',{required:true,max:150}),body:string(b.body,'Preparation steps',{required:true,max:15000}),source:string(b.source,'Source reference',{required:true,max:1000}),state:'Draft',technical:truth(b.technical),inspectionType:string(b.inspectionType,'Applicable inspection type',{max:180}),owner:user.id},user);
    }
    if(path==='/api/inspections'){
      requireRole(user,'Administrator','Coordinator','Inspector');const s=site(b.siteId,user,b.orgId),type=choice(b.type,['Inspection','Re-inspection','Training','Service visit'],'inspection type'),parentId=string(b.parentId,'Original inspection',{max:80});
      const findingIds=arr(b.findingIds||[],'Linked findings');
      if(type==='Re-inspection'){
        const parent=get(parentId,user,'inspection');if(!['Completed','Reviewed'].includes(parent.state))fail('Complete the original inspection before scheduling a re-inspection.');if(parent.siteId!==s.id||!findingIds.length)fail('Link a re-inspection to the original inspection and at least one finding at the same property.');
        for(const identifier of findingIds){const f=get(identifier,user,'finding');if(f.inspectionId!==parentId||f.siteId!==s.id)fail('Re-inspection findings must belong to the original inspection.');}
      }
      let guideId=string(b.guideId,'Preparation guide',{max:80});if(guideId){const guide=get(guideId,user,'guide');if(guide.siteId!==s.id||guide.state!=='Approved')fail('Choose an approved guide for this property.');}
      const owner=member(b.owner,{orgId:s.orgId,siteId:s.id});
      return insert('inspection',s.orgId,s.id,{title:string(b.title,'Inspection title',{required:true,max:150}),type,state:b.scheduledAt?'Scheduled':'Draft',scheduledAt:instant(b.scheduledAt,'Scheduled time'),zone:zone(b.zone),inspectorOrganization:string(b.inspectorOrganization,'Inspector or organization',{max:300}),inspectorVerified:truth(b.inspectorVerified),scope:string(b.scope,'Inspection scope',{required:true}),source:string(b.source,'Scheduling source',{required:true,max:1000}),owner,guideId,parentId:type==='Re-inspection'?parentId:'',findingIds:type==='Re-inspection'?findingIds:[],prep:[{id:id(),title:'Confirm property access and responsible contact',owner,done:false},{id:id(),title:'Gather the records requested by the inspector',owner,done:false}],reportVersions:[],comments:[]},user);
    }
    if(path==='/api/findings'){
      qualified(user);const inspection=get(b.inspectionId,user,'inspection');const classification=choice(b.classification,sourceTypes,'finding classification'),deadlineType=choice(b.deadlineType,['Internal target','Contractual commitment','Agency deadline','Regulatory obligation','Unverified date'],'deadline type');
      if(classification==='Official citation'&&!['Agency deadline','Regulatory obligation'].includes(deadlineType))fail('Record the official agency/regulatory deadline classification for a citation.');
      const official=classification==='Official citation',source=string(b.source,'Source reference',{required:true,max:1500}),citationReference=string(b.citationReference,'Citation reference',{required:official,max:300}),authority=string(b.authority,'Issuing authority',{required:official,max:300});
      const jurisdiction=string(b.jurisdiction,'Jurisdiction',{required:official,max:300});
      let sourceFileId=string(b.sourceFileId,'Original source document',{required:official,max:80});if(sourceFileId)file(sourceFileId,user,inspection.siteId);
      if(official&&!truth(b.sourceReviewed))fail('Explicitly confirm the original citation and its source.');
      const originalDueDate=day(b.originalDueDate,'Original deadline',official);
      if(originalDueDate&&!string(b.deadlineSource,'Deadline source',{required:true,max:1500}))fail('A deadline source is required.');
      return insert('finding',inspection.orgId,inspection.siteId,{title:string(b.title,'Finding title',{required:true,max:180}),inspectionId:inspection.id,classification,category:choice(b.category,['Documentation','Equipment','Training','Access','Other'],'finding category'),severity:choice(b.severity,severities,'severity'),severityReviewed:truth(b.severityReviewed),location:string(b.location,'Precise location',{required:true,max:500}),description:string(b.description,'Finding description',{required:true,max:12000}),inspectorNotes:string(b.inspectorNotes,'Inspector notes',{max:12000}),source,citationReference,authority,jurisdiction,sourceFileId,sourceVerifiedAt:truth(b.sourceReviewed)?now():null,originalDueDate,deadlineType,deadlineSource:string(b.deadlineSource,'Deadline source',{max:1500}),zone:zone(b.zone),assignedTo:b.assignedTo?member(b.assignedTo,inspection):'',nextAction:string(b.nextAction,'Approved next action',{required:true,max:6000}),requiredReinspection:truth(b.requiredReinspection),agencyAcceptanceRequired:official||truth(b.agencyAcceptanceRequired),state:b.assignedTo?'Assigned':'Open',extensions:[],comments:[],externalAcceptance:null},user);
    }
    if(path==='/api/projects'){
      requireRole(user,'Administrator','Coordinator','Inspector','Customer Manager');const s=site(b.siteId,user,b.orgId);const start=day(b.start,'Planned start'),end=day(b.end,'Planned end');if(start&&end&&end<start)fail('Project end must follow its start.');return insert('project',s.orgId,s.id,{title:string(b.title,'Project name',{required:true,max:180}),scope:string(b.scope,'Project scope',{required:true}),jurisdiction:string(b.jurisdiction,'Project jurisdiction',{required:true,max:300}),start,end,state:'Needs applicability review',comments:[]},user);
    }
    if(path==='/api/permits'){
      requireRole(user,'Administrator','Coordinator','Inspector');const project=get(b.projectId,user,'project');return insert('permit',project.orgId,project.siteId,{title:string(b.title,'Potential permit',{required:true,max:180}),projectId:project.id,authority:string(b.authority,'Issuing authority',{max:300}),source:string(b.source,'Official source reference',{max:1500}),reason:string(b.reason,'Applicability rationale',{required:true}),owner:member(b.owner,project),zone:zone(b.zone),state:'Needs applicability review',applicabilityReviewed:false,conditions:'',expires:'',documentId:''},user);
    }
    if(path==='/api/tasks'){
      qualified(user);const f=get(b.findingId,user,'finding');return insert('task',f.orgId,f.siteId,{title:string(b.title,'Task title',{required:true,max:180}),findingId:f.id,body:string(b.body,'Reviewed action',{required:true}),source:string(b.source,'Source reference',{required:true,max:1500}),required:truth(b.required),rootCause:string(b.rootCause,'Root cause or contributing factors'),recurrence:choice(b.recurrence||'One time',['One time','Monthly','Quarterly','Annually'],'follow-up recurrence'),reviewed:true,reviewedBy:user.id,owner:member(b.owner,f),dueDate:day(b.dueDate,'Task deadline'),zone:zone(b.zone),state:'Open'},user);
    }
    if(path==='/api/credentials'){
      const s=site(b.siteId,user,b.orgId);return insert('credential',s.orgId,s.id,{title:string(b.title,'Relevant credential',{required:true,max:180}),issuer:string(b.issuer,'Issuing organization',{required:true,max:300}),source:string(b.source,'Source reference',{required:true,max:1000}),expires:day(b.expires,'Recorded expiry',true),zone:zone(b.zone),owner:member(b.owner,s),reviewed:false,state:'Tracking'},user);
    }
    if(path==='/api/messages'){
      const s=site(b.siteId,user,b.orgId);let relatedId=string(b.relatedId,'Related record',{max:80});if(relatedId){const related=get(relatedId,user);if(related.siteId!==s.id||!['inspection','finding','project'].includes(related.kind))fail('Choose an inspection, finding or project at the same property.');}return insert('message',s.orgId,s.id,{title:string(b.title,'Subject',{required:true,max:180}),relatedId,state:'New',thread:[{actor:user.id,text:string(b.text,'Message',{required:true}),at:now()}]},user);
    }
    const match=path.match(/^\/api\/(sites|guides|inspections|findings|projects|permits|tasks|messages|credentials)\/([^/]+)(?:\/([^/]+))?$/);if(!match)fail('Endpoint not found.',404);
    const [,collection,identifier,action]=match,r=get(identifier,user,({sites:'site',guides:'guide',inspections:'inspection',findings:'finding',projects:'project',permits:'permit',tasks:'task',messages:'message',credentials:'credential'})[collection]);ensureVersion(r,b);
    if(collection==='credentials'&&action==='review'){qualified(user);if(!truth(b.reviewConfirmed))fail('Confirm the credential applies and the issuer/source/expiry have been reviewed.');r.reviewed=true;r.reviewedBy=user.id;r.reviewedAt=now();return update(r,user,b.version,'Reviewed a recorded credential renewal source; not a validity guarantee');}
    if(collection==='credentials'&&action==='renew'){requireRole(user,'Inspector');qualified(user);r.expires=day(b.expires,'Verified replacement expiry',true);r.source=string(b.source,'Replacement source',{required:true,max:1000});r.reviewed=true;r.reviewedAt=now();r.reviewedBy=user.id;return update(r,user,b.version,'Recorded reviewed credential renewal; reminder targets replaced');}
    if(collection==='sites'&&!action){requireRole(user,'Administrator','Coordinator','Customer Manager');for(const k of ['name','address','jurisdiction','contact','propertyType','requirements','notes'])if(Object.hasOwn(b,k))r[k]=string(b[k],k,{required:k==='name',max:['notes','requirements'].includes(k)?4000:300});return update(r,user,b.version,'Updated property profile');}
    if(collection==='guides'&&action==='approve'){qualified(user);if(!truth(b.reviewConfirmed))fail('Confirm qualified review of the guide and its sources.');r.state='Approved';r.reviewedBy=user.id;r.reviewedAt=now();return update(r,user,b.version,'Approved preparation guide after qualified review');}
    if(collection==='guides'&&!action){requireRole(user,'Administrator','Coordinator','Inspector');r.title=string(b.title,'Title',{required:true,max:150});r.body=string(b.body,'Preparation steps',{required:true,max:15000});r.source=string(b.source,'Source',{required:true,max:1000});r.inspectionType=string(b.inspectionType,'Applicable inspection type',{max:180});r.state='Draft';delete r.reviewedAt;delete r.reviewedBy;return update(r,user,b.version,'Edited preparation guide; approval invalidated');}
    if(collection==='inspections'){
      if(action==='confirm'){if(r.state!=='Scheduled')fail('Only a scheduled appointment can be confirmed.');r.customerConfirmation={by:user.id,at:now()};return update(r,user,b.version,'Customer confirmed appointment; attendance is not inspection acceptance');}
      if(action==='prep-owner'){requireRole(user,'Administrator','Coordinator','Inspector','Customer Manager');const task=r.prep.find(t=>t.id===b.taskId);if(!task)fail('Preparation task not found.');task.owner=member(b.owner,r);task.dueDate=day(b.dueDate,'Preparation deadline');task.updatedBy=user.id;task.updatedAt=now();return update(r,user,b.version,'Assigned preparation owner and milestone');}

      if(action==='prepare'){const task=r.prep.find(t=>t.id===b.taskId);if(!task)fail('Preparation task not found.');task.done=truth(b.done);task.updatedBy=user.id;task.updatedAt=now();return update(r,user,b.version,'Updated preparation task; does not constitute an inspection pass');}
      if(action==='schedule'){requireRole(user,'Administrator','Coordinator','Inspector');if(['Completed','Reviewed'].includes(r.state))fail('A completed inspection retains its schedule history; create a new inspection.');r.scheduledAt=instant(b.scheduledAt,'Scheduled time',true);r.zone=zone(b.zone);r.state='Scheduled';return update(r,user,b.version,'Scheduled/rescheduled inspection; reminder targets recalculated');}
      if(action==='cancel'){requireRole(user,'Administrator','Coordinator','Inspector');if(['Completed','Reviewed'].includes(r.state))fail('Completed records cannot be cancelled.');r.state='Cancelled';return update(r,user,b.version,'Cancelled inspection and its active reminder targets');}
      if(action==='report'){
        requireRole(user,'Administrator','Coordinator','Inspector');if(r.state==='Cancelled')fail('Cancelled inspection cannot receive a completion report.');file(b.fileId,user,r.siteId,'report');r.actualAt=instant(b.actualAt,'Actual inspection time',true);if(Date.parse(r.actualAt)>Date.now()+300000)fail('Actual completion time cannot be in the future.');r.reportVersions.push({fileId:b.fileId,uploadedBy:user.id,uploadedAt:now()});r.reportId=b.fileId;r.previousApprovedReportId=r.approvedReportId||r.previousApprovedReportId||'';delete r.approvedReportId;delete r.outcome;delete r.reviewedAt;delete r.reviewedBy;r.state='Completed';return update(r,user,b.version,'Attached inspection report; review required; previous versions preserved');
      }
      if(action==='review'){
        qualified(user);if(r.state!=='Completed'||!r.reportId)fail('Complete the inspection and attach its report first.');if(!truth(b.reviewConfirmed))fail('Confirm review of the report and its recorded scope.');r.outcome=choice(b.outcome,['Accepted','Follow-up required'],'inspection outcome');r.reviewedAt=now();r.reviewedBy=user.id;r.approvedReportId=r.reportId;Object.assign(r.reportVersions.at(-1),{reviewedAt:r.reviewedAt,reviewedBy:user.id,outcome:r.outcome});r.state='Reviewed';return update(r,user,b.version,'Reviewed inspection report: '+r.outcome);
      }
    }
    if(collection==='findings'){
      if(action==='dispute'){findingActor(user,r);const note=string(b.note,'Dispute grounds',{required:true});const fileIds=arr(b.fileIds||[],'Supporting files');for(const identifier of fileIds)file(identifier,user,r.siteId,'correction');r.disputes ||= [];r.disputes.push({note,fileIds,by:user.id,at:now(),state:'Recorded; authority decision not confirmed'});return update(r,user,b.version,'Recorded finding dispute; deadlines remain in effect');}

      if(action==='assign'){requireRole(user,'Administrator','Coordinator','Inspector','Customer Manager');if(r.state==='Closed')fail('Closed findings cannot be reassigned without reopening.');r.assignedTo=member(b.assignedTo,r);if(r.state==='Open')r.state='Assigned';return update(r,user,b.version,'Assigned corrective action');}
      if(action==='start'){findingActor(user,r);if(!['Open','Assigned','Changes requested'].includes(r.state))fail('This correction cannot be started from its current state.');r.state='In progress';r.acknowledgedAt ||= now();return update(r,user,b.version,'Started corrective action');}
      if(action==='draft'||action==='proof'){
        findingActor(user,r);if(!['Open','Assigned','In progress','Changes requested'].includes(r.state))fail('This finding is not accepting correction submissions.');const fileIds=arr(b.fileIds||[],'Evidence files');for(const identifier of fileIds)file(identifier,user,r.siteId,'correction');const note=string(b.note,'Correction notes',{max:12000});
        const existing=records().find(d=>d.kind==='draft'&&d.findingId===r.id&&d.createdBy===user.id&&d.state==='Draft');
        if(action==='draft'){const data={findingId:r.id,fileIds,note,state:'Draft'};return existing?update(Object.assign(existing,data),user,existing.version,'Saved correction draft'):insert('draft',r.orgId,r.siteId,data,user);}
        if(!fileIds.length&&note.length<20)fail('Attach correction evidence or explain the correction in at least 20 characters.');
        const evidence=insert('evidence',r.orgId,r.siteId,{findingId:r.id,fileIds,note,state:'Pending review',submittedBy:user.id,submittedAt:now()},user);r.latestEvidenceId=evidence.id;r.state='Evidence submitted';r.correctedAt=now();if(existing)update(Object.assign(existing,{state:'Submitted',evidenceId:evidence.id}),user,existing.version,'Submitted saved correction draft');return update(r,user,b.version,'Submitted proof of correction; verification pending');
      }
      if(action==='review'){
        qualified(user);if(r.state!=='Evidence submitted')fail('Evidence must be submitted before review.');const e=get(r.latestEvidenceId,user,'evidence');if(e.submittedBy===user.id)fail('You cannot verify your own correction evidence.');if(b.decision==='Approve correction'&&!truth(b.reviewConfirmed))fail('Confirm review of the correction evidence.');const decision=choice(b.decision,['Approve correction','Request more evidence'],'review decision'),note=string(b.note,'Reviewer notes',{required:true});e.reviewedBy=user.id;e.reviewedAt=now();e.reviewNote=note;e.state=decision==='Approve correction'?'Accepted internally':'More evidence requested';update(e,user,e.version,'Reviewed correction evidence');r.state=decision==='Approve correction'?'Correction verified':'Changes requested';if(decision==='Approve correction'){r.verifiedAt=now();r.verifiedBy=user.id;}return update(r,user,b.version,'Correction evidence decision: '+decision);
      }
      if(action==='extension'){
        qualified(user);if(r.state==='Closed')fail('Reopen a closed finding before changing its deadline record.');const dueDate=day(b.dueDate,'Authorized extended deadline',true);if(!r.originalDueDate||dueDate<=(r.extensions.at(-1)?.dueDate||r.originalDueDate))fail('An extension must follow the current recorded deadline.');file(b.fileId,user,r.siteId,'authority');r.extensions.push({dueDate,authority:string(b.authority,'Authorizing authority',{required:true,max:300}),reason:string(b.reason,'Extension basis',{required:true}),fileId:b.fileId,recordedBy:user.id,recordedAt:now()});return update(r,user,b.version,'Recorded documented deadline extension; original deadline preserved');
      }
      if(action==='acceptance'){
        qualified(user);file(b.fileId,user,r.siteId,'authority');r.acceptanceHistory ||= [];if(r.externalAcceptance)r.acceptanceHistory.push(r.externalAcceptance);r.externalAcceptance={authority:string(b.authority,'Accepting authority',{required:true,max:300}),reference:string(b.reference,'Acceptance reference',{required:true,max:1000}),acceptedAt:day(b.acceptedAt,'Acceptance date',true),fileId:b.fileId,recordedBy:user.id,recordedAt:now(),source:'Staff-recorded external acceptance; no agency API confirmation'};if(r.externalAcceptance.acceptedAt>localDay())fail('Acceptance date cannot be in the future.');return update(r,user,b.version,'Recorded documented external acceptance');
      }
      if(action==='close'){
        qualified(user);if(r.state!=='Correction verified')fail('Qualified correction verification is required before closure.');
        if(r.requiredReinspection&&!records().some(i=>i.kind==='inspection'&&i.type==='Re-inspection'&&i.parentId===r.inspectionId&&i.findingIds.includes(r.id)&&i.state==='Reviewed'&&i.outcome==='Accepted'))fail('An accepted, reviewed re-inspection linked to this finding is required.');
        if(r.agencyAcceptanceRequired&&!r.externalAcceptance)fail('Document the required external authority acceptance before closure.');r.state='Closed';r.closedAt=now();r.closedBy=user.id;return update(r,user,b.version,'Closed verified finding after required acceptance checks');
      }
      if(action==='reopen'){qualified(user);if(r.state!=='Closed')fail('Only closed findings can be reopened.');r.reopenReason=string(b.reason,'Reason to reopen',{required:true});r.state='In progress';return update(r,user,b.version,'Reopened finding: '+r.reopenReason);}
    }
    if(collection==='permits'&&action==='review'){
      qualified(user);r.source=string(b.source,'Official source reference',{required:true,max:1500});r.authority=string(b.authority,'Issuing authority',{required:true,max:300});if(!truth(b.reviewConfirmed))fail('Confirm qualified review of applicability and the source.');r.applicabilityReviewed=true;r.reviewedAt=now();r.reviewedBy=user.id;r.reason=string(b.reason,'Applicability rationale',{required:true});r.state=choice(b.state,['Not started','In preparation','Submitted','Issued','Denied','Not applicable'],'permit state');r.conditions=string(b.conditions,'Recorded authority conditions');r.expires=day(b.expires,'Permit expiry');
      if(r.state==='Issued'){file(b.documentId,user,r.siteId,'permit');r.documentId=b.documentId;r.issuedAt=day(b.issuedAt,'Issue date',true);if(r.expires&&r.expires<r.issuedAt)fail('Permit expiry must follow issue date.');}
      return update(r,user,b.version,'Recorded reviewed permit applicability/status; not authorization to proceed');
    }
    if(collection==='permits'&&action==='application'){r.applicationReference=string(b.reference,'Application reference',{required:true,max:1000});if(['Needs applicability review','Not started','In preparation','Submitted'].includes(r.state))r.state='Submitted';else fail('This permit is no longer in the application stage.');return update(r,user,b.version,'Recorded application submission; not an issued permit');}
    if(collection==='tasks'&&action==='complete'){if(r.state==='Completed')fail('This task is already completed.');if(!isStaff(user)&&r.owner!==user.id&&!user.roles.includes('Customer Manager'))fail('Only the assigned owner or manager can complete this task.',403);r.state='Completed';r.completedAt=now();const saved=update(r,user,b.version,'Completed task; linked finding remains independent');if(r.recurrence&&r.recurrence!=='One time'){const base=r.dueDate||localDay(),[year,month,date]=base.split('-').map(Number),advance=({Monthly:1,Quarterly:3,Annually:12})[r.recurrence],target=new Date(Date.UTC(year,month-1+advance,1)),last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();target.setUTCDate(Math.min(date,last));insert('task',r.orgId,r.siteId,{title:r.title,body:r.body,source:r.source,required:r.required,rootCause:r.rootCause,recurrence:r.recurrence,reviewed:r.reviewed,reviewedBy:r.reviewedBy,owner:r.owner,dueDate:target.toISOString().slice(0,10),zone:r.zone,state:'Open',findingId:r.findingId,previousTaskId:r.id},user);}return saved;}
    if(action==='comment'&&['findings','inspections','projects'].includes(collection)){r.comments ||= [];r.comments.push({actor:user.id,text:string(b.text,'Comment',{required:true}),at:now()});if(isStaff(user)&&r.kind==='finding')r.firstResponseAt ||= now();return update(r,user,b.version,'Added record comment');}
    if(collection==='messages'&&action==='reply'){r.thread.push({actor:user.id,text:string(b.text,'Reply',{required:true}),at:now()});r.state=isStaff(user)?'Awaiting customer':'New';return update(r,user,b.version,'Added portal message reply; no email/SMS sent');}
    fail('This action is not supported. Original citations and source records are not editable.',400);
  }
  const loginAttempts=new Map();
  const server=http.createServer(async(req,res)=>{
    const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
    try{
      const url=new URL(req.url,'http://localhost');
      if(!url.pathname.startsWith('/api/')){
        if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
        const routes={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/style.css':'style.css'};
        if(['/prototype','/prototype/'].includes(url.pathname)){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:readFileSync(resolve(root,'index.html')));return;}
        const path=routes[url.pathname];if(!path)fail('Page not found.',404);
        res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
        res.writeHead(200,{'Content-Type':{'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'}[extname(path)],'Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:readFileSync(resolve(root,'public',path)));return;
      }
      if(!['GET','POST','PUT'].includes(req.method))fail('Method not allowed.',405);
      let body={};
      if(req.method!=='GET'){
        const expected=process.env.CUSTOMER_PUBLIC_ORIGIN||`${secure?'https':'http'}://${req.headers.host}`;
        if(req.headers.origin&&req.headers.origin!==expected)fail('Cross-origin request rejected.',403);
        if(!req.headers['content-type']?.startsWith('application/json'))fail('Use JSON request bodies.',415);
        let rawBody='';for await(const chunk of req){rawBody+=chunk;if(rawBody.length>16*1024*1024)fail('Request too large.',413);}try{body=rawBody?JSON.parse(rawBody):{};}catch{fail('Invalid JSON.');}if(!body||typeof body!=='object'||Array.isArray(body))fail('JSON object required.');
      }
      const cookie=req.headers.cookie?.match(/(?:^|; )cstc_customer_session=([a-f0-9]{64})/)?.[1];
      const session=cookie&&db.prepare('SELECT user_id FROM sessions WHERE token_hash=? AND expires>?').get(hash(cookie),Date.now());
      const user=session&&users().find(u=>u.id===session.user_id&&!u.disabled);
      if(url.pathname==='/api/bootstrap'&&req.method==='GET')return send(200,{demo,user:user||null,users:demo?users().filter(u=>!u.disabled):[],roles});
      if(url.pathname==='/api/session'&&req.method==='POST'){
        const key=req.socket.remoteAddress;let attempt=loginAttempts.get(key);if(!attempt||attempt.until<Date.now())attempt={count:0,until:Date.now()+60000};loginAttempts.set(key,attempt);if(++attempt.count>20)fail('Too many sign-in attempts; wait a minute.',429);if(loginAttempts.size>2000)loginAttempts.delete(loginAttempts.keys().next().value);
        const row=db.prepare('SELECT * FROM users WHERE id=?').get(string(body.id,'Username',{max:60}));if(!row||row.disabled||(!demo&&!timingSafeEqual(scryptSync(string(body.password,'Password',{max:200}),row.salt,64),Buffer.from(row.password_hash,'hex'))))fail('Invalid sign-in credentials.',401);
        const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),row.id,Date.now()+8*3600000);res.setHeader('Set-Cookie',`cstc_customer_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure?'; Secure':''}`);return send(200,{ok:true});
      }
      if(!user)fail('Sign in to the customer workspace.',401);
      if(url.pathname==='/api/logout'&&req.method==='POST'){db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(cookie));res.setHeader('Set-Cookie','cstc_customer_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');return send(200,{ok:true});}
      if(url.pathname==='/api/state'&&req.method==='GET'){
        let visible=records().filter(r=>canSee(user,r)&&(r.kind!=='draft'||r.createdBy===user.id));
        if(!isStaff(user))visible=visible.filter(r=>r.kind!=='guide'||r.state==='Approved');
        const orgs=db.prepare('SELECT * FROM organizations').all().filter(o=>canSee(user,{orgId:o.id}));
        const members=users().filter(u=>user.roles.includes('Administrator')||u.id===user.id||visible.some(r=>r.kind==='site'&&canSee(u,r))).map(({id,name,roles,qualified,disabled,orgIds,siteIds})=>({id,name,roles,qualified,disabled,orgIds:user.roles.includes('Administrator')?orgIds:orgIds.filter(o=>o==='*'||orgs.some(org=>org.id===o)),siteIds:user.roles.includes('Administrator')?siteIds:siteIds.filter(siteId=>visible.some(r=>r.id===siteId&&r.kind==='site'))}));
        const activity=db.prepare('SELECT * FROM audit ORDER BY at DESC LIMIT 1000').all().filter(a=>canSee(user,{orgId:a.org_id,siteId:a.site_id})).slice(0,100);
        const files=db.prepare('SELECT id,org_id,site_id,name,mime,bytes,checksum,purpose,owner,created_at FROM files').all().filter(f=>mayReadFile(f,user));
        const reminderSettings=JSON.parse(db.prepare('SELECT value FROM metadata WHERE key=?').get('reminders:'+user.id)?.value||'{"leadDays":30}');
        return send(200,{demo,user,reminderSettings,organizations:orgs,records:visible,users:members,files,activity,summary:summaries(visible),reminders:reminderRecords(visible,now(),reminderSettings.leadDays),serverTime:now(),notifications:'In-app while open. No email/SMS provider, background delivery or agency integration configured.'});
      }
      const fileMatch=url.pathname.match(/^\/api\/files\/([^/]+)$/);
      if(fileMatch&&req.method==='GET'){
        const f=file(fileMatch[1],user);const inline=url.searchParams.get('inline')==='1'&&f.mime.startsWith('image/');res.writeHead(200,{'Content-Type':f.mime,'Content-Disposition':`${inline?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(f.name)}`,'Cache-Control':'private, no-store','Content-Security-Policy':"default-src 'none'; sandbox"});res.end(readFileSync(resolve(dataDir,'files',f.storage_name)));return;
      }
      const recordMatch=url.pathname.match(/^\/api\/records\/([^/]+)$/);if(recordMatch&&req.method==='GET')return send(200,get(recordMatch[1],user));
      if(req.method==='GET')fail('Endpoint not found.',404);
      return send(200,atomic(()=>mutate(url.pathname,body,user)));
    }catch(e){if(!res.headersSent)send(e.status||500,{error:e.status?e.message:'Unexpected server error.'});else res.end();}
  });
  return {server,db};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const {server}=createCustomerApp();const port=Number(process.env.CUSTOMER_PORT||3001);server.listen(port,process.env.CUSTOMER_HOST||'0.0.0.0',()=>console.log(`CSTC Customer Dashboard: http://localhost:${port} · ${process.env.CUSTOMER_DEMO_MODE==='false'?'shared authenticated mode':'DEMO identities and illustrative records'}`));
}
