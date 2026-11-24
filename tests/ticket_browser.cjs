const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/john0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const root = path.resolve(__dirname, '..');
const orderId = '56059065-065e-4198-a463-cd0651cc71cb';
async function run() {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.hostname !== 'brazilianbayle.com.br') return route.abort();
        const file = path.join(root, 'dist', url.pathname === '/intermediacao' ? 'intermediacao.html' : url.pathname);
        return fs.existsSync(file) ? route.fulfill({ path: file }) : route.abort();
      });
      await page.route('**/backend.js*', route => route.fulfill({ contentType: 'text/javascript', body: `
        const order={id:'${orderId}',status:'solicitada',event:'Festa de teste',venue:'Casa de teste',type:'Pista',price:100,role:'buyer',evidence:[]};
        window.BRB={auth:{getSession:async()=>({data:{session:{user:{id:'test'},access_token:'test'}}}),getUser:async()=>({data:{user:{id:'test'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
          ticketJourney:async(action,payload)=>{if(action==="contact")order.buyer_phone=payload.phone;return [order]},tickets:async()=>({listings:[],requests:[]}),content:async()=>({}),points:async()=>({}),interest:async()=>({}),
          ticketPayment:async(route)=>route==='config'?{enabled:true}:{status:'pending',qr_code:'TEST_PIX_COPY_CODE'},
        };` }));
      await page.goto('https://brazilianbayle.com.br/intermediacao?pedido=' + orderId);
      await page.getByRole('heading', { name: 'Festa de teste' }).waitFor();
      assert(await page.locator('.ticket-totals').innerText().then(text => text.includes('110,00')));
      assert.equal(await page.getByRole('button', { name: 'Pagar com Pix' }).count(), 0);
      await page.locator('#ticketPhone').fill('(11) 99999-9999');
      await page.getByRole('button', { name: 'Salvar celular' }).click();
      await page.getByRole('button', { name: 'Pagar com Pix' }).click();
      await page.getByRole('alert').filter({hasText:'aceite os termos'}).waitFor();
      await page.locator('#ticketPaymentConsent').check();
      await page.getByRole('button', { name: 'Pagar com Pix' }).click();
      await page.getByLabel('Pix copia e cola').waitFor();
      assert.equal(await page.getByLabel('Pix copia e cola').inputValue(), 'TEST_PIX_COPY_CODE');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow');
      await page.screenshot({ path: path.resolve(root, '..', 'ticket-journey-' + width + '.png'), fullPage: true });
      console.log(width + 'px: order, terms, Pix and layout passed.');
      await page.close();
    }
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
