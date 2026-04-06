do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'app_name'
  ) then
    alter table public.products add column app_name text;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'price_invoice_official'
  ) then
    alter table public.products add column price_invoice_official numeric;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'allow_invoice_sale'
  ) then
    alter table public.products add column allow_invoice_sale boolean not null default true;
  end if;

  update public.products
  set
    app_name = coalesce(app_name, name),
    price_invoice_official = coalesce(
      price_invoice_official,
      round((coalesce(price_invoice, 0) / 1.19)::numeric, 4)
    ),
    allow_invoice_sale = coalesce(allow_invoice_sale, true)
  where app_name is null
     or price_invoice_official is null
     or allow_invoice_sale is null;
end
$$;
