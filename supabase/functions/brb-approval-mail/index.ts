import nodemailer from 'npm:nodemailer@10.2.1';

const origins = new Set(['https://brazilianbayle.com.br','https://www.brazilianbayle.com.br','https://brazilian-bayle.vercel.app']);
const transport = nodemailer.createTransport({host:'smtp.hostinger.com',port:465,secure:true,connectionTimeout:12000,socketTimeout:15000,auth:{user:Deno.env.get('BRB_SMTP_USER'),pass:Deno.env.get('BRB_SMTP_PASSWORD')}});
const esc = (s:string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// A permissão é do servidor: a função brb_members só responde ao owner autenticado.
async function members(token:string,action:string,id:string) {
 const result=await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/rpc/brb_members',{method:'POST',headers:{apikey:Deno.env.get('SUPABASE_ANON_KEY')!,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,payload:{id}})});
 const body=await result.json().catch(()=>null);
 if(!result.ok) throw new Error(body?.message||'Não foi possível concluir.');
 return body;
}

const SUBJECT = 'Parabéns, você foi aprovado na Brazilian Bayle';

function card(nome:string, whatsapp:string) {
 const full = esc(nome.trim());
 const first = esc(nome.trim().split(/\s+/)[0] || 'Clubber');
 const backSize = nome.trim().length > 20 ? 22 : 28;
 const button = whatsapp
  ? `<table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr><td align="center" bgcolor="#c9a45c" style="border-radius:999px"><a href="${esc(whatsapp)}" style="display:block;padding:18px 22px;font:700 15px 'Syne','Arial Black',Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;color:#0a0b0a;text-decoration:none;border:2px solid #ead49c;border-radius:999px">Entrar no grupo exclusivo →</a></td></tr></table>`
  : `<p style="margin:0;font-size:15px;line-height:1.6;color:#d9bc7b;text-align:center">O convite para o grupo exclusivo de WhatsApp chega para você em seguida.</p>`;
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${SUBJECT}</title><style>
@font-face{font-family:'Syne';font-weight:700 800;src:url(https://brazilianbayle.com.br/assets/fonts/syne-700.woff2) format('woff2')}
@font-face{font-family:'JetBrains Mono';font-weight:500;src:url(https://brazilianbayle.com.br/assets/fonts/jetbrainsmono-500.woff2) format('woff2')}
@font-face{font-family:'Cormorant Garamond';font-style:italic;font-weight:500;src:url(https://brazilianbayle.com.br/assets/fonts/cormorantgaramond-i500.woff2) format('woff2')}
@font-face{font-family:'Inter Tight';font-weight:400;src:url(https://brazilianbayle.com.br/assets/fonts/intertight-400.woff2) format('woff2')}
@media(max-width:620px){.w{width:100%!important}.pad{padding-left:22px!important;padding-right:22px!important}.h1{font-size:32px!important}}
</style></head><body bgcolor="#080908" style="margin:0;padding:0;background:#080908"><div style="display:none;max-height:0;overflow:hidden">${first}, seu lugar no BRB Clubbers está garantido. Bem-vindo à Brazilian Bayle.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#080908"><tr><td align="center" style="padding:30px 14px">
<table class="w" role="presentation" width="600" cellspacing="0" cellpadding="0" bgcolor="#0e100e" style="width:600px;max-width:100%;border:1px solid #8a713e;border-radius:22px;overflow:hidden">
<tr><td class="pad" align="center" style="padding:38px 40px 0"><p style="margin:0;font:800 56px/1 'Syne','Arial Black',Arial,sans-serif;letter-spacing:-1px;text-transform:uppercase;color:#ffd400">Brazilian</p><p style="margin:2px 0 0;font:italic 500 78px/.9 'Cormorant Garamond',Georgia,serif;color:#ffd400">Bayle</p>
<table role="presentation" align="center" style="margin:18px auto 0"><tr><td width="46" style="border-top:1px solid #c9a45c;font-size:0">&nbsp;</td><td style="padding:0 12px;font:500 10px 'JetBrains Mono','Courier New',monospace;letter-spacing:4px;color:#c9a45c;white-space:nowrap">BRB CLUBBERS · APROVADO</td><td width="46" style="border-top:1px solid #c9a45c;font-size:0">&nbsp;</td></tr></table></td></tr>
<tr><td class="pad" align="center" style="padding:26px 40px 0"><h1 class="h1" style="margin:0;font:800 42px/1 'Syne','Arial Black',Arial,sans-serif;letter-spacing:-1.5px;text-transform:uppercase;color:#f6f4ef;text-align:center">Parabéns,<br><span style="color:#ffd400">${first}.</span></h1>
<p style="margin:16px 0 0;font:italic 500 26px/1.25 'Cormorant Garamond',Georgia,serif;color:#d5bb7c;text-align:center">Você foi aprovado na Brazilian Bayle.</p>
<p style="margin:8px 0 0;font:italic 500 26px/1.25 'Cormorant Garamond',Georgia,serif;color:#d5bb7c;text-align:center">O melhor network de música eletrônica do Brasil.</p></td></tr>
<tr><td class="pad" align="center" style="padding:28px 40px 0"><table role="presentation" width="520" cellspacing="0" cellpadding="0" bgcolor="#0a0b0a" background="https://brazilianbayle.com.br/assets/club-card-frente-v2.png" style="width:520px;max-width:100%;height:325px;background-color:#0a0b0a;background-image:url(https://brazilianbayle.com.br/assets/club-card-frente-v2.png);background-size:100% 100%;background-repeat:no-repeat;border-radius:20px"><tr><td height="306" valign="bottom" style="height:306px;padding:0 0 19px 36px"><p style="margin:0;font:12px/1 Arial,Helvetica,sans-serif;letter-spacing:3px;text-transform:uppercase;color:#c9a45c">${full}</p></td></tr></table>
<table role="presentation" width="520" cellspacing="0" cellpadding="0" bgcolor="#0a0b0a" background="https://brazilianbayle.com.br/assets/club-card-verso-v2.png" style="width:520px;max-width:100%;height:325px;margin-top:14px;background-color:#0a0b0a;background-image:url(https://brazilianbayle.com.br/assets/club-card-verso-v2.png);background-size:100% 100%;background-repeat:no-repeat;border-radius:20px"><tr><td height="163" valign="top" style="height:163px;padding:162px 20px 0 36px"><p style="margin:0;font:${backSize}px/1.1 Georgia,'Times New Roman',serif;color:#e7d5a5">${full}</p></td></tr></table></td></tr>
<tr><td class="pad" style="padding:28px 40px 0"><p style="margin:0;font:17px/1.65 'Inter Tight',Arial,Helvetica,sans-serif;color:#d0cec6">A seleção terminou e o seu nome passou. Agora você é BRB Clubber: parte do network da Brazilian Bayle, com afters fechados, festas especiais e gente que vive a pista de verdade.</p></td></tr>
<tr><td class="pad" style="padding:22px 40px 0"><table role="presentation" width="100%" style="border-top:1px solid #c9a45c44"><tr><td width="44" valign="top" style="padding:16px 0;font:500 12px 'JetBrains Mono','Courier New',monospace;color:#c9a45c">01</td><td style="padding:16px 0"><p style="margin:0 0 4px;font:800 16px 'Syne','Arial Black',Arial,sans-serif;text-transform:uppercase;color:#f6f4ef">Grupo exclusivo de WhatsApp</p><p style="margin:0;font:15px/1.55 'Inter Tight',Arial,Helvetica,sans-serif;color:#b9b7ae">Os line-ups das festas chegam primeiro para você, e é lá que combinamos as festas privadas da Brazilian Bayle.</p></td></tr></table><table role="presentation" width="100%" style="border-top:1px solid #c9a45c44"><tr><td width="44" valign="top" style="padding:16px 0;font:500 12px 'JetBrains Mono','Courier New',monospace;color:#c9a45c">02</td><td style="padding:16px 0"><p style="margin:0 0 4px;font:800 16px 'Syne','Arial Black',Arial,sans-serif;text-transform:uppercase;color:#f6f4ef">Seus vídeos no Instagram oficial</p><p style="margin:0;font:15px/1.55 'Inter Tight',Arial,Helvetica,sans-serif;color:#b9b7ae">Envie o seu vídeo da pista e apareça no @brazilianbayle.</p></td></tr></table><table role="presentation" width="100%" style="border-top:1px solid #c9a45c44"><tr><td width="44" valign="top" style="padding:16px 0;font:500 12px 'JetBrains Mono','Courier New',monospace;color:#c9a45c">03</td><td style="padding:16px 0"><p style="margin:0 0 4px;font:800 16px 'Syne','Arial Black',Arial,sans-serif;text-transform:uppercase;color:#f6f4ef">Preços promocionais na loja</p><p style="margin:0;font:15px/1.55 'Inter Tight',Arial,Helvetica,sans-serif;color:#b9b7ae">Condição especial em todos os produtos da loja da Brazilian Bayle.</p></td></tr></table></td></tr>
<tr><td class="pad" style="padding:14px 40px 0">${button}</td></tr>
<tr><td class="pad" align="center" style="padding:34px 40px 36px"><p style="margin:0;font:italic 500 26px 'Cormorant Garamond',Georgia,serif;color:#d5bb7c">A pista é brasileira.</p><p style="margin:6px 0 0;font:500 10px 'JetBrains Mono','Courier New',monospace;letter-spacing:3px;color:#aaa99f">E SEMPRE VAI SER.</p></td></tr>
</table><p style="max-width:520px;margin:22px auto 0;font:12px/1.6 'Inter Tight',Arial,Helvetica,sans-serif;color:#99998f;text-align:center">Dúvidas? <a href="https://brazilianbayle.com.br/suporte" style="color:#c9a45c">Fale com a Brazilian Bayle.</a><br>Você recebeu este e-mail porque se candidatou ao BRB Clubbers.</p></td></tr></table></body></html>`;
}

Deno.serve(async request => {
 const origin=request.headers.get('origin')||'';
 const headers={'Access-Control-Allow-Origin':origins.has(origin)?origin:'https://brazilianbayle.com.br','Access-Control-Allow-Headers':'content-type,apikey,authorization','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
 if(!origins.has(origin))return reply({error:'Origem não permitida.'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST')return reply({error:'Método não permitido.'},405);
 const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!token)return reply({error:'Entre com a conta de owner.'},401);
 let id;
 try {const body=await request.json();id=body.id;}catch{return reply({error:'Pedido inválido.'},400);}
 if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))return reply({error:'Pedido inválido.'},400);
 let member;
 try {member=await members(token,'mail_prepare',id);}catch(error){return reply({error:(error as Error).message},403);}
 try {
  await transport.sendMail({from:{name:'Brazilian Bayle',address:Deno.env.get('BRB_SMTP_USER')!},to:member.email,replyTo:Deno.env.get('BRB_SUPPORT_TO')||undefined,subject:SUBJECT,html:card(member.nome||'',Deno.env.get('BRB_WHATSAPP_URL')||''),text:`Parabéns, ${member.nome}. Você foi aprovado na Brazilian Bayle.\n\nVocê é BRB Clubber: o melhor network de música eletrônica do Brasil. Você entra no grupo exclusivo de WhatsApp (line-ups das festas e festas privadas), pode enviar vídeos para o Instagram oficial e tem preços promocionais em todos os produtos da loja.\n\nA pista é brasileira. E sempre vai ser.`});
 }catch(error){
  console.error('Approval mail failed',id,(error as {code?:string}).code||'unknown');
  return reply({error:'Não foi possível enviar o e-mail agora. Tente de novo em instantes.'},502);
 }
 await members(token,'mail_done',id).catch(()=>{});
 return reply({ok:true});
});
