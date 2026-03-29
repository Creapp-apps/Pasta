-- =====================================================
-- MIGRACIÓN V3: Módulo de Pedidos y Asignaciones
-- Ejecutar en el SQL Editor de Supabase
-- =====================================================

-- 1. Detalle de los Pedidos (Qué productos se compraron)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT,
    quantity NUMERIC(10,2) NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Trazabilidad exacta: De qué lotes físicos salieron esas cajas
-- (Por diseño, order_item_id se liga a los lotes que cubren su "quantity")
CREATE TABLE IF NOT EXISTS order_lot_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    lot_id UUID NOT NULL REFERENCES production_lots(id) ON DELETE RESTRICT,
    quantity_allocated NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Temporal: Deshabilitar RLS para desarrollo inicial rápido
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_lot_allocations DISABLE ROW LEVEL SECURITY;
