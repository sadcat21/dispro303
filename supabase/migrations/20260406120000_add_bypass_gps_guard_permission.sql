-- Add bypass GPS guard permission (manual grant only)
INSERT INTO public.permissions (code, name_ar, description_ar, category, resource)
VALUES (
  'bypass_gps_guard',
  'تجاوز شرط GPS عند الدخول',
  'يسمح بتجاوز شرط تشغيل GPS عند تسجيل الدخول',
  'crud',
  'gps'
)
ON CONFLICT (code) DO NOTHING;
