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
    async content(prefix = '') {
      const { data, error } = await client.rpc('brb_content', { prefix });
      if (error) throw new Error(error.message || 'Não foi possível carregar o conteúdo.');
      return data;
    },
    async owner(action, payload = {}) {
      const { data, error } = await client.rpc('brb_owner', { action, payload });
      if (error) throw new Error(error.message || 'Não foi possível concluir a ação.');
      return data;
    },
    async rpc(action, payload = {}) {
      const { data, error } = await client.rpc('brb_action', { action, payload });
      if (error) throw new Error(error.message || 'Não foi possível enviar. Tente novamente.');
      return data;
    }
  };
})();
