-- =====================================================
-- MIGRACIÓN V6: Número de Pedido Incremental por Fábrica
-- Ejecutar en el SQL Editor de Supabase
-- =====================================================

-- 1. Agregar columna order_number
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number INTEGER;

-- 2. Numerar pedidos existentes
WITH numbered_orders AS (
  SELECT id, row_number() OVER (PARTITION BY tenant_id ORDER BY created_at) as num
  FROM orders
)
UPDATE orders
SET order_number = numbered_orders.num
FROM numbered_orders
WHERE orders.id = numbered_orders.id;

-- 3. Crear función de trigger para auto-asignar número secuencial por tenant
CREATE OR REPLACE FUNCTION assign_order_number()
RETURNS TRIGGER AS $$
DECLARE
  max_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(order_number), 0) INTO max_num
  FROM orders
  WHERE tenant_id = NEW.tenant_id;
  
  NEW.order_number := max_num + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear el trigger set_order_number
DROP TRIGGER IF EXISTS trigger_set_order_number ON orders;
CREATE TRIGGER trigger_set_order_number
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION assign_order_number();
