-- Agregamos la columna whatsapp_contacts a la tabla tenants
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS whatsapp_contacts JSONB DEFAULT '[]';
