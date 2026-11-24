import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seed, platforms, roles } from './seed.mjs';
import {simulateQueue, cancelJobs} from './publishing-simulation.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const fail = (message, status=400) => { const e=new Error(message); e.status=status; throw e; };
const technicalGuidance = p => p.technical || /\b(OSHA|Cal\/?OSHA|regulation|required by law|must wear|exposure limit|heat index|lock.?out steps|compliance guarantee)\b/i.test(p.caption||'');
const safeUrl = value => { try {const u=new URL(value); return ['http:','https:'].includes(u.protocol) && !u.username && !u.password;} catch {return false;} };
const accountUrl = (value,platform) => {try {const host=new URL(value).hostname;const domain={Instagram:'instagram.com',TikTok:'tiktok.com',Facebook:'facebook.com',LinkedIn:'linkedin.com'}[platform];return safeUrl(value) && domain && (host===domain || host.endsWith('.'+domain));}catch{return false;}};
export function checks(post, state) {
  const errors=[], warnings=[];
  if(!post.caption?.trim()) errors.push('A caption is required.');
  const rule=state.settings.requirements[post.platform];
  if(!rule?.reviewedAt) errors.push('Administrator must review current official platform requirements.');
  if(rule && post.caption?.length>Number(rule.maxText)) errors.push('Caption exceeds the configured platform limit.');
  if(!rule?.formats.includes(post.format)) errors.push('Format is not enabled in platform requirements.');
  if(!state.settings.accounts[post.platform]?.verified || !accountUrl(state.settings.accounts[post.platform]?.url,post.platform)) errors.push('Confirm the destination account in Settings.');
  if(!post.factsConfirmed) errors.push('Verify all company facts and claims.');
  if(technicalGuidance(post) && !post.technicalApproved) errors.push('A qualified reviewer must review technical safety guidance.');
  if(!['Approved','Ready to Post','Posted'].includes(post.status)) errors.push('Content approval is required.');
  if(post.format!=='Text' && !post.assetIds?.length) errors.push('This format requires uploaded media.');
  if(rule?.maxAssets && (post.assetIds||[]).length>Number(rule.maxAssets)) errors.push('Too many media assets for the configured format.');
  for(const id of post.assetIds||[]) {
    const a=state.assets.find(a=>a.id===id);
    if(!a || a.status!=='Approved' || !a.rights || a.restricted || (a.expires && new Date(a.expires+'T23:59:59Z')<new Date())) errors.push('An asset is missing, unapproved, restricted, expired, or lacks permission.');
    if(a && rule?.maxMediaBytes && a.bytes>Number(rule.maxMediaBytes)) errors.push('Media exceeds the configured platform file size.');
    if(a && post.format==='Video' && !a.mime.startsWith('video/')) errors.push('Video posts require video assets.');
    if(a && ['Image','Carousel'].includes(post.format) && !a.mime.startsWith('image/')) errors.push('Image and carousel posts require image assets.');
  }
  if(post.cta==='Call' && (!state.brand.contactsVerified || !/^\+\d{8,15}$/.test(state.brand.phone))) errors.push('A verified phone number is required.');
  if(post.cta==='Email' && (!state.brand.contactsVerified || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.brand.email))) errors.push('A verified email address is required.');
  if(post.cta==='DM' && (!safeUrl(state.brand.dm) || !state.brand.dmVerified)) errors.push('A verified messaging destination is required.');
  if(post.cta==='Bio' && !state.brand.bioConfirmed) errors.push('Confirm the bio link before using this call to action.');
  if(post.cta==='Website' && !safeUrl(state.brand.website)) errors.push('A valid website is required.');
  const links=post.caption?.match(/[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s]+/g)||[];
  if(links.some(l=>!safeUrl(l))) errors.push('Malformed link in caption.');
  if(links.length) warnings.push('Link syntax checked only. Destination availability has not been checked; open each link before posting.');
  if(/guarantee|100% safe|fully compliant|certified/i.test(post.caption||'')) warnings.push('Potential safety or certification claim: substantiate with current evidence.');
  if(!post.alt && post.format!=='Text') warnings.push('Add accessibility text for the media.');
  if(['Instagram','TikTok'].includes(post.platform) && links.length) warnings.push('Caption links may not be clickable. Confirm a supported contact or bio option.');
  if(state.posts.some(p=>p.id!==post.id && p.platform===post.platform && (p.caption===post.caption || (p.planned && p.planned===post.planned)))) errors.push('Duplicate caption or posting slot on this platform.');
  if(!post.planned) warnings.push('No calendar reminder is set.');
  return {errors:[...new Set(errors)], warnings:[...new Set(warnings)]};
}
function validateDates(p) {
  for(const key of ['planned','deadline']) if(p[key] && (!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{3})?)?(Z|[+-]\d\d:\d\d)$/.test(p[key]) || !Number.isFinite(Date.parse(p[key])))) fail('Use an ISO date with Z or an explicit UTC offset.');
  try { new Intl.DateTimeFormat('en',{timeZone:p.zone||'UTC'}).format(); } catch {fail('Invalid IANA time zone.');}
  if(p.planned && p.deadline && Date.parse(p.deadline)>Date.parse(p.planned)) fail('Review deadline must precede the planned reminder.');
}
export function createApp({dataDir=process.env.DATA_DIR||resolve(root,'data'), demo=process.env.DEMO_MODE!=='false', secure=process.env.COOKIE_SECURE==='true'}={}) {
  mkdirSync(dataDir,{recursive:true,mode:0o700}); chmodSync(dataDir,0o700); mkdirSync(resolve(dataDir,'media'),{recursive:true,mode:0o700});
  const db=new DatabaseSync(resolve(dataDir,'studio.sqlite'));
  db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY, body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, roles TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL, qualified INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, userId TEXT, expires INTEGER)');
  db.exec('CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  const storedMode=db.prepare("SELECT value FROM metadata WHERE key='mode'").get()?.value;
  if(storedMode && storedMode!==(demo?'demo':'shared')) throw new Error('Workspace mode mismatch. Use separate DATA_DIR directories for demonstration and shared workspaces.');
  if(!storedMode) db.prepare("INSERT INTO metadata VALUES('mode',?)").run(demo?'demo':'shared');
  if(!db.prepare('PRAGMA table_info(users)').all().some(c=>c.name==='disabled')) db.exec('ALTER TABLE users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0');
  if(!db.prepare('SELECT id FROM workspace WHERE id=1').get()) db.prepare('INSERT INTO workspace VALUES(1,?)').run(JSON.stringify(seed()));
  const addUser=(id,name,userRoles,password,qualified=false)=>{const salt=randomBytes(16).toString('hex'); db.prepare('INSERT INTO users (id,name,roles,salt,hash,qualified) VALUES(?,?,?,?,?,?)').run(id,name,JSON.stringify(userRoles),salt,scryptSync(password,salt,64).toString('hex'),qualified?1:0);};
  if(demo) for(const [id,name,r,q] of [['admin','Alex Morgan',['Administrator','Author','Reviewer','Publisher','Analyst'],true],['author','Jordan Lee',['Author'],false],['reviewer','Sam Rivera',['Reviewer'],true],['publisher','Casey Chen',['Publisher'],false],['analyst','Taylor Brooks',['Analyst'],false]]) if(!db.prepare('SELECT id FROM users WHERE id=?').get(id)) addUser(id,name,r,randomBytes(24).toString('hex'),q);
  if(!demo && !db.prepare('SELECT id FROM users LIMIT 1').get()) {
    if(!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length<14) throw new Error('Set ADMIN_PASSWORD (14+ characters) for first shared-mode startup.');
    addUser('admin','Workspace administrator',['Administrator'],process.env.ADMIN_PASSWORD);
  }
  const load=()=>JSON.parse(db.prepare('SELECT body FROM workspace WHERE id=1').get().body);
  const users=()=>db.prepare('SELECT id,name,roles,qualified,disabled FROM users').all().map(u=>({...u,roles:JSON.parse(u.roles),qualified:!!u.qualified}));
  const sessions=new Map(); // login throttling; authenticated sessions persist in SQLite
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' blob:; media-src 'self' blob:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
    try {
      const url=new URL(req.url,'http://localhost');
      if(req.method!=='GET' && req.headers.origin && req.headers.origin!==`${secure?'https':'http'}://${req.headers.host}`) fail('Cross-origin request rejected.',403);
      if(req.method!=='GET' && !req.headers['content-type']?.startsWith('application/json')) fail('JSON content type required.',415);
      let body={};
      if(req.method!=='GET') {let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>16*1024*1024) fail('Request too large.',413);} try {body=raw?JSON.parse(raw):{};} catch {fail('Invalid JSON.');}}
      if(url.pathname==='/api/session' && req.method==='POST') {
        const ip=req.socket.remoteAddress;const limit=sessions.get(ip)||{n:0,until:Date.now()+60000}; if(limit.until<Date.now()){limit.n=0;limit.until=Date.now()+60000;} if(++limit.n>20) fail('Too many login attempts. Try again in one minute.',429); sessions.set(ip,limit);
        const u=db.prepare('SELECT * FROM users WHERE id=?').get(String(body.id||''));
        const valid=u && !u.disabled && (demo || timingSafeEqual(scryptSync(String(body.password||''),u.salt,64),Buffer.from(u.hash,'hex')));
        if(!valid) fail('Invalid credentials.',401);
        const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(token,u.id,Date.now()+8*3600000);
        res.setHeader('Set-Cookie',`studio_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure?'; Secure':''}`);return send(200,{ok:true});
      }
      const token=req.headers.cookie?.match(/(?:^|; )studio_session=([a-f0-9]+)/)?.[1];
      const session=token && db.prepare('SELECT * FROM sessions WHERE token=? AND expires>?').get(token,Date.now());
      const user=session && users().find(u=>u.id===session.userId && !u.disabled);
      if(url.pathname==='/api/bootstrap') return send(200,{demo,user:user||null,users:demo?users():[]});
      if(url.pathname.startsWith('/api/') || url.pathname.startsWith('/media/')) {
        if(!user) fail('Sign in to your workspace.',401);
        const can=(...r)=>r.some(r=>user.roles.includes(r));
        const requireRole=(...r)=>{if(!can(...r)) fail('Your role cannot perform this action.',403);};
        const s=load();
        const audit=(action,id)=>s.audit.push({id:randomBytes(8).toString('hex'),at:new Date().toISOString(),actor:user.id,action,record:id});
        const save=()=>db.prepare('UPDATE workspace SET body=? WHERE id=1').run(JSON.stringify(s));
        if(url.pathname==='/api/publishing-simulation' && req.method==='POST') {
          requireRole('Publisher');if(!demo) fail('Queue simulation is available in demonstration mode only. Live publishing is not implemented.');
          if(body.action==='enqueue') {
            const p=s.posts.find(p=>p.id===body.postId);if(!p) fail('Post not found.',404);
            const result=checks(p,s);if(result.errors.length) fail(result.errors.join(' '));
            if(body.dueAt) validateDates({planned:body.dueAt});
          }
          const job=simulateQueue(s,body,user.id);audit('Publishing simulation: '+body.action,job.id);save();return send(200,{job});
        }
        if(url.pathname==='/api/logout'){db.prepare('DELETE FROM sessions WHERE token=?').run(token);return send(200,{ok:true});}
        if(url.pathname==='/api/state' && req.method==='GET') {
          if(!can('Administrator','Analyst','Publisher')) s.leads=[];
          if(!can('Administrator')) s.audit=[];
          return send(200,{...s,user,users:users(),demo,checks:Object.fromEntries(s.posts.map(p=>[p.id,checks(p,s)]))});
        }
        const preparation=url.pathname.match(/^\/api\/posts\/([^/]+)\/prepare$/);
        if(preparation && req.method==='GET') {
          requireRole('Publisher');const post=s.posts.find(p=>p.id===preparation[1]);if(!post) fail('Post not found.',404);if(post.status!=='Ready to Post') fail('Post is not ready for preparation.');
          const result=checks(post,s);if(result.errors.length) fail(result.errors.join(' '));return send(200,{post});
        }
        if(url.pathname.startsWith('/media/') && req.method==='GET') {
          const a=s.assets.find(a=>a.file===url.pathname.slice(7));if(!a) fail('Asset not found.',404);
          if((a.restricted || (a.expires && a.expires<new Date().toISOString().slice(0,10))) && !can('Administrator','Reviewer')) fail('This asset is restricted or expired. Ask a reviewer to inspect its terms.',403);
          res.writeHead(200,{'Content-Type':a.mime,'Content-Disposition':`inline; filename="${a.file}"`,'Cache-Control':'private, no-store'}); return res.end(readFileSync(resolve(dataDir,'media',a.file)));
        }
        if(url.pathname.startsWith('/api/users/') && req.method==='PUT') {
          requireRole('Administrator');const id=url.pathname.split('/').pop(), target=users().find(u=>u.id===id);if(!target) fail('Team member not found.',404);
          if(!body.name || !body.roles?.length || body.roles.some(r=>!roles.includes(r))) fail('A name and valid roles are required.');
          if(id===user.id && (body.disabled || !body.roles.includes('Administrator'))) fail('Keep your administrator access. Ask another administrator to change your access.');
          if(body.password && body.password.length<14) fail('Passwords require at least 14 characters.');
          db.prepare('UPDATE users SET name=?,roles=?,qualified=?,disabled=? WHERE id=?').run(body.name,JSON.stringify(body.roles),body.qualified?1:0,body.disabled?1:0,id);
          if(body.password){const salt=randomBytes(16).toString('hex');db.prepare('UPDATE users SET salt=?,hash=? WHERE id=?').run(salt,scryptSync(body.password,salt,64).toString('hex'),id);}
          if(id!==user.id || body.password) db.prepare('DELETE FROM sessions WHERE userId=?').run(id);
          audit('Updated team access',id);save();return send(200,{ok:true});
        }
        if(url.pathname==='/api/users' && req.method==='POST') {
          requireRole('Administrator');if(!/^[a-z0-9_-]{3,40}$/.test(body.id)||!body.name || !body.roles?.length || body.roles.some(r=>!roles.includes(r)) || body.password?.length<14) fail('Use a unique username, name, valid roles, and password of at least 14 characters.');
          if(db.prepare('SELECT id FROM users WHERE id=?').get(body.id)) fail('Username already exists.');
          addUser(body.id,body.name,body.roles,body.password,body.qualified===true);audit('Created team member',body.id);save();return send(201,{ok:true});
        }
        if(['/api/brand','/api/settings'].includes(url.pathname) && req.method==='PUT') {
          requireRole('Administrator');
          if(url.pathname.endsWith('brand')) {
            if(!safeUrl(body.website)|| (body.dm && !safeUrl(body.dm)) || (body.logo && !body.logo.startsWith('/media/'))) fail('Use valid website/DM URLs and an uploaded logo.');
            if(body.contactsVerified && (!safeUrl(body.contactSource)|| !/^\d{4}-\d\d-\d\d$/.test(body.contactVerifiedAt))) fail('Verified contacts require a source and verification date.');
            if(body.dmVerified && (!safeUrl(body.dm)||!safeUrl(body.dmSource)||!body.dmVerifiedAt)) fail('Verified messaging requires its destination, source and verification date.');
            s.brand={...s.brand,...body};
          } else {
            if(body.zone) validateDates({zone:body.zone});
            if(body.accounts) body.accounts=Object.fromEntries(platforms.map(p=>[p,{...s.settings.accounts[p],...body.accounts[p]}]));
            if(body.requirements) body.requirements=Object.fromEntries(platforms.map(p=>[p,{...s.settings.requirements[p],...body.requirements[p]}]));
            if(body.automatic || body.advertising) fail('Live integrations are unavailable. No API adapter, credentials or platform approval is configured.');
            if(body.selfApproval) fail('Self-approval is disabled by workspace policy.');
            for(const p of platforms) {const rule=body.requirements?.[p];if(rule && (!safeUrl(rule.source)|| !Array.isArray(rule.formats)||!Number.isFinite(Number(rule.maxText))|| Number(rule.maxText)<1)) fail('Invalid platform requirements.'); const a=body.accounts?.[p];if(a?.verified && !accountUrl(a.url,p)) fail('Verified destination must use the official platform domain.');}
            s.settings={...s.settings,...body,automatic:false,advertising:false,selfApproval:false};
          }
          // Configuration changes can alter destinations, contacts or policy: require another review.
          if(url.pathname.endsWith('brand') || body.accounts || body.requirements) {
            for(const p of s.posts) if(['Approved','Ready to Post','Scheduled'].includes(p.status)){p.status='Draft';p.technicalApproved=false;delete p.approvedBy;delete p.approvedAt;p.version++;}
            cancelJobs(s,null,'Brand, destination or requirements changed.');
          }
          audit('Updated '+url.pathname.split('/').pop(),'workspace');save();return send(200,{ok:true});
        }
        if(url.pathname==='/api/assets' && req.method==='POST') {
          requireRole('Author','Administrator');
          const bytes=Buffer.from(body.data||'','base64');
          const valid=(body.mime==='image/png' && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) || (body.mime==='image/jpeg' && bytes[0]===255 && bytes[1]===216 && bytes[2]===255) || (body.mime==='image/webp' && bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP') || (body.mime==='video/mp4' && bytes.toString('ascii',4,8)==='ftyp');
          if(body.expires && (!/^\d{4}-\d\d-\d\d$/.test(body.expires) || !Number.isFinite(Date.parse(body.expires)))) fail('Invalid asset expiration date.');
          if(!valid || bytes.length>10*1024*1024 || !body.name) fail('Upload a PNG, JPEG, WebP or MP4, up to 10 MB, with matching file contents.');
          const id=randomBytes(12).toString('hex'),file=id+({ 'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp','video/mp4':'.mp4'}[body.mime]);
          writeFileSync(resolve(dataDir,'media',file),bytes,{mode:0o600});
          s.assets.push({id,file,bytes:bytes.length,mime:body.mime,name:body.name,description:body.description||'',alt:body.alt||'',tags:body.tags||'',rights:body.rights||'',expires:body.expires||'',restricted:!!body.restricted,status:'Pending',owner:user.id,uploadedAt:new Date().toISOString()});audit('Uploaded asset',id);save();return send(201,{id});
        }
        const match=url.pathname.match(/^\/api\/(posts|campaigns|audiences|leads|metrics|adPlans|assets)(?:\/([^/]+))?(?:\/(transition|comment|approve))?$/);
        if(match && req.method!=='GET') {
          const [,collection,id,action]=match;
          const collectionRoles={posts:['Author','Administrator'],campaigns:['Author','Administrator'],audiences:['Author','Administrator'],leads:['Analyst','Publisher','Administrator'],metrics:['Analyst','Administrator'],adPlans:['Author','Administrator'],assets:['Reviewer','Administrator']};
          let record=id?s[collection].find(x=>x.id===id):null;if(id&&!record) fail('Record not found.',404);
          if(action==='comment') {
            requireRole('Reviewer','Author','Publisher','Administrator');if(!body.text?.trim()) fail('Write a comment.'); record.comments.push({text:String(body.text).slice(0,4000),actor:user.id,at:new Date().toISOString()});
          } else if(action==='approve' && collection==='assets') {requireRole('Reviewer','Administrator');if(!record.rights || record.restricted || (record.expires && record.expires<new Date().toISOString().slice(0,10))) fail('Asset permission must be recorded and current.');record.status='Approved';}
          else if(action==='transition' && collection==='posts') {
            if(Number(body.version)!==record.version) fail('This post has changed. Refresh before continuing.',409);
            const next=body.status;
            if(next==='In Review') {requireRole('Author','Administrator');if(!['Draft','Changes Requested'].includes(record.status)) fail('Only drafts or revisions can be submitted.');if(!record.reviewer || record.reviewer===record.author) fail('Assign an independent reviewer.');}
            else if(['Approved','Changes Requested'].includes(next)) {
              requireRole('Reviewer');if(record.status!=='In Review') fail('Post must be in review.');if(record.author===user.id) fail('Authors cannot approve their own posts.');if(record.reviewer!==user.id && !can('Administrator')) fail('Only the assigned reviewer can review this post.',403);
              if(next==='Approved') {if(!record.caption?.trim()||!record.factsConfirmed) fail('Caption and verified claims are required.');if(technicalGuidance(record) && (!user.qualified || !body.technicalReviewed)) fail('A qualified reviewer must explicitly confirm technical review.');record.technicalApproved=technicalGuidance(record) && !!body.technicalReviewed;record.approvedBy=user.id;record.approvedAt=new Date().toISOString();}
            } else if(next==='Ready to Post') {requireRole('Publisher');if(record.status!=='Approved') fail('Content must be approved first.');const c=checks(record,s);if(c.errors.length) fail(c.errors.join(' '));}
            else if(next==='Posted') {requireRole('Publisher');if(![0,1,2,3,4].every(i=>body['final-'+i]===true)) fail('Complete and confirm all five manual publication checklist items.');if(record.status!=='Ready to Post') fail('Prepare approved content before recording publication.');const c=checks(record,s);if(c.errors.length) fail(c.errors.join(' '));validateDates({planned:body.actualAt});if(!accountUrl(body.liveUrl,record.platform)||!body.actualAt || !Number.isFinite(Date.parse(body.actualAt))) fail('A live URL and actual publication time are required.');record.publication={liveUrl:body.liveUrl,actualAt:body.actualAt,publisher:user.id,notes:body.notes||'',checklistConfirmedAt:new Date().toISOString(),confirmation:'Team-confirmed publication'};}
            else fail('Automatic scheduling is unavailable. Use the manual workflow.');
            record.history.push({actor:user.id,at:new Date().toISOString(),action:`${record.status} → ${next}`,version:record.version});record.status=next;if(next==='Ready to Post') cancelJobs(s,record.id,'Switched to manual preparation.');
          } else {
            requireRole(...collectionRoles[collection]);
            if(collection==='assets') {
              if(body.expires && (!/^\d{4}-\d\d-\d\d$/.test(body.expires) || !Number.isFinite(Date.parse(body.expires)))) fail('Invalid asset expiration date.');
              const allowed=['name','description','alt','tags','rights','expires','restricted'];
              for(const key of allowed) if(Object.hasOwn(body,key)) record[key]=body[key];
              record.status='Pending';
              for(const p of s.posts) if(p.assetIds?.includes(id) && p.status!=='Posted'){p.status='Draft';p.technicalApproved=false;delete p.approvedBy;delete p.approvedAt;p.version++;}
              for(const p of s.posts) if(p.assetIds?.includes(id)) cancelJobs(s,p.id,'Asset changed.');
              audit('Updated asset; affected approvals invalidated',id);save();return send(200,{id});
            }
            if(collection==='posts') {
              if(typeof body.caption!=='string' || typeof body.title!=='string') fail('Title and caption must be text.');
              if(!platforms.includes(body.platform)) fail('Choose a supported platform.');validateDates(body);
              if(record?.status==='Posted') fail('Published records are immutable. Create a new draft.');
              if(record) cancelJobs(s,record.id,'Content edited; review required.');
              if(!body.title?.trim()) fail('A title is required.');
              if(record && Number(body.version)!==record.version) fail('This post has changed. Refresh before saving.',409);
              const {status,history,comments,publication,approvedBy,approvedAt,technicalApproved,mode,version,author,...editable}=body;
              if(!Array.isArray(body.assetIds) || body.assetIds.some(x=>typeof x!=='string')) fail('Select valid media assets.');
              if(record) {record.history.push({actor:user.id,at:new Date().toISOString(),action:'Edited; approval invalidated',version:record.version,caption:record.caption});Object.assign(record,editable,{id,status:'Draft',technicalApproved:false,version:record.version+1});delete record.approvedBy;delete record.approvedAt;}
              else {record={...editable,id:randomBytes(12).toString('hex'),author:user.id,status:'Draft',mode:'Manual',technicalApproved:false,version:1,history:[],comments:[]};s.posts.push(record);}
              record.technical=!!technicalGuidance(record);
              if(!record.reviewer || !record.publisher) fail('Assign a reviewer and publisher.');
              if(!users().some(u=>u.id===record.reviewer&&!u.disabled&&u.roles.includes('Reviewer')) || !users().some(u=>u.id===record.publisher&&!u.disabled&&u.roles.includes('Publisher'))) fail('Assignments require suitable team roles.');
            } else {
              if(collection==='campaigns' && (!body.offeringConfirmed || !body.name)) fail('Name the campaign and confirm the offering.');
              if(collection==='audiences' && !body.name) fail('An audience name is required.');
              if(collection==='leads') body.source='Manual entry';
              if(collection==='leads' && (!body.contact || !['New','Contacted','Qualified','Closed','Not a Fit'].includes(body.status))) fail('Enter a contact or organization and valid inquiry status.');
              if(collection==='metrics') {for(const key of ['reach','impressions','views','likes','comments','shares','saves','clicks','inquiries','qualified','spend']) if(body[key]!==null && body[key]!=='' && body[key]!==undefined && (!Number.isFinite(Number(body[key])) || Number(body[key])<0)) fail('Metrics must be non-negative or blank.'); body.source='Manual entry';body.updatedAt=new Date().toISOString();}
              if(collection==='adPlans') {body.status='Planning only — no spend authorized';body.live=false;}
              delete body.createdBy;delete body.createdAt;
              if(record) Object.assign(record,{...body,id});else {record={...body,id:randomBytes(12).toString('hex'),createdBy:user.id,createdAt:new Date().toISOString()};s[collection].push(record);}
            }
          }
          audit(action|| (id?'Edited '+collection:'Created '+collection),record.id);save();return send(200,{id:record.id});
        }
        fail('Endpoint not found.',404);
      }
      if(req.method!=='GET') fail('Not found.',404);
      const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};
      const file=files[url.pathname];if(!file) fail('Not found.',404);
      res.writeHead(200,{'Content-Type':{'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'}[extname(file)],'Cache-Control':'no-cache'});res.end(readFileSync(resolve(root,'public',file)));
    } catch(e) {if(!res.headersSent) send(e.status||500,{error:e.status?e.message:'Unexpected server error.'});else res.end();}
  });
  return {server,db};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const {server}=createApp();const port=Number(process.env.PORT||3000);
  server.listen(port,process.env.HOST||'0.0.0.0',()=>console.log(`CSTC Social Studio: http://localhost:${port} • ${process.env.DEMO_MODE==='false'?'authenticated shared mode':'DEMO: simulated identities; illustrative content'}`));
}
