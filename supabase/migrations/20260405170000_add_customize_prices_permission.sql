-- Add customize prices permission (manual grant only)
INSERT INTO public.permissions (code, name_ar, description_ar, category, resource)
VALUES ('customize_prices', 'تخصيص الأسعار', 'يسمح بتخصيص سعر الوحدة في البيع والطلبيات', 'crud', 'pricing')
ON CONFLICT (code) DO NOTHING;

-- Move GPS bypass permission into a dedicated GPS resource group
UPDATE public.permissions
SET resource = 'gps'
WHERE code = 'bypass_location_check';
