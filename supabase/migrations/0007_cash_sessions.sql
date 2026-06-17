-- Migration 0007: Módulo de Arqueo de Caja Diario

CREATE TABLE IF NOT EXISTS cash_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    starting_cash NUMERIC(12,2) DEFAULT 0 NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed')) NOT NULL,
    opened_by UUID REFERENCES users(id) ON DELETE SET NULL,
    closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expected_cash NUMERIC(12,2) DEFAULT 0,
    expected_transfer NUMERIC(12,2) DEFAULT 0,
    expected_mp  NUMERIC(12,2) DEFAULT 0,
    actual_cash NUMERIC(12,2),
    actual_transfer NUMERIC(12,2),
    actual_mp NUMERIC(12,2),
    difference NUMERIC(12,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS y deshabilitar para desarrollo rápido igual que otras tablas
ALTER TABLE cash_sessions DISABLE ROW LEVEL SECURITY;

-- Agregar columnas a la tabla de pedidos (orders)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_session_id UUID REFERENCES cash_sessions(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
