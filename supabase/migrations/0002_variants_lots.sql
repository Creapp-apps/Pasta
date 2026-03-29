-- =====================================================
-- MIGRACIÓN V2: Variantes, Lotes de Producción
-- Ejecutar en el SQL Editor de Supabase
-- =====================================================

-- 1. Nuevas columnas en products (solo para productos terminados)
ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Variantes de Producto (sabores/rellenos)
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,           -- "de Jamón y Queso", "de Verdura"
    price_override NUMERIC(10,2),         -- Precio diferencial (null = usa precio base)
    extra_ingredients JSONB DEFAULT '[]', -- [{raw_material_id, required_quantity}]
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Lotes de Producción (trazabilidad)
CREATE TABLE IF NOT EXISTS production_lots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    lot_code VARCHAR(50) NOT NULL,         -- LOT-2026-0001
    quantity_produced NUMERIC(10,2) NOT NULL,
    quantity_remaining NUMERIC(10,2) NOT NULL,
    elaboration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Configuración de impresora por tenant
CREATE TABLE IF NOT EXISTS printer_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    printer_name VARCHAR(255) DEFAULT 'Sin configurar',
    connection_type VARCHAR(50) DEFAULT 'bluetooth', -- bluetooth, usb
    label_width_mm INT DEFAULT 40,
    label_height_mm INT DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Seguridad (temporal: deshabilitar RLS para desarrollo)
ALTER TABLE product_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_lots DISABLE ROW LEVEL SECURITY;
ALTER TABLE printer_config DISABLE ROW LEVEL SECURITY;
