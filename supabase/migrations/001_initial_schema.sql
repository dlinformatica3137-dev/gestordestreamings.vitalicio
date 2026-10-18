-- ==============================================================================
-- GESTOR DE STREAMINGS SaaS — SCHEMA MIGRATION & RLS POLICIES (SUPABASE)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tenants (Empresas / Contas SaaS)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Profiles (Usuários e Vinculação ao Tenant)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'owner' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Licenses (Licenças SaaS, Teste 24h e Vitalícia)
CREATE TABLE IF NOT EXISTS public.licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
    type VARCHAR(20) DEFAULT 'trial' NOT NULL, -- 'trial', 'lifetime'
    status VARCHAR(20) DEFAULT 'active' NOT NULL, -- 'active', 'expired'
    trial_started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    trial_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    activated_at TIMESTAMP WITH TIME ZONE,
    transaction_id VARCHAR(255),
    price NUMERIC(10, 2) DEFAULT 199.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Payment Transactions (Mercado Pago Transações)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    mp_preference_id VARCHAR(255),
    mp_payment_id VARCHAR(255),
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'rejected'
    payment_method VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE
);

-- 6. Applications (Aplicativos e Serviços de Streaming)
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'streaming', 'canais', 'iptv', 'esportes', 'combos', 'outros'
    description TEXT,
    color VARCHAR(20) DEFAULT '#2563EB',
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Plans (Planos Comerciais)
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    app_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
    category VARCHAR(50),
    price NUMERIC(10, 2) NOT NULL,
    billing_cycle VARCHAR(50) DEFAULT 'mensal' NOT NULL,
    duration_days INTEGER DEFAULT 30 NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. Customers (Cadastro de Clientes)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    whatsapp VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    cpf VARCHAR(50),
    app_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
    monthly_fee NUMERIC(10, 2) NOT NULL,
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Pix',
    status VARCHAR(20) DEFAULT 'active' NOT NULL, -- 'active', 'inactive', 'overdue'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. Charges (Cobranças e Vencimentos)
CREATE TABLE IF NOT EXISTS public.charges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    app_name VARCHAR(255),
    plan_name VARCHAR(255),
    amount NUMERIC(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30) DEFAULT 'pending' NOT NULL, -- 'pending', 'paid', 'overdue', 'cancelled'
    payment_method VARCHAR(50),
    discount NUMERIC(10, 2) DEFAULT 0,
    notes TEXT,
    registered_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. WhatsApp Instances
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) DEFAULT 'evolution' NOT NULL,
    api_url TEXT,
    status VARCHAR(30) DEFAULT 'disconnected' NOT NULL, -- 'connected', 'disconnected', 'connecting'
    phone_number VARCHAR(50),
    qr_code TEXT,
    last_connected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 11. WhatsApp Automation Settings
CREATE TABLE IF NOT EXISTS public.automation_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    send_one_day_before BOOLEAN DEFAULT TRUE NOT NULL,
    send_on_due_date BOOLEAN DEFAULT TRUE NOT NULL,
    send_after_due_date BOOLEAN DEFAULT TRUE NOT NULL,
    scheduled_time VARCHAR(10) DEFAULT '09:00' NOT NULL,
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo' NOT NULL,
    message_interval_seconds INTEGER DEFAULT 15 NOT NULL,
    rate_limit_per_hour INTEGER DEFAULT 120 NOT NULL,
    template_one_day_before TEXT NOT NULL,
    template_due_date TEXT NOT NULL,
    template_after_due_date TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 12. WhatsApp Message Logs
CREATE TABLE IF NOT EXISTS public.message_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    message_content TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'sent' NOT NULL,
    error_reason TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 13. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES — Multi-Tenant Isolation
-- ==============================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Profiles: Users can view & update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

-- Multi-Tenant RLS for Private Tables
CREATE POLICY "Tenant isolation for applications" ON public.applications
    FOR ALL USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Tenant isolation for plans" ON public.plans
    FOR ALL USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Tenant isolation for customers" ON public.customers
    FOR ALL USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Tenant isolation for charges" ON public.charges
    FOR ALL USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Tenant isolation for licenses" ON public.licenses
    FOR SELECT USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Tenant isolation for transactions" ON public.payment_transactions
    FOR ALL USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Tenant isolation for whatsapp_instances" ON public.whatsapp_instances
    FOR ALL USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Tenant isolation for automation_settings" ON public.automation_settings
    FOR ALL USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Tenant isolation for message_logs" ON public.message_logs
    FOR ALL USING (tenant_id = public.get_auth_tenant_id());
