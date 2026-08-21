-- Ditto Market: agregar categoría 'polerones' al constraint de products
-- Ejecutar en Supabase → SQL Editor → New query → Run

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
