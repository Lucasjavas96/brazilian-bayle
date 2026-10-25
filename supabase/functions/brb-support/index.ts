import nodemailer from 'npm:nodemailer@10.2.1';

const origins = new Set(['https://brazilianbayle.com.br','https://www.brazilianbayle.com.br','https://brazilian-bayle.vercel.app']);
const topics: Record<string,string> = {conta:'Conta e acesso',votacao:'Festas e votação',album:'Álbum de DJs',spotted:'Spotted e moderação',clube:'BRB Clubbers',outro:'Outro assunto'};
const transport = nodemailer.createTransport({host:'smtp.hostinger.com',port:465,secure:true,connectionTimeout:12000,socketTimeout:15000,auth:{user:Deno.env.get('BRB_SMTP_USER'),pass:Deno.env.get('BRB_SMTP_PASSWORD')}});
async function rpc(name:string,body:unknown) {
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const result=await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!result.ok) {const error=await result.json();throw new Error(error.message||'backend_unavailable');}
 const text=await result.text();return text?JSON.parse(text):null;
}
Deno.serve(async request => {
 const origin=request.headers.get('origin')||'';
 const headers={'Access-Control-Allow-Origin':origins.has(origin)?origin:'https://brazilianbayle.com.br','Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
 if(!origins.has(origin))return reply({error:'Origem não permitida.'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST')return reply({error:'Método não permitido.'},405);
 if(!request.headers.get('content-type')?.includes('application/json'))return reply({error:'Formato inválido.'},415);
 let body;
 try {
  if(Number(request.headers.get('content-length')||0)>16000)return reply({error:'Mensagem muito longa.'},413);
  const raw=await request.text();if(raw.length>16000)return reply({error:'Mensagem muito longa.'},413);
  body=JSON.parse(raw);
 }catch{return reply({error:'Pedido inválido.'},400);}
 if(body.website || body.consent!==true || typeof body.id!=='string' || !/^[0-9a-f-]{36}$/i.test(body.id)
 || typeof body.name!=='string' || body.name.trim().length<2 || body.name.length>80
 || typeof body.email!=='string' || body.email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)
 || /[\r\n]/.test(body.email+body.name) || !Object.hasOwn(topics,body.topic)
 || typeof body.message!=='string' || body.message.trim().length<20 || body.message.length>3000
 || typeof body.page!=='string' || !body.page.startsWith('/') || body.page.length>200)return reply({error:'Revise seus dados e escreva pelo menos 20 caracteres.'},400);
 const ip=request.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown';
 const salt=Deno.env.get('BRB_SUPPORT_SALT');if(!salt)return reply({error:'Suporte temporariamente indisponível.'},503);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip+salt)))).map(n=>n.toString(16).padStart(2,'0')).join('');
 let ticket;
 try {ticket=await rpc('brb_support_reserve',{p_id:body.id,p_ip:hash,p_name:body.name,p_email:body.email,p_topic:body.topic,p_message:body.message,p_page:body.page});}
 catch(error) {const limited=String(error).includes('support_rate_limit');return reply({error:limited?'Você já enviou uma solicitação recentemente. Aguarde antes de enviar outra.':'Não foi possível registrar. Tente novamente mais tarde.'},limited?429:503);}
 if(!ticket.fresh)return reply({id:ticket.id,sent:ticket.status==='sent',pending:ticket.status!=='sent'});
 try {
  await transport.sendMail({from:{name:'Brazilian Bayle · Suporte',address:Deno.env.get('BRB_SMTP_USER')!},to:Deno.env.get('BRB_SUPPORT_TO')!,replyTo:body.email,subject:`[BRB ${body.id.slice(0,8)}] ${topics[body.topic]}`,text:`Novo pedido de suporte\n\nProtocolo: ${body.id}\nAssunto: ${topics[body.topic]}\nNome: ${body.name.trim()}\nE-mail: ${body.email}\nPágina: ${body.page}\n\n${body.message.trim()}\n\nSolicitante consentiu com o uso dos dados para atendimento. Não solicite senhas ou códigos de autenticação.`});
  await rpc('brb_support_finish',{p_id:body.id,p_sent:true});
  return reply({id:body.id,sent:true},201);
 }catch(error){
  await rpc('brb_support_finish',{p_id:body.id,p_sent:false}).catch(()=>{});
  console.error('Support delivery failed',body.id,error.code || 'unknown');
  return reply({id:body.id,sent:false,pending:true},202);
 }
});
