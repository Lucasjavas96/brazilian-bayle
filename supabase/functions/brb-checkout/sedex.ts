export async function quoteSedex(cep: string, quantity: number, env: (key: string) => string, request = fetch) {
  const origin = env('BRB_SEDEX_ORIGIN');
  const token = env('BRB_SEDEX_TOKEN');
  const service = env('BRB_SEDEX_SERVICE') || '03220';
  const [weight, length, width, height, tare] = ['WEIGHT_G','LENGTH_CM','WIDTH_CM','HEIGHT_CM','TARE_G'].map(key => Number(env('BRB_SEDEX_' + key)));
  if (!/^\d{8}$/.test(cep) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new Error('invalid_quote');
  if (!/^\d{8}$/.test(origin) || !/^\d{5}$/.test(service) || !token || [weight,length,width,height].some(n => !Number.isSafeInteger(n) || n < 1) || !Number.isSafeInteger(tare) || tare < 0) throw new Error('unconfigured');
  const params = {cepOrigem: origin, cepDestino: cep};
  const get = async (resource: string, query: Record<string,string>) => {
    const response = await request('https://api.correios.com.br/'+resource+'/v1/nacional/'+service+'?'+new URLSearchParams(query), {
      headers: {Authorization: 'Bearer '+token, Accept: 'application/json'},
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error('carrier_unavailable');
    return response.json();
  };
  const [price, delivery] = await Promise.all([
    get('preco',{...params, psObjeto:String(weight*quantity+tare), tpObjeto:'2', comprimento:String(length), largura:String(width), altura:String(height*quantity)}),
    get('prazo',params)
  ]);
  const value = String(price.pcFinal);
  const days = Number(delivery.prazoEntrega);
  if (!/^\d+(?:\.\d{3})*,\d{2}$/.test(value) || !Number.isSafeInteger(days) || days < 0 || delivery.prazoEntrega == null) throw new Error('invalid_carrier_response');
  const cents = Number(value.replace(/[.,]/g,''));
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error('invalid_price');
  return {service:'SEDEX', shipping_cents:cents, transit_business_days:days};
}
