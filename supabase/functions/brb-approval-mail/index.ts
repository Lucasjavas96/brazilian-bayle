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
 const first = esc(nome.trim().split(/\s+/)[0] || 'Clubber');
 const button = whatsapp
  ? `<table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr><td align="center" bgcolor="#c9a45c" style="border-radius:999px;background-color:#c9a45c"><a href="${esc(whatsapp)}" style="display:block;padding:18px 22px;font-size:16px;font-weight:bold;color:#0a0b0a;text-decoration:none;border:1px solid #ead49c;border-radius:999px">Entrar no grupo exclusivo →</a></td></tr></table>`
  : `<p style="margin:0;font-size:15px;line-height:1.6;color:#d9bc7b">O convite para o grupo exclusivo de WhatsApp chega para você em seguida.</p>`;
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${SUBJECT}</title></head><body bgcolor="#080908" style="margin:0;padding:0;background-color:#080908;color:#f6f4ef;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${first}, seu lugar no BRB Clubbers está garantido. Bem-vindo ao network da Brazilian Bayle.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#080908"><tr><td align="center" style="padding:30px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#0e100e" style="max-width:560px;border:1px solid #8a713e;border-radius:20px"><tr><td style="padding:32px 28px 8px"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="#f6f4ef" style="padding:9px 14px;border-radius:10px"><a href="https://brazilianbayle.com.br"><img src="https://brazilianbayle.com.br/assets/logo-email.png" width="150" height="88" alt="Brazilian Bayle" style="display:block;border:0;width:150px;height:auto"></a></td></tr></table><p style="margin:28px 0 12px;font:11px/1.5 'Courier New',monospace;letter-spacing:2px;color:#c9a45c">BRB CLUBBERS · APROVADO</p><h1 style="margin:0 0 20px;font-size:34px;line-height:1.12;letter-spacing:-1px;color:#f6f4ef">Parabéns, ${first}.<br><span style="color:#ffd400">Você foi aprovado na Brazilian Bayle.</span></h1><p style="margin:0;font-size:17px;line-height:1.6;color:#d0cec6">A seleção terminou e o seu nome passou. A partir de agora você faz parte do network: afters fechados, festas especiais e gente que vive a pista de verdade, do primeiro drop até o sol nascer.</p></td></tr><tr><td style="padding:20px 28px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#121212" style="border:1px solid #c9a45c;border-radius:16px"><tr><td style="padding:22px 22px 20px"><p style="margin:0 0 18px;font:11px/1.4 'Courier New',monospace;letter-spacing:3px;color:#c9a45c">BRB CLUBBERS · CARTÃO DE MEMBRO</p><p style="margin:0;font:800 26px/1.15 Arial,Helvetica,sans-serif;color:#ffd400">${esc(nome.trim())}</p><p style="margin:6px 0 0;font:italic 18px/1.3 Georgia,serif;color:#d5bb7c">A noite tem o seu nome.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;border-top:1px solid #c9a45c44"><tr><td style="padding-top:14px;font:11px/1.4 'Courier New',monospace;letter-spacing:2px;color:#aaa99f">BRAZILIAN BAYLE</td><td align="right" style="padding-top:14px;font:11px/1.4 'Courier New',monospace;letter-spacing:2px;color:#009c3b">MEMBRO 2026</td></tr></table></td></tr></table></td></tr><tr><td style="padding:24px 28px 8px"><p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#d0cec6">Agora você entra no <b style="color:#f6f4ef">grupo exclusivo de WhatsApp</b>, onde trazemos os line-ups das festas antes de todo mundo e combinamos as festas privadas da Brazilian Bayle.</p><p style="margin:0 0 22px;font-size:16px;line-height:1.65;color:#d0cec6">Chegue cedo, traga quem vive o mesmo som que você e fique de olho no <a href="https://instagram.com/brazilianbayle" style="color:#c9a45c">@brazilianbayle</a>. A próxima edição já tem o seu nome na lista.</p>${button}<div style="border-top:1px solid #c9a45c44;margin-top:28px;padding-top:20px"><p style="margin:0;font:italic 23px/1.3 Georgia,serif;color:#d5bb7c">A pista é brasileira.</p><p style="margin:7px 0 0;font-size:11px;color:#aaa99f;letter-spacing:1px">E SEMPRE VAI SER.</p></div></td></tr><tr><td style="height:24px;font-size:0;line-height:0">&nbsp;</td></tr></table><p style="max-width:500px;margin:20px auto 0;font-size:12px;line-height:1.6;color:#99998f">Dúvidas? <a href="https://brazilianbayle.com.br/suporte" style="color:#c9a45c">Fale com a Brazilian Bayle.</a><br>Você recebeu este e-mail porque se candidatou ao BRB Clubbers.</p></td></tr></table></body></html>`;
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
  await transport.sendMail({from:{name:'Brazilian Bayle',address:Deno.env.get('BRB_SMTP_USER')!},to:member.email,replyTo:Deno.env.get('BRB_SUPPORT_TO')||undefined,subject:SUBJECT,html:card(member.nome||'',Deno.env.get('BRB_WHATSAPP_URL')||''),text:`Parabéns, ${member.nome}. Você foi aprovado na Brazilian Bayle.\n\nA partir de agora você faz parte do BRB Clubbers: afters fechados, festas especiais e o grupo exclusivo de WhatsApp, onde trazemos os line-ups das festas e combinamos as festas privadas.\n\nA pista é brasileira. E sempre vai ser.`});
 }catch(error){
  console.error('Approval mail failed',id,(error as {code?:string}).code||'unknown');
  return reply({error:'Não foi possível enviar o e-mail agora. Tente de novo em instantes.'},502);
 }
 await members(token,'mail_done',id).catch(()=>{});
 return reply({ok:true});
});
