alter table public.products
  add column if not exists allow_invoice_sale boolean not null default true;

update public.products
set allow_invoice_sale = coalesce(allow_invoice_sale, true)
where allow_invoice_sale is distinct from coalesce(allow_invoice_sale, true);
