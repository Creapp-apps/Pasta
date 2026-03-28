-- Esquema Inicial para SaaS Fábrica de Pastas (PostgreSQL / Supabase)

-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tablas Principales

-- Tenants (Fábricas)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    client_count INT DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'active', -- active, due_soon, overdue, suspended
    next_billing_date DATE,
    mp_access_token VARCHAR(255),
    bank_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usuarios 
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Si usas Supabase Auth, esto referenciaría auth.users(id)
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'operario', 'repartidor')),
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    gamification_score INT DEFAULT 0,
    current_badge VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Productos y Materiales
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('finished', 'raw_material')),
    name VARCHAR(255) NOT NULL,
    unit_of_measure VARCHAR(50) NOT NULL, -- boxes, kg, units, liters
    current_stock NUMERIC(10,2) DEFAULT 0,
    min_stock_alert NUMERIC(10,2) DEFAULT 0,
    price NUMERIC(10,2) DEFAULT 0, -- Sólo usado para 'finished'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recetas (BOM)
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    finished_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE UNIQUE,
    base_yield NUMERIC(10,2) NOT NULL DEFAULT 1 -- Default: 1 lote genera X cantidad del producto terminado
);

-- Ingredientes de la Receta
CREATE TABLE recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    raw_material_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    required_quantity NUMERIC(10,2) NOT NULL
);

-- Movimientos de Stock (Auditoría)
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('production_in', 'production_out', 'sale', 'adjustment', 'waste')),
    quantity NUMERIC(10,2) NOT NULL,
    operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clientes
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_type VARCHAR(50) DEFAULT 'b2c' CHECK (customer_type IN ('b2c', 'b2b')),
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(100),
    address TEXT,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    zone_tag VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Órdenes
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'on_route', 'delivered')),
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'mercado_pago', 'transfer')),
    total_calc NUMERIC(10,2) DEFAULT 0,
    discount_applied NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Promociones
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    promo_type VARCHAR(50) NOT NULL CHECK (promo_type IN ('volume_discount', 'combo', 'payment_method_discount')),
    rules JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rutas de Reparto (Entregas)
CREATE TABLE deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    repartidor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    route_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Paradas de la Ruta
CREATE TABLE delivery_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    stop_order_index INT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
    completed_at TIMESTAMP WITH TIME ZONE
);

---
--- ROW LEVEL SECURITY (RLS) BASIS
--- (Requiere lógica para obtener current_tenant_id() o usar JWT Claims en Supabase)
---

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_stops ENABLE ROW LEVEL SECURITY;
