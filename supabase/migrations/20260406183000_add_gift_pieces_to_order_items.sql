ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS gift_pieces integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.order_items.gift_pieces IS 'Additional gifted pieces outside full gift boxes for each order item.';
