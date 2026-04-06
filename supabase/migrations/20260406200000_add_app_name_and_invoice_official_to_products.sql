alter table public.products
  add column if not exists app_name text,
  add column if not exists price_invoice_official numeric;

update public.products
set
  app_name = coalesce(app_name, name),
  price_invoice_official = coalesce(price_invoice_official, round((coalesce(price_invoice, 0) / 1.19)::numeric, 4))
where app_name is null
   or price_invoice_official is null;
