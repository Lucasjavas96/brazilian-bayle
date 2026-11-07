/* Only the publishable key is shipped to the browser. Private data goes through
   narrowly scoped SQL functions; no direct table access or service-role key. */
(() => {
  const client = supabase.createClient(BRB_CONFIG.url, BRB_CONFIG.publishableKey, {
    auth: { storageKey: 'brb-auth-v1', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.BRB = {
    auth: client.auth,
    async album(action, payload = {}) {
      const { data, error } = await client.rpc('brb_album', { action, payload });
      if (error) throw new Error(error.message || 'Não foi possível atualizar seu álbum.');
      return data;
    },
    async albumRanking() {
      const { data, error } = await client.rpc('brb_album_ranking');
      if (error) throw new Error(error.message || 'Não foi possível carregar o ranking.');
      return data;
    },
    async content(prefix = '') {
      const { data, error } = await client.rpc('brb_content', { prefix });
      if (error) throw new Error(error.message || 'Não foi possível carregar o conteúdo.');
      return data;
    },
    async after(action, payload = {}) {
      const { data, error } = await client.rpc('brb_after', { action, payload });
      if (error) throw new Error(error.message || 'Não foi possível atualizar os afters.');
      return data;
    },
    async commentsFor(ids) {
      const { data, error } = await client.rpc('brb_comments_for', { ids });
      if (error) throw new Error(error.message || 'Não foi possível carregar os comentários.');
      return data || {};
    },
    async commentDelete(id) {
      const { data, error } = await client.rpc('brb_comment_delete', { comment_id: id });
      if (error) throw new Error(error.message || 'Não foi possível apagar o comentário.');
      return data;
    },
    async points() {
      const { data, error } = await client.rpc('brb_points');
      if (error) throw new Error(error.message || 'Não foi possível carregar seus pontos.');
      return data;
    },
    async moderation(section, filter = 'todos', cursor = null) {
      const {data,error}=await client.rpc('brb_moderation_page',{section,filter_name:filter,cursor});
      if(error) throw new Error(error.message || 'Não foi possível carregar a moderação.');
      return data;
    },
    async owner(action, payload = {}) {
      const { data, error } = await client.rpc('brb_owner', { action, payload });
      if (error) throw new Error(error.message || 'Não foi possível concluir a ação.');
      return data;
    },
    async members() {
      const { data, error } = await client.rpc('brb_members', { action: 'list', payload: {} });
      if (error) throw new Error(error.message || 'Não foi possível carregar os membros.');
      return data;
    },
    async rankingAdmin(action, payload = {}) {
      const { data, error } = await client.rpc('brb_ranking_admin', { action, payload });
      if (error) throw new Error(error.message || 'Não foi possível concluir a ação.');
      return data;
    },
    async quizCorrect(question) {
      const { data: s } = await client.auth.getSession();
      if (!s?.session) return { login: false };
      const { data, error } = await client.rpc('brb_quiz_correct', { question });
      if (error) throw new Error(error.message || 'Não foi possível registrar o acerto.');
      return data;
    },
    async reviews(dj) {
      const { data, error } = await client.rpc('brb_reviews', { dj_name: dj });
      if (error) throw new Error(error.message || 'Não foi possível carregar as resenhas.');
      return data || [];
    },
    async opinion(action, payload = {}) {
      const { data, error } = await client.rpc('brb_dj_opinion', { action, payload });
      if (error) throw new Error(error.message || 'Não foi possível salvar sua opinião.');
      return data;
    },
    async activity(action, payload = {}) {
      const { data, error } = await client.rpc('brb_activity', { action, payload });
      if (error) throw new Error(error.message || 'Não foi possível carregar a atividade.');
      return data;
    },
    async interest(action = 'list', payload = {}) {
      const { data, error } = await client.rpc('brb_interest', { action, payload });
      if (error) throw new Error(error.message || 'Não foi possível registrar sua resposta.');
      return data;
    },
    async tickets(action = 'list', payload = {}) {
      const { data, error } = await client.rpc('brb_tickets', { action, payload });
      if (error) throw new Error(error.message || 'Não foi possível concluir. Tente novamente.');
      return data;
    },
    async ticketsAdmin(action = 'list', payload = {}) {
      const { data, error } = await client.rpc('brb_tickets_admin', { action, payload });
      if (error) throw new Error(error.message || 'Não foi possível carregar os pedidos.');
      return data;
    },
    async postEdit(id, title, party, date) {
      const { data, error } = await client.rpc('brb_post_edit', { post_id: id, new_title: title, new_party: party, new_date: date });
      if (error) throw new Error(error.message || 'Não foi possível salvar a postagem.');
      return data;
    },
    async removeMember(id) {
      const { data, error } = await client.rpc('brb_members', { action: 'remove', payload: { id } });
      if (error) throw new Error(error.message || 'Não foi possível excluir o membro.');
      return data;
    },
    async sendApprovalMail(id) {
      const { data: s } = await client.auth.getSession();
      const token = s?.session?.access_token;
      if (!token) throw new Error('Entre com a conta de owner.');
      const r = await fetch(BRB_CONFIG.url + '/functions/v1/brb-approval-mail', {
        method: 'POST', headers: { apikey: BRB_CONFIG.publishableKey, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || 'Não foi possível enviar o e-mail.');
      return body;
    },
    async rpc(action, payload = {}) {
      const { data, error } = await client.rpc('brb_action', { action, payload });
      if (error) throw new Error(error.message || 'Não foi possível enviar. Tente novamente.');
      return data;
    }
  };
})();
