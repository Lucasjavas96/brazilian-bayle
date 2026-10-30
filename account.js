/* Account flows use Supabase Auth; no user directory or credentials in HTML. */
(() => {
 const root = document.querySelector('#accountRoot'); if (!root) return;
 const $ = s => root.querySelector(s), auth = BRB.auth;
 const params = new URLSearchParams(location.search);
 const next = params.get('next');
 const destination = next && /^\/(?!\/)/.test(next) && !/[\\\r\n]/.test(next) && !next.startsWith('/conta') ? next : '/';
 const callback = location.origin + '/conta' + (destination !== '/' ? '?next='+encodeURIComponent(destination) : '');
 const recoveryCallback = location.origin + '/conta?flow=recovery';
 const authLinkType = new URLSearchParams(location.hash.slice(1)).get('type');
 let redirectAfterAuth = authLinkType === 'signup' || Boolean(next);
 let mode = 'login', factor = null, enrolling = false, recovery = ['invite','recovery'].includes(authLinkType);
 const message = (text,kind='info') => {
  const box=$('#accountMessage');box.textContent=text;box.classList.toggle('is-error',Boolean(text)&&kind==='error');box.setAttribute('role',kind==='error'?'alert':'status');
 };
 const check = result => { if (result.error) throw result.error; return result.data; };
 const friendly = error => {
  const text = error?.message || '';
  if (/weak.?password|should contain at least one character|known to be weak|easy to guess/i.test(text)) return 'Senha fraca. Use pelo menos 12 caracteres, com letra minúscula, letra MAIÚSCULA e número, e evite senhas comuns. Exemplo: BaylePista2026.';
  if (/rate|too many|aguarde|tentativas/i.test(text)) return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
  if (/email.*not.*confirmed/i.test(text)) return 'Confirme seu e-mail antes de entrar. Você pode reenviar a confirmação abaixo.';
  if (/nickname|nick|unique|already.*registered|already.*exists/i.test(text)) return 'Esse @ ou e-mail já está em uso. Se já possui cadastro, entre ou use Esqueci minha senha.';
  if (/invalid.*credentials/i.test(text)) return 'Não foi possível entrar. Confira seu e-mail e sua senha.';
  if (/smtp|email_address_not_authorized|sending.*email|send.*email/i.test(text)) return mode === 'signup' ? 'Não conseguimos enviar a confirmação. Seu cadastro não foi concluído. Tente novamente mais tarde.' : 'Não conseguimos enviar o e-mail neste momento. Tente novamente mais tarde.';
  if (/password|senha/i.test(text)) return 'Confira a senha. Para uma nova senha, use pelo menos 12 caracteres, com letras e números.';
  if (/mfa|totp|verification.*code/i.test(text)) return 'Código inválido ou expirado. Confira o aplicativo e tente novamente.';
  return 'Não foi possível concluir. Tente novamente em instantes.';
 };
 function setMode(value) {
  mode = value; message(''); $('#accountForm').hidden = false; $('#accountMember').hidden = true; $('#mfaForm').hidden = true;
  const signup = value === 'signup', reset = value === 'reset', password = signup || reset || value === 'login';
  $('#accountEmailField').hidden = reset; $('#accountEmail').required = !reset;
  $('#accountPasswordField').hidden = !password; $('#accountPassword').required = password;
  $('#accountPassword').minLength = signup || reset ? 12 : 1;
  $('#accountPassword').autocomplete = signup || reset ? 'new-password' : 'current-password';
  $('#passwordHelp').hidden = !(signup || reset);
  $('#accountNickField').hidden = !signup; $('#accountNick').required = signup;
  $('#accountRepeatField').hidden = !(signup || reset); $('#accountRepeat').required = signup || reset;
  $('#accountConsentField').hidden = !signup; $('#accountConsent').required = signup;
  $('.account-tabs').hidden = reset; $('#accountLinks').hidden = reset;
  root.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === value)));
  $('#accountSubmit').textContent = ({ login:'Entrar',signup:'Criar minha conta',recover:'Enviar recuperação',resend:'Reenviar confirmação',reset:'Salvar nova senha' })[value];
  $('#accountStep').textContent = ({recover:'Recuperar acesso',resend:'Confirmar e-mail',reset:'Definir nova senha'})[value] || 'Acesso à comunidade';
 }

 root.addEventListener('invalid',event=>{
  const input=event.target;if(!(input instanceof HTMLInputElement))return;
  event.preventDefault();input.setAttribute('aria-invalid','true');
  const text=input.validity.valueMissing?'Preencha este campo para continuar.':input.type==='email'?'Digite um e-mail válido.':input.id==='accountNick'?'Use o @ do seu Instagram: 3 a 24 letras, números, pontos ou sublinhados, sem o @.':'Confira o formato e o tamanho deste campo.';
  message(text,'error');
 },true);
 root.addEventListener('input',event=>{if(event.target instanceof HTMLInputElement)event.target.removeAttribute('aria-invalid');});
 root.querySelectorAll('[data-mode]').forEach(button => button.onclick = () => setMode(button.dataset.mode));
 async function showMember() {
  const assurance = check(await auth.mfa.getAuthenticatorAssuranceLevel());
  if (assurance.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2') {
   const factors = check(await auth.mfa.listFactors()); factor = factors.totp.find(f => f.status === 'verified')?.id;
   if (!factor) throw new Error('mfa unavailable'); enrolling = false; showMfa(); return;
  }
  $('#accountForm').hidden = true; $('#accountLinks').hidden = true; $('.account-tabs').hidden = true;
  $('#mfaForm').hidden = true; $('#mfaQr').removeAttribute('src'); $('#mfaQr').hidden = true;
  if (recovery) { setMode('reset'); return; }
  if (redirectAfterAuth) { location.replace(destination); return; }
  $('#accountMember').hidden = false; $('#accountContinue').href = destination;

  const session = check(await auth.getUser()).user;
  const profile = await BRB.rpc('profile_get');
  $('#settingsNick').value = profile?.nick || session.user_metadata?.nick || '';
  $('#settingsEmail').textContent = session.email || '';
  $('#accountStep').textContent = 'Configurações da conta';

 }
 function showMfa() {
  $('#accountForm').hidden = true; $('#accountMember').hidden = true; $('#accountLinks').hidden = true; $('.account-tabs').hidden = true; $('#mfaForm').hidden = false; $('#mfaCode').value = '';
  $('#mfaHelp').textContent = enrolling ? 'Escaneie o QR code com seu aplicativo autenticador. Depois, digite o código para concluir a ativação.' : 'Digite o código de seis dígitos do seu aplicativo autenticador.';
  $('#mfaCode').focus();
 }
 async function busy(form, operation) {
  const button = form.querySelector('[type="submit"]'); button.disabled = true; message('');
  try { await operation(); } catch (error) { message(friendly(error),'error'); } finally { button.disabled = false; }
 }
 $('#accountForm').onsubmit = e => { e.preventDefault(); busy(e.currentTarget, async () => {
  const email = $('#accountEmail').value.trim(), password = $('#accountPassword').value;
  if (['signup','reset'].includes(mode)) {
   if (password !== $('#accountRepeat').value) return message('As senhas precisam ser iguais.','error');
   if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) return message('A senha precisa ter pelo menos 12 caracteres, com letra minúscula, letra MAIÚSCULA e número. Exemplo: BaylePista2026.','error');
  }
  if (mode === 'signup') {
   const signupData=check(await auth.signUp({email,password,options:{data:{nick:$('#accountNick').value.trim(),brb_app:true,terms_version:'2026-10-24'},emailRedirectTo:callback}}));
   if(signupData.user && Array.isArray(signupData.user.identities) && signupData.user.identities.length===0){
    message('Este e-mail já possui cadastro. Entre na sua conta ou clique em “Esqueci minha senha” para recuperar o acesso.','error');
   }else message('Confira seu e-mail para confirmar o cadastro. Já possui conta? Use Entrar ou Esqueci minha senha.');
  } else if (mode === 'login') {
   check(await auth.signInWithPassword({email,password})); redirectAfterAuth=true; await showMember();
  } else if (mode === 'recover') {
   check(await auth.resetPasswordForEmail(email,{redirectTo:recoveryCallback}));
   message('Se houver uma conta com esse e-mail, enviaremos as instruções de recuperação.');
  } else if (mode === 'resend') {
   check(await auth.resend({type:'signup',email,options:{emailRedirectTo:callback}}));
   message('Se houver um cadastro pendente, enviaremos uma nova confirmação.');
  } else if (mode === 'reset') {
   if (!recovery) throw new Error('Invalid recovery');
   check(await auth.updateUser({password})); recovery = false;
   check(await auth.signOut()); setMode('login'); message('Senha atualizada. Entre novamente com sua nova senha.');
  }
  $('#accountPassword').value = ''; $('#accountRepeat').value = '';
 }); };
 $('#accountOut').onclick = async () => { try { check(await auth.signOut()); location.replace('/conta'); } catch(e) { message(friendly(e),'error'); } };
 $('#accountSettings').onsubmit = e => { e.preventDefault(); busy(e.currentTarget, async () => {
  await BRB.rpc('profile_save',{nick:$('#settingsNick').value.trim()});
  window.dispatchEvent(new Event('brb-profile-updated'));message('Seu @ foi atualizado.');
 }); };
 $('#settingsPassword').onclick = async () => { try {
  const user=check(await auth.getUser()).user;
  check(await auth.resetPasswordForEmail(user.email,{redirectTo:recoveryCallback}));
  message('Enviamos o link para trocar sua senha. Verifique seu e-mail.');
 }catch(e){message(friendly(e),'error');} };
 $('#mfaForm').onsubmit = e => { e.preventDefault(); busy(e.currentTarget, async () => {
  if (!factor) throw new Error('mfa missing');
  check(await auth.mfa.challengeAndVerify({factorId:factor,code:$('#mfaCode').value}));
  $('#mfaCode').value = ''; enrolling = false; await showMember(); message('Código verificado.');
 }); };
 $('#mfaCancel').onclick = async () => {
  try { if (enrolling && factor) check(await auth.mfa.unenroll({factorId:factor})); check(await auth.signOut()); location.replace('/conta'); } catch(e) { message(friendly(e),'error'); }
 };
 // Recovery flag is set only for an actual recovery event, never a query parameter.
 auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') { recovery = true; setTimeout(() => showMember().catch(e => message(friendly(e),'error')),0); } });
 (async () => {
  try {
   const data = check(await auth.getSession());
   if (data.session) { await showMember(); } else setMode(params.get('mode') === 'signup' ? 'signup' : 'login');
   if (params.has('error') || location.hash.includes('error=')) { history.replaceState(null,'','/conta'); message('Esse link expirou ou já foi usado. Solicite um novo link.','error'); }
  } catch(e) { message(friendly(e),'error'); }
 })();
})();
