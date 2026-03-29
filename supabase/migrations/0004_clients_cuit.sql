-- Agregamos la columna cuit a la tabla clients
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS cuit VARCHAR(50);
