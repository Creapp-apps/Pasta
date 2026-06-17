-- Agregamos la columna logo_url a la tabla tenants
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS logo_url TEXT;
