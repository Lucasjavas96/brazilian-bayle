/* Guided triage; all delivery and credentials remain in the backend. */
(() => {
 const dialog=document.querySelector('#supportDialog');if(!dialog)return;
 const find=id=>document.getElementById(id),form=find('supportForm');
 const topics={conta:['Conta e acesso','Para recuperar a senha ou reenviar a confirmação, use as opções da página Entrar/Cadastrar. Se não resolver, descreva o erro abaixo.'],votacao:['Festas e votação','O ranking considera apenas avaliações de contas confirmadas. Se faltar uma festa ou um DJ no line-up, informe nome e data.'],album:['Álbum de DJs','Entre na sua conta para acessar o álbum pessoal. Se faltarem cartas ou houver erro no sorteio, conte o que aconteceu e quando.'],spotted:['Spotted e moderação','Para reportar conteúdo, informe o título ou identificação da publicação. Não reproduza dados pessoais de outras pessoas.'],clube:['BRB Clubbers','As candidaturas são analisadas pela equipe. Informe se sua dúvida é sobre candidatura, proposta do clube ou algum contato anterior.'],outro:['Outro assunto','Conte o que você precisa e encaminharemos à equipe.']};
 let topic='',review=false,id=null,sending=false;
 find('supportLaunch').onclick=()=>dialog.showModal();
 find('supportClose').onclick=()=>dialog.close();
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 const stage=which=>{['supportTopics','supportDetails','supportReview'].forEach(key=>find(key).hidden=key!==which);find('supportStatus').textContent='';};
 document.querySelectorAll('[data-support-topic]').forEach(button=>button.onclick=()=>{topic=button.dataset.supportTopic;review=false;id=null;find('supportTopicTitle').textContent=topics[topic][0];find('supportTip').textContent=topics[topic][1];stage('supportDetails');find('supportTopicTitle').focus();});
 find('supportBack').onclick=()=>{review=false;stage('supportTopics');};
 find('supportEdit').onclick=()=>{review=false;id=null;stage('supportDetails');};
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(sending||!topic)return;
  if(!review){if(!form.reportValidity())return;find('supportReviewTitle').textContent=topics[topic][0];find('supportReviewEmail').textContent='Resposta para '+find('supportEmail').value;find('supportReviewMessage').textContent=find('supportMessage').value;review=true;stage('supportReview');find('supportSend').focus();return;}
  sending=true;find('supportSend').disabled=true;find('supportStatus').textContent='Enviando sua solicitação…';id ||= crypto.randomUUID();
  try{
   const response=await fetch(BRB_CONFIG.url+'/functions/v1/brb-support',{method:'POST',headers:{'Content-Type':'application/json',apikey:BRB_CONFIG.publishableKey},body:JSON.stringify({id,topic,name:find('supportName').value,email:find('supportEmail').value,message:find('supportMessage').value,consent:find('supportConsent').checked,website:form.elements.website.value,page:location.pathname.slice(0,200)})});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Não foi possível enviar agora.');
   find('supportReview').hidden=true;
   find('supportStatus').textContent=result.sent ? `Solicitação enviada à equipe. Protocolo ${result.id.slice(0,8).toUpperCase()}. A resposta chegará pelo e-mail informado.` : `Pedido registrado sob o protocolo ${result.id.slice(0,8).toUpperCase()}, mas houve uma falha na entrega do e-mail. Entre em contato por contato@brazilianbayle.com.br e informe esse protocolo.`;
  }catch(error){find('supportStatus').textContent=error.message+' Você também pode escrever para contato@brazilianbayle.com.br.';}
  finally{sending=false;find('supportSend').disabled=false;}
 });
})();
