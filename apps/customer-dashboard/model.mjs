import {randomUUID} from 'node:crypto';

export const roles=['Administrator','Coordinator','Inspector','Customer Manager','Customer'];
export const severities=['Unreviewed','Low','Moderate','High','Critical'];
export const sourceTypes=['Official citation','Consultant finding','Internal observation','Recommendation'];
export const findingStates=['Open','Assigned','In progress','Evidence submitted','Changes requested','Correction verified','Closed'];
export const id=()=>randomUUID();
export const now=()=>new Date().toISOString();
export function fail(message,status=400){throw Object.assign(new Error(message),{status});}
export function string(value,label,{required=false,max=4000}={}){
  if(value===undefined||value===null)value='';
  if(typeof value!=='string'||value.length>max)fail(`${label} must be text of at most ${max} characters.`);
  value=value.trim();if(required&&!value)fail(`${label} is required.`);return value;
}
export function choice(value,options,label){if(!options.includes(value))fail(`Choose a valid ${label}.`);return value;}
export function day(value,label='Date',required=false){
  value=string(value,label,{required,max:10});
  if(value&&(!/^\d{4}-\d\d-\d\d$/.test(value)||!Number.isFinite(Date.parse(value+'T12:00:00Z'))||new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value))fail(`${label} must be a valid calendar date.`);
  return value;
}
export function instant(value,label='Timestamp',required=false){
  value=string(value,label,{required,max:40});
  if(value&&(!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{3})?)?(Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value))))fail(`${label} needs a valid ISO timestamp with Z or an explicit UTC offset.`);
  if(value)day(value.slice(0,10),label,true);
  return value;
}
export function zone(value='America/Los_Angeles'){
  value=string(value,'Time zone',{required:true,max:80});try{new Intl.DateTimeFormat('en',{timeZone:value}).format();}catch{fail('Use a valid IANA time zone.');}return value;
}
export function localDay(value=now(),timeZone='America/Los_Angeles'){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value)).map(p=>[p.type,p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function isStaff(user){return user.roles.some(r=>['Administrator','Coordinator','Inspector'].includes(r));}
export function canSee(user,record){
  const location=record.kind==='site'?record.id:record.siteId;
  return (user.orgIds.includes('*')||user.orgIds.includes(record.orgId))&&(!location||!user.siteIds.length||user.siteIds.includes(location));
}
export function effectiveDue(finding){return finding.extensions?.at(-1)?.dueDate||finding.originalDueDate||'';}
export function reminderRecords(records,at=now(),leadDays=30){
  const result=[];
  for(const record of records){
    if(record.kind==='finding'&&record.state!=='Closed'&&effectiveDue(record))result.push({id:record.id,siteId:record.siteId,title:record.title,kind:'Correction deadline',date:effectiveDue(record),zone:record.zone,owner:record.assignedTo||'',verified:record.deadlineType!=='Unverified date'});
    if(record.kind==='inspection'&&record.state==='Scheduled'&&record.scheduledAt)result.push({id:record.id,siteId:record.siteId,title:record.title,kind:record.type,date:localDay(record.scheduledAt,record.zone),zone:record.zone,owner:record.owner||'',verified:true});
    if(record.kind==='permit'&&record.expires&&record.state==='Issued')result.push({id:record.id,siteId:record.siteId,title:record.title,kind:'Permit expiry',date:record.expires,zone:record.zone||'America/Los_Angeles',owner:record.owner||'',verified:record.applicabilityReviewed});
    if(record.kind==='credential'&&record.state==='Tracking'&&record.expires)result.push({id:record.id,siteId:record.siteId,title:record.title,kind:'Credential renewal',date:record.expires,zone:record.zone,owner:record.owner,verified:record.reviewed});
    if(record.kind==='task'&&record.state!=='Completed'&&record.dueDate)result.push({id:record.id,siteId:record.siteId,title:record.title,kind:record.required?'Required corrective task':'Preventive recommendation',date:record.dueDate,zone:record.zone||'America/Los_Angeles',owner:record.owner||'',verified:record.reviewed});
  }
  for(const r of records.filter(r=>r.kind==='inspection'&&r.state==='Scheduled'))for(const t of r.prep||[])if(!t.done&&t.dueDate)result.push({id:r.id,siteId:r.siteId,title:t.title,kind:'Preparation milestone',date:t.dueDate,zone:r.zone,owner:t.owner,verified:true});
  return result.map(r=>({...r,status:!r.verified?'Verify source':r.date<localDay(at,r.zone)?'Overdue':r.date===localDay(at,r.zone)?'Due today':'Upcoming',leadDays,advanceWindow:Math.round((Date.parse(r.date+'T12:00:00Z')-Date.parse(localDay(at,r.zone)+'T12:00:00Z'))/86400000)<=leadDays?'Within advance window':'Later',delivery:'In-app only; email/SMS not configured'})).sort((a,b)=>a.date.localeCompare(b.date));
}
export function summaries(records,at=now()){
  const findings=records.filter(r=>r.kind==='finding'),inspections=records.filter(r=>r.kind==='inspection'),open=findings.filter(f=>f.state!=='Closed');
  const reminders=reminderRecords(records,at);
  const median=values=>{values=values.filter(v=>Number.isFinite(v)&&v>=0).sort((a,b)=>a-b);return values.length?Math.round((values[Math.floor((values.length-1)/2)]+values[Math.ceil((values.length-1)/2)])/2*10)/10:null;};
  return {
    critical:open.filter(f=>f.severity==='Critical'&&f.severityReviewed).length,
    overdue:reminders.filter(r=>r.status==='Overdue').length,
    pendingEvidence:findings.filter(f=>f.state==='Evidence submitted').length,
    awaitingReinspection:open.filter(f=>f.requiredReinspection&&!inspections.some(i=>i.type==='Re-inspection'&&i.parentId===f.inspectionId&&i.findingIds?.includes(f.id)&&i.state==='Reviewed'&&i.outcome==='Accepted')).length,
    upcoming:Object.fromEntries([7,30,90].map(days=>[days,inspections.filter(i=>i.state==='Scheduled'&&i.scheduledAt&&Date.parse(i.scheduledAt)>=Date.parse(at)&&Date.parse(i.scheduledAt)<=Date.parse(at)+days*86400000).length])),
    findings:{pending:open.filter(f=>['Open','Assigned'].includes(f.state)).length,active:open.filter(f=>!['Open','Assigned'].includes(f.state)).length,closed:findings.filter(f=>f.state==='Closed').length},
    medianVerificationHours:median(findings.filter(f=>f.correctedAt&&f.verifiedAt).map(f=>(Date.parse(f.verifiedAt)-Date.parse(f.correctedAt))/3600000)),
    sites:records.filter(r=>r.kind==='site').map(site=>{
      const fs=open.filter(f=>f.siteId===site.id),reviewed=inspections.filter(i=>i.siteId===site.id&&i.state==='Reviewed').sort((a,b)=>(b.reviewedAt||'').localeCompare(a.reviewedAt||''));
      const overdue=reminders.some(r=>r.siteId===site.id&&r.status==='Overdue'),unknown=records.some(r=>r.siteId===site.id&&((r.kind==='credential'&&!r.reviewed)||(r.kind==='permit'&&!r.applicabilityReviewed)))||!reviewed.length;
      const status=fs.some(f=>f.severity==='Critical'&&f.severityReviewed)?'Critical action required':fs.some(f=>['Evidence submitted','Correction verified'].includes(f.state))&&fs.every(f=>['Evidence submitted','Correction verified'].includes(f.state))?'Awaiting verification':fs.length||overdue?'Action needed':unknown?'Unknown / incomplete':'No open findings in reviewed records';
      return {id:site.id,name:site.name,status,open:fs.length,lastReviewedAt:reviewed[0]?.reviewedAt||null,reviewedBy:reviewed[0]?.reviewedBy||null,scope:'Recorded inspections and findings only; not a guarantee of legal compliance'};
    })
  };
}

export function demonstrationSeed(){
  const scheduled=new Date(Date.now()+7*86400000).toISOString(),due=localDay(new Date(Date.now()+5*86400000).toISOString());
  const base=(id,kind,orgId,siteId,data)=>({id,kind,orgId,siteId,...data,illustrative:true,createdAt:now(),updatedAt:now()});
  return {
    organizations:[{id:'org-a',name:'Sample commercial customer',segment:'Commercial'},{id:'org-b',name:'Sample municipal customer',segment:'Municipal'}],
    records:[
      base('site-a','site','org-a',null,{name:'Sample facility A',address:'Address needs verification',jurisdiction:'Confirm jurisdiction',contact:'Sample property coordinator',notes:'Fictional location only.'}),
      base('site-a2','site','org-a',null,{name:'Sample facility B',address:'Not supplied',jurisdiction:'Not verified',contact:'',notes:'No reviewed inspection records yet.'}),
      base('site-b','site','org-b',null,{name:'Sample municipal property','address':'Not supplied',jurisdiction:'Not verified',contact:'',notes:'Separate customer workspace.'}),
      base('guide-a','guide','org-a','site-a',{title:'Sample preparation checklist',source:'Illustrative planning template, not agency instructions',body:'Confirm access and the coordinator. Gather relevant prior reports. Identify records requested by the inspector. Confirm the actual inspection scope with the responsible organization.',state:'Approved',reviewedBy:'inspector',reviewedAt:now(),technical:false}),
      base('inspection-a','inspection','org-a','site-a',{title:'Sample site inspection',type:'Inspection',state:'Scheduled',scheduledAt:scheduled,zone:'America/Los_Angeles',owner:'coordinator',scope:'Illustrative inspection only; verify the real scope before use.',source:'Illustrative manual record',guideId:'guide-a',parentId:'',findingIds:[],prep:[{id:'access',title:'Confirm property access with the coordinator',owner:'customer-a',done:false},{id:'records',title:'Gather relevant prior reports',owner:'customer-a',done:false}],reportVersions:[],comments:[]}),
      base('finding-a','finding','org-a','site-a',{title:'Example unresolved finding',inspectionId:'inspection-a',classification:'Internal observation',category:'Documentation',severity:'Critical',severityReviewed:true,location:'Sample area A',description:'Demonstration only. This is not a report of an actual hazardous condition.',inspectorNotes:'Qualified staff must inspect and document the actual condition before operational use.',source:'Illustrative source record',citationReference:'',authority:'',jurisdiction:'Not verified',sourceVerifiedAt:now(),originalDueDate:due,deadlineType:'Internal target',deadlineSource:'Illustrative internal planning date',zone:'America/Los_Angeles',assignedTo:'customer-a',nextAction:'Review this sample finding and discuss the actual next step with the assigned coordinator.',requiredReinspection:false,agencyAcceptanceRequired:false,state:'Assigned',extensions:[],comments:[],externalAcceptance:null}),
    ]
  };
}
