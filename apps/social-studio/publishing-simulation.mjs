import {randomBytes} from 'node:crypto';

// Deliberately has no network client. This exercises durable queue behavior only.
// Never use a simulated outcome to set a content record to Published.
export function cancelJobs(state, postId, reason) {
  for(const job of state.jobs||[]) if((!postId||job.postId===postId) && ['Queued','Processing','Failed','Uncertain'].includes(job.status)) {
    job.status='Cancelled';job.reason=reason;job.updatedAt=new Date().toISOString();
  }
}
export function simulateQueue(state, input, actor, now=Date.now()) {
  state.jobs ||= [];
  const reject=message=>{throw Object.assign(new Error(message),{status:400});};
  const stamp=new Date(now).toISOString();
  if(input.action==='enqueue') {
    const post=state.posts.find(p=>p.id===input.postId);
    if(!post || post.status!=='Approved') reject('Simulation requires approved content.');
    const key=post.id+':'+post.version;
    const existing=state.jobs.find(j=>j.key===key);
    if(existing) return existing;
    if(state.settings.paused) reject('Publishing is paused. An administrator must explicitly allow simulation steps.');
    const job={id:randomBytes(12).toString('hex'),key,postId:post.id,version:post.version,platform:post.platform,status:'Queued',mode:'Simulation only',dueAt:input.dueAt||stamp,attempts:0,actor,createdAt:stamp,updatedAt:stamp};
    state.jobs.push(job);return job;
  }
  const job=state.jobs.find(j=>j.id===input.id);if(!job) reject('Simulation job not found.');
  if(input.action==='cancel') {if(job.status==='Simulated confirmation') reject('Completed simulations cannot be cancelled.');job.status='Cancelled';}
  else if(input.action==='step') {
    if(state.settings.paused) reject('Paused: no new simulation submissions can begin.');
    const post=state.posts.find(p=>p.id===job.postId);
    if(!post || post.version!==job.version || post.status!=='Approved') {job.status='Cancelled';job.reason='Content changed or approval invalidated.';return job;}
    if(job.status==='Queued') {if(Date.parse(job.dueAt)>now) reject('Job is not due yet.');job.status='Processing';job.attempts++;}
    else if(job.status==='Processing') {
      if(input.outcome==='confirmed') {job.status='Simulated confirmation';job.simulatedId='SIMULATION-'+job.id;}
      else if(input.outcome==='uncertain') job.status='Uncertain';
      else if(input.outcome==='failed') {job.status='Failed';job.reason='Simulated definite rejection before creation.';}
      else reject('Choose a simulated outcome.');
    } else reject('Only queued or processing jobs can advance. Reconcile uncertain outcomes before retrying.');
  }
  else if(input.action==='reconcile') {
    if(job.status!=='Uncertain') reject('Only uncertain outcomes require reconciliation.');
    if(input.outcome==='created') {job.status='Simulated confirmation';job.simulatedId='SIMULATION-'+job.id;}
    else if(input.outcome==='not-created') {job.status='Failed';job.reason='Simulation confirmed that no platform post was created.';}
    else reject('Choose a reconciliation result.');
    job.reconciledAt=stamp;
  }
  else if(input.action==='retry') {
    if(state.settings.paused) reject('Paused: retry is blocked.');
    if(job.status!=='Failed') reject('Retry requires a definite failure. Reconcile uncertain outcomes first.');
    job.status='Queued';
  } else reject('Unknown simulation action.');
  job.updatedAt=stamp;job.lastActor=actor;return job;
}
