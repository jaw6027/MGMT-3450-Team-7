// Optional browser validation: set PLAYWRIGHT_MODULE and CHROMIUM_PATH as needed.
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const source=readFileSync(new URL('../prototype.fragment.html',import.meta.url),'utf8');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const document=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const server=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(document);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
try {
  for (const mode of ['source','standalone']) {
    const page=await browser.newPage({viewport:{width:1024,height:1200}}),errors=[];
    page.setDefaultTimeout(15000);
    page.on('pageerror',e=>errors.push(e.message));
    // Tests never load external resources or send customer information.
    await page.route(/^https?:/,route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    if(mode==='source') await page.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:8px}</style>'+source);
    else await page.goto(origin);
    const ui=mode==='standalone'?page.frameLocator('#codex-visualization'):page;
    await ui.getByRole('heading',{name:'A clear view of what matters.'}).waitFor();
    for(const [customer,scope] of [['commercial','commercial'],['municipal','municipal'],['partner','partner']]) {
      await ui.locator('#cd-customer').selectOption(customer);
      assert((await ui.locator('#cd-scope').textContent()).includes(scope));
    }
    await ui.locator('#cd-customer').selectOption('municipal');
    await ui.getByRole('button',{name:'Incident alerts',exact:true}).click();
    await ui.getByRole('button',{name:'View next step'}).first().click();
    await ui.getByRole('button',{name:'Acknowledge in preview'}).click();
    await ui.getByText('Acknowledged',{exact:true}).waitFor();
    await ui.getByRole('button',{name:'Preparedness',exact:true}).click();
    await ui.locator('[data-check="0"]').check();
    assert.match(await ui.locator('#cd-task-count').textContent(),/1 of 4/);
    await ui.getByRole('button',{name:'Requests',exact:true}).click();
    await ui.getByRole('button',{name:'＋ Create request',exact:true}).click();
    await ui.locator('[name=title]').fill('Preview request');
    await ui.getByRole('button',{name:'Add sample request',exact:true}).click();
    await ui.getByRole('heading',{name:'Preview request',exact:true}).waitFor();
    await ui.getByRole('button',{name:'Deadlines & calendar',exact:true}).click();
    await ui.locator('[data-date="2"]').click();
    assert.match(await ui.locator('#cd-date-detail').textContent(),/December 2, 2026/);
    await ui.getByRole('button',{name:'Message center',exact:true}).click();
    await ui.locator('#cd-inquiry-filter').selectOption('Prospect');
    assert.equal(await ui.locator('[data-thread]').count(),1);
    await ui.locator('#cd-inquiry-filter').selectOption('Current client');
    assert.equal(await ui.locator('[data-thread]').count(),1);
    await ui.getByRole('button',{name:'＋ New inquiry',exact:true}).click();
    await ui.locator('[name=contact]').fill('Sample prospect');
    await ui.locator('[name=subject]').fill('Training inquiry <script>sample</script>');
    await ui.locator('[name=message]').fill('Please explain the available training options.');
    await ui.locator('#cd-add-inquiry').click();
    await ui.getByRole('heading',{name:'Training inquiry <script>sample</script>',exact:true}).waitFor();
    assert.equal(await ui.locator('.cd-conversation script').count(),0);
    await ui.locator('#cd-inquiry-reply [name=message]').fill('This is a local preview reply, not a real message.');
    await ui.locator('#cd-add-reply').click();
    assert.equal(await ui.locator('.cd-chat-message').count(),2);
    await ui.locator('#cd-reply-sender').selectOption('Prospect (simulation)');
    await ui.locator('#cd-inquiry-reply [name=message]').fill('Thank you. Here is a sample follow-up question.');
    await ui.locator('#cd-add-reply').click();
    assert.equal(await ui.locator('.cd-chat-message').count(),3);
    await ui.locator('#cd-inquiry-management [name=owner]').selectOption('Sample CSTC coordinator');
    await ui.locator('#cd-inquiry-management [name=followUp]').fill('2026-12-03');
    await ui.locator('#cd-inquiry-management [name=status]').selectOption('Closed');
    await ui.locator('#cd-save-inquiry').click();
    assert.equal(await ui.locator('#cd-add-reply').count(),0);
    assert.equal(await ui.locator('#cd-inquiry-management [name=owner]').inputValue(),'Sample CSTC coordinator');
    assert.equal(await ui.locator('#cd-inquiry-management [name=followUp]').inputValue(),'2026-12-03');
    await ui.locator('#cd-inquiry-management [name=status]').selectOption('In progress');
    await ui.locator('#cd-save-inquiry').click();
    await ui.locator('#cd-add-reply').waitFor();
    await ui.getByRole('button',{name:'＋ New inquiry',exact:true}).click();
    await ui.locator('#cd-client-relationship').selectOption('Current client');
    await ui.locator('#cd-reference-field').waitFor({state:'visible'});
    await ui.locator('[name=contact]').fill('Sample existing client');
    await ui.locator('[name=reference]').fill('Sample site A');
    await ui.locator('[name=subject]').fill('Current client follow-up');
    await ui.locator('[name=message]').fill('Please review this fictional follow-up.');
    await ui.locator('#cd-add-inquiry').click();
    await ui.getByRole('heading',{name:'Current client follow-up',exact:true}).waitFor();
    await ui.locator('#cd-customer').selectOption('partner');
    assert.equal(await ui.getByRole('heading',{name:'Current client follow-up',exact:true}).count(),0);
    await ui.locator('#cd-customer').selectOption('municipal');
    await ui.locator('#cd-inquiry-filter').selectOption('Current client');
    assert.equal(await ui.locator('[data-thread]').count(),2);

    await ui.locator('[data-page="invoices"]').click();
    await ui.getByRole('heading',{name:'Keep payment dates in view.',exact:true}).waitFor();
    await ui.locator('#cd-invoice-filter').selectOption('Overdue');
    assert.equal(await ui.locator('.cd-invoice-table tbody tr').count(),1);
    assert.match(await ui.locator('.cd-invoice-table').textContent(),/DEMO-INV-101/);
    await ui.locator('#cd-invoice-asof').fill('2026-12-16');
    await ui.locator('#cd-invoice-asof').dispatchEvent('change');
    assert.equal(await ui.locator('.cd-invoice-table tbody tr').count(),3);
    await ui.locator('#cd-invoice-filter').selectOption('Paid');
    assert.equal(await ui.locator('.cd-invoice-table tbody tr').count(),1);
    await ui.locator('#cd-invoice-filter').selectOption('Due date missing');
    assert.match(await ui.locator('.cd-invoice-table').textContent(),/Unavailable/);
    await ui.locator('#cd-invoice-asof').fill('2026-12-08');
    await ui.locator('#cd-invoice-asof').dispatchEvent('change');
    await ui.locator('#cd-invoice-filter').selectOption('All invoices');
    await ui.getByRole('button',{name:'Edit sample invoice DEMO-INV-101',exact:true}).first().click();
    await ui.locator('#cd-invoice-form [name=payment]').selectOption('Paid');
    await ui.locator('#cd-save-invoice').click();
    await ui.locator('#cd-invoice-filter').selectOption('Paid');
    assert.equal(await ui.locator('.cd-invoice-table tbody tr').count(),2);
    await ui.locator('#cd-invoice-filter').selectOption('Overdue');
    assert.match(await ui.locator('.cd-invoice-table').textContent(),/No sample invoices/);
    await ui.getByRole('button',{name:'＋ Add sample invoice',exact:true}).click();
    await ui.locator('#cd-invoice-form [name=number]').fill('DEMO-INV-106');
    await ui.locator('#cd-invoice-form [name=client]').fill('Sample current client F');
    await ui.locator('#cd-invoice-form [name=dueDate]').fill('2026-12-08');
    await ui.locator('#cd-invoice-form [name=amount]').fill('125.50');
    await ui.locator('#cd-save-invoice').click();
    await ui.locator('#cd-invoice-filter').selectOption('Due today');
    assert.equal(await ui.locator('.cd-invoice-table tbody tr').count(),2);
    await ui.getByRole('button',{name:'＋ Add sample invoice',exact:true}).click();
    await ui.locator('#cd-invoice-form [name=number]').fill('DEMO-INV-106');
    await ui.locator('#cd-invoice-form [name=client]').fill('Sample duplicate');
    await ui.locator('#cd-save-invoice').click();
    assert.match(await ui.locator('#cd-invoice-error').textContent(),/already exists/);
    await ui.getByRole('button',{name:'Cancel',exact:true}).click();

    for(const width of [1024,768,390,320]) {
      await page.setViewportSize({width,height:1100});
      for(const section of ['overview','calendar','performance','resources','preparedness','requests','messages','message-compose','invoices','invoice-compose']) {
        if(section==='message-compose'){await ui.locator('[data-page="messages"]').click();await ui.getByRole('button',{name:'＋ New inquiry',exact:true}).click();}else if(section==='invoice-compose'){await ui.locator('[data-page="invoices"]').click();await ui.getByRole('button',{name:'＋ Add sample invoice',exact:true}).click();}else await ui.locator(`[data-page="${section}"]`).click();
        const geometry=await ui.locator('#cstc-customer-preview').evaluate(el=>({content:el.scrollWidth,available:el.clientWidth}));
        assert(geometry.content<=geometry.available+1,`${mode}: overflow at ${width}px on ${section}`);
      }
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`${mode}: page overflow at ${width}px`);
    }
    await page.emulateMedia({colorScheme:'dark'});
    await ui.locator('[data-page="overview"]').click();
    assert.deepEqual(errors,[],`${mode}: browser script errors`);
    console.log(`PASS ${mode}: customer types, alerts, tasks, local requests, message center, invoices, calendar, four responsive widths and dark appearance.`);
    await page.close();
  }
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
