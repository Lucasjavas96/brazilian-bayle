alter table public.brb_shop_orders
  add column if not exists meta_browser_agent text,
  add column if not exists meta_purchase_sent_at timestamptz;
