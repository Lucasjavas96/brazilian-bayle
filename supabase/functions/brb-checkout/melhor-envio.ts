type Environment = (key: string) => string;

export function melhorEnvioConfig(env: Environment) {
  const token = env('BRB_ME_TOKEN');
  const email = env('BRB_ME_CONTACT_EMAIL');
  const postalCode = env('BRB_ME_ORIGIN').replace(/-/g, '');
  const service = Number(env('BRB_ME_SEDEX_SERVICE'));
  const [weight, width, height, length] = ['WEIGHT_KG', 'WIDTH_CM', 'HEIGHT_CM', 'LENGTH_CM']
    .map(key => Number(env('BRB_ME_' + key)));
  const handling = env('BRB_ME_HANDLING_DAYS');
  const handlingDays = Number(handling);
  if (!token || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{8}$/.test(postalCode) ||
      !Number.isSafeInteger(service) || service < 1 ||
      [weight, width, height, length].some(value => !Number.isFinite(value) || value <= 0) ||
      !/^\d+$/.test(handling) || !Number.isSafeInteger(handlingDays)) return null;
  return {token, email, postalCode, service, weight, width, height, length, handlingDays};
}

type Line = {quantity: number; unit_cents: number};

export async function quoteMelhorEnvio(
  cep: string, lines: Line[], config: NonNullable<ReturnType<typeof melhorEnvioConfig>>, request = fetch,
) {
  // Hotprinti specifies this package for up to three shirts.
  const units = lines.flatMap(line => Array<number>(line.quantity).fill(line.unit_cents));
  const volumes = [];
  for (let index = 0; index < units.length; index += 3) {
    volumes.push({
      insurance: units.slice(index, index + 3).reduce((total, cents) => total + cents, 0) / 100,
      weight: config.weight, width: config.width, height: config.height, length: config.length,
    });
  }
  const response = await request('https://melhorenvio.com.br/api/v2/me/shipment/calculate', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + config.token,
      'User-Agent': 'Brazilian Bayle (' + config.email + ')',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      from: {postal_code: config.postalCode},
      to: {postal_code: cep},
      services: String(config.service),
      volumes,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('carrier_unavailable');
  const results = await response.json();
  const services = Array.isArray(results) ? results : [results];
  const quote = services.find(item => Number(item?.id) === config.service && !item.error);
  const value = String(quote?.custom_price ?? quote?.price);
  const days = Number(quote?.custom_delivery_range?.max ?? quote?.delivery_range?.max ?? quote?.delivery_time);
  const cents = Math.round(Number(value) * 100);
  if (!quote || !/^\d+(?:\.\d{1,2})?$/.test(value) || !Number.isSafeInteger(cents) || cents <= 0 ||
      !Number.isSafeInteger(days) || days < 1) throw new Error('invalid_carrier_response');
  return {service: 'SEDEX', shipping_cents: cents, delivery_business_days: days + config.handlingDays};
}
