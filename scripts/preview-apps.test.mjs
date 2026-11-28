import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startPreviews} from './preview-apps.mjs';

test('one launcher serves both previews and closes both ports',async()=>{
  const dataDir=mkdtempSync(join(tmpdir(),'cstc-dual-preview-'));
  let preview;
  try{
    preview=await startPreviews({socialPort:0,customerPort:0,dataDir});
    const social=await fetch(preview.socialUrl);
    assert.equal(social.status,200);
    assert.match(await social.text(),/CSTC Social Studio/);
    const bootstrap=await (await fetch(preview.socialUrl+'/api/bootstrap')).json();
    assert.equal(bootstrap.demo,true);
    const dashboard=await fetch(preview.customerUrl);
    assert.equal(dashboard.status,200);
    assert.match(await dashboard.text(),/CSTC Customer Dashboard/);
    assert.equal((await fetch(preview.customerUrl+'/missing')).status,404);
    assert.equal((await fetch(preview.customerUrl,{method:'POST'})).status,405);
    await preview.stop();
    await assert.rejects(fetch(preview.socialUrl));
    await assert.rejects(fetch(preview.customerUrl));
  }finally{
    await preview?.stop();rmSync(dataDir,{recursive:true,force:true});
  }
});

test('a busy port fails safely and leaves the existing preview running',async()=>{
  const firstDir=mkdtempSync(join(tmpdir(),'cstc-existing-preview-'));
  const secondDir=mkdtempSync(join(tmpdir(),'cstc-busy-preview-'));
  let existing;
  try{
    existing=await startPreviews({socialPort:0,customerPort:0,dataDir:firstDir});
    await assert.rejects(startPreviews({socialPort:Number(new URL(existing.socialUrl).port),customerPort:0,dataDir:secondDir}),/already in use/);
    assert.equal((await fetch(existing.socialUrl)).status,200);
    assert.equal((await fetch(existing.customerUrl)).status,200);
  }finally{
    await existing?.stop();rmSync(firstDir,{recursive:true,force:true});rmSync(secondDir,{recursive:true,force:true});
  }
});
