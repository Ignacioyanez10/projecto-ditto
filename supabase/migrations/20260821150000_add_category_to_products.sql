-- Ditto Market: agregar columna category a products
-- Ejecutar en Supabase → SQL Editor → New query → Run

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category text;

UPDATE public.products
SET category = 'otro'
WHERE category IS NULL;

ALTER TABLE public.products
  ALTER COLUMN category SET DEFAULT 'otro';

ALTER TABLE public.products
  ALTER COLUMN category SET NOT NULL;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_category_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_category_check
  CHECK (category IN (
    'poleras',
    'polerones',
    'pantalones',
    'chaquetas',
    'calzado',
    'accesorios',
    'otro'
  ));

COMMENT ON COLUMN public.products.category IS
  'Categoría del producto para filtros del catálogo (poleras, polerones, pantalones, chaquetas, calzado, accesorios, otro)';
