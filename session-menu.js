(() => {
 const trigger=document.getElementById('headerUser'),menu=document.getElementById('headerAccountMenu');if(!trigger||!window.BRB)return;
 let revision=0;
 const close=()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false');};
 trigger.onclick=()=>{menu.hidden=!menu.hidden;trigger.setAttribute('aria-expanded',String(!menu.hidden));};
 document.addEventListener('click',e=>{if(!e.target.closest('.account-nav'))close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){close();trigger.focus();}});
 async function refresh(){
  const current=++revision;
  const {data,error}=await BRB.auth.getSession();if(current!==revision)return;
  const user=!error&&data.session?.user;
  if(!user){document.getElementById('headerLogin').hidden=false;trigger.hidden=true;document.getElementById('headerNickname').textContent='';close();return;}
  let profile;try{profile=await BRB.rpc('profile_get');}catch{}
  if(current!==revision)return;
  document.getElementById('headerNickname').textContent='@'+(profile?.nick||user.user_metadata?.nick||'minha.conta');
  document.getElementById('headerLogin').hidden=true;trigger.hidden=false;
 }
 document.getElementById('headerSignOut').onclick=async()=>{
  const {error}=await BRB.auth.signOut();
  if(error){document.getElementById('headerAccountStatus').textContent='Não foi possível sair. Tente novamente.';return;}
  location.replace('/conta');
 };
 BRB.auth.onAuthStateChange(()=>setTimeout(refresh,0));
 window.addEventListener('brb-profile-updated',refresh);refresh();
})();
