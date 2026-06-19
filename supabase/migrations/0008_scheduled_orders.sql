-- Migration 0008: Pedidos Programados para Entrega Futura

ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_date DATE;
