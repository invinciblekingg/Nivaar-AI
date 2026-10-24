-- ==============================================================================
-- UDYON & SYMBIOSIS.AI -- UNIFIED SUPABASE ENTERPRISE DATABASE SCHEMA
-- Single Source of Truth for Industrial IoT, TENG Sensors, Vision & Symbiosis
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. Core Industrial Fleet & Machinery Tables
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.machines (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(64) NOT NULL,
    asset_tag VARCHAR(64) UNIQUE NOT NULL,
    location_label VARCHAR(120) NOT NULL,
    status VARCHAR(32) DEFAULT 'HEALTHY',
    health_index DOUBLE PRECISION DEFAULT 98.5,
    profile_config JSONB DEFAULT '{}'::jsonb,
    is_monitored BOOLEAN DEFAULT true,
    last_analyzed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_machines_status ON public.machines(status);
CREATE INDEX IF NOT EXISTS idx_machines_category ON public.machines(category);
CREATE INDEX IF NOT EXISTS idx_machines_asset_tag ON public.machines(asset_tag);

CREATE TABLE IF NOT EXISTS public.sensor_readings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    machine_id TEXT NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    sensor_type VARCHAR(64) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(32) NOT NULL,
    source VARCHAR(32) DEFAULT 'REAL',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_machine_time ON public.sensor_readings(machine_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_type_time ON public.sensor_readings(sensor_type, timestamp DESC);

CREATE TABLE IF NOT EXISTS public.uploaded_datasets (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    machine_id TEXT NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    storage_url TEXT,
    row_count INTEGER DEFAULT 0,
    sensor_columns JSONB DEFAULT '[]'::jsonb,
    is_synthetic BOOLEAN DEFAULT false,
    provenance VARCHAR(255) DEFAULT 'Manual CSV Ingestion',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.analysis_jobs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    machine_id TEXT NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    dataset_id TEXT REFERENCES public.uploaded_datasets(id) ON DELETE SET NULL,
    status VARCHAR(32) DEFAULT 'PENDING',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    worker_id VARCHAR(64),
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    lease_expires_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.analysis_results (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    job_id TEXT UNIQUE REFERENCES public.analysis_jobs(id) ON DELETE CASCADE,
    machine_id TEXT NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    dataset_id TEXT REFERENCES public.uploaded_datasets(id) ON DELETE SET NULL,
    anomaly_count INTEGER DEFAULT 0,
    max_anomaly_score DOUBLE PRECISION DEFAULT 0.0,
    health_index_evaluated DOUBLE PRECISION DEFAULT 100.0,
    baseline_metrics JSONB DEFAULT '{}'::jsonb,
    feature_importance JSONB DEFAULT '[]'::jsonb,
    summary TEXT NOT NULL,
    recommendations JSONB DEFAULT '[]'::jsonb,
    fault_hypotheses JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.anomalies (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    result_id TEXT REFERENCES public.analysis_results(id) ON DELETE CASCADE,
    machine_id TEXT NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    anomaly_score DOUBLE PRECISION NOT NULL,
    feature_values JSONB DEFAULT '{}'::jsonb,
    top_influential_sensors JSONB DEFAULT '[]'::jsonb,
    severity VARCHAR(32) DEFAULT 'MEDIUM',
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.alerts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    anomaly_id TEXT REFERENCES public.anomalies(id) ON DELETE SET NULL,
    machine_id TEXT NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    severity VARCHAR(32) DEFAULT 'HIGH',
    status VARCHAR(32) DEFAULT 'NEW',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    readings_snapshot JSONB DEFAULT '{}'::jsonb,
    acknowledged_by VARCHAR(64),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_machine_status ON public.alerts(machine_id, status);

CREATE TABLE IF NOT EXISTS public.maintenance_tasks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    machine_id TEXT NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    alert_id TEXT REFERENCES public.alerts(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(32) DEFAULT 'HIGH',
    assignee VARCHAR(120) DEFAULT 'Lead Maintenance Tech',
    status VARCHAR(32) DEFAULT 'OPEN',
    risk_score DOUBLE PRECISION DEFAULT 75.0,
    due_date TIMESTAMPTZ,
    audit_trail JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.incidents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    machine_id TEXT NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    operational_impact TEXT NOT NULL,
    severity VARCHAR(32) DEFAULT 'CRITICAL',
    status VARCHAR(32) DEFAULT 'INVESTIGATING',
    timeline JSONB DEFAULT '[]'::jsonb,
    recommended_inspections JSONB DEFAULT '[]'::jsonb,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.worker_heartbeats (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    worker_id VARCHAR(64) UNIQUE NOT NULL,
    status VARCHAR(32) DEFAULT 'ACTIVE',
    active_jobs_count INTEGER DEFAULT 0,
    completed_jobs_count INTEGER DEFAULT 0,
    failed_jobs_count INTEGER DEFAULT 0,
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    system_info JSONB DEFAULT '{}'::jsonb
);

-- ==============================================================================
-- 3. TENG Self-Powered Sensor Telemetry & Waveform Data
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.teng_readings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    machine_id TEXT NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    voltage_v DOUBLE PRECISION NOT NULL,
    vibration_frequency_hz DOUBLE PRECISION NOT NULL,
    signal_amplitude_v DOUBLE PRECISION NOT NULL,
    charge_transfer_nc DOUBLE PRECISION DEFAULT 0.0,
    source VARCHAR(32) DEFAULT 'TENG_VIBRATION_SENSOR',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teng_readings_machine_time ON public.teng_readings(machine_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS public.teng_datasets (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    machine_id TEXT NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    storage_url TEXT,
    row_count INTEGER DEFAULT 0,
    summary_metrics JSONB DEFAULT '{}'::jsonb,
    health_index DOUBLE PRECISION DEFAULT 100.0,
    max_anomaly_score DOUBLE PRECISION DEFAULT 0.0,
    fault_flags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. Computer Vision AI Structural Defect Inspections
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.image_inspections (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    machine_id TEXT NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    raw_storage_url TEXT,
    annotated_file_path VARCHAR(512) NOT NULL,
    annotated_storage_url TEXT,
    component_name VARCHAR(120) DEFAULT 'Machine Component',
    defects JSONB DEFAULT '[]'::jsonb,
    total_defects_found INTEGER DEFAULT 0,
    confirmed_count INTEGER DEFAULT 0,
    uncertain_count INTEGER DEFAULT 0,
    max_confidence DOUBLE PRECISION DEFAULT 0.0,
    visual_severity VARCHAR(32) DEFAULT 'LOW',
    visual_condition_score DOUBLE PRECISION DEFAULT 100.0,
    condition_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_image_inspections_machine ON public.image_inspections(machine_id, created_at DESC);

-- ==============================================================================
-- 5. Symbiosis AI -- Multimodal Fusion & Industrial Waste Marketplace
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.symbiosis_evaluations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    machine_id TEXT NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    teng_dataset_id TEXT,
    image_inspection_id TEXT,
    composite_health_index DOUBLE PRECISION NOT NULL,
    overall_severity VARCHAR(32) DEFAULT 'LOW',
    primary_fault_cause VARCHAR(255) NOT NULL,
    confidence_score DOUBLE PRECISION DEFAULT 0.85,
    attribution_breakdown JSONB DEFAULT '{}'::jsonb,
    cross_modal_correlations JSONB DEFAULT '[]'::jsonb,
    recommended_actions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participating Industrial Facilities
CREATE TABLE IF NOT EXISTS public.symbiosis_companies (
    id VARCHAR(64) PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    industry_type VARCHAR(120) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    verified BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Circular Material Listings (Both Waste Byproducts and Material Demands)
CREATE TABLE IF NOT EXISTS public.symbiosis_materials (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    company_id VARCHAR(64) REFERENCES public.symbiosis_companies(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL, -- 'waste' (byproduct for sale) or 'requirement' (material demand)
    material_type VARCHAR(120) NOT NULL,
    category VARCHAR(120) NOT NULL,
    description TEXT,
    quantity DOUBLE PRECISION NOT NULL,
    unit VARCHAR(64) NOT NULL,
    quality JSONB DEFAULT '{}'::jsonb,
    pricing JSONB DEFAULT '{}'::jsonb,
    hazardous VARCHAR(32) DEFAULT 'non-hazardous',
    availability VARCHAR(64) DEFAULT 'continuous',
    verified BOOLEAN DEFAULT true,
    views INTEGER DEFAULT 0,
    inquiries INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_symbiosis_materials_type ON public.symbiosis_materials(type);
CREATE INDEX IF NOT EXISTS idx_symbiosis_materials_category ON public.symbiosis_materials(category);

-- Symbiosis AI Synergy Matches
CREATE TABLE IF NOT EXISTS public.symbiosis_matches (
    id VARCHAR(64) PRIMARY KEY,
    producer_listing_id VARCHAR(64) REFERENCES public.symbiosis_materials(id) ON DELETE CASCADE,
    consumer_listing_id VARCHAR(64) REFERENCES public.symbiosis_materials(id) ON DELETE CASCADE,
    producer_company VARCHAR(255) NOT NULL,
    consumer_company VARCHAR(255) NOT NULL,
    material_type VARCHAR(120) NOT NULL,
    compatibility_score INTEGER NOT NULL,
    distance_km DOUBLE PRECISION NOT NULL,
    co2_reduction_tonnes DOUBLE PRECISION DEFAULT 0.0,
    annual_cost_savings_inr DOUBLE PRECISION DEFAULT 0.0,
    status VARCHAR(32) DEFAULT 'IDENTIFIED', -- IDENTIFIED, IN_NEGOTIATION, CONTRACTED, REJECTED
    matching_factors JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commercial Trade Inquiries & Negotiation Threads
CREATE TABLE IF NOT EXISTS public.symbiosis_inquiries (
    id VARCHAR(64) PRIMARY KEY,
    listing_id VARCHAR(64) REFERENCES public.symbiosis_materials(id) ON DELETE CASCADE,
    material_title VARCHAR(255) NOT NULL,
    buyer_company_id VARCHAR(64) NOT NULL,
    buyer_company_name VARCHAR(255) NOT NULL,
    seller_company_id VARCHAR(64) NOT NULL,
    seller_company_name VARCHAR(255) NOT NULL,
    quantity_requested DOUBLE PRECISION NOT NULL,
    unit VARCHAR(64) NOT NULL,
    offered_price DOUBLE PRECISION,
    status VARCHAR(32) DEFAULT 'PROPOSED', -- PROPOSED, ACCEPTED, REJECTED, COMPLETED
    logistics_type VARCHAR(64) DEFAULT 'Buyer Organized Freight',
    latest_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. Generated Engineering PDF Reports Metadata
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.generated_reports (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    machine_id TEXT NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    asset_tag VARCHAR(64) NOT NULL,
    report_filename VARCHAR(255) NOT NULL,
    storage_url TEXT NOT NULL,
    health_index DOUBLE PRECISION,
    condition_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. Supabase Storage Buckets
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('machine-images', 'machine-images', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('telemetry-datasets', 'telemetry-datasets', true, 52428800, ARRAY['text/csv', 'application/csv', 'text/plain']),
    ('diagnostic-reports', 'diagnostic-reports', true, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ==============================================================================
-- 8. Row Level Security (RLS) & Cross-Application Policies
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teng_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teng_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symbiosis_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symbiosis_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symbiosis_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symbiosis_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symbiosis_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

-- Allow Public & Anon Read/Write for Single Source of Truth
-- (Allows Udyon and Symbiosis.AI to exchange data seamlessly without blocking operations)
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "allow_anon_all_ops" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "allow_anon_all_ops" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', tbl);
    END LOOP;
END $$;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Public access to machine-images" ON storage.objects;
CREATE POLICY "Public access to machine-images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'machine-images');

DROP POLICY IF EXISTS "Upload access to machine-images" ON storage.objects;
CREATE POLICY "Upload access to machine-images" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'machine-images');

DROP POLICY IF EXISTS "Public access to telemetry-datasets" ON storage.objects;
CREATE POLICY "Public access to telemetry-datasets" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'telemetry-datasets');

DROP POLICY IF EXISTS "Upload access to telemetry-datasets" ON storage.objects;
CREATE POLICY "Upload access to telemetry-datasets" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'telemetry-datasets');

DROP POLICY IF EXISTS "Public access to diagnostic-reports" ON storage.objects;
CREATE POLICY "Public access to diagnostic-reports" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'diagnostic-reports');

DROP POLICY IF EXISTS "Upload access to diagnostic-reports" ON storage.objects;
CREATE POLICY "Upload access to diagnostic-reports" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'diagnostic-reports');

-- ==============================================================================
-- 9. Real-Time Synchronization Publications
-- ==============================================================================

-- Enable Realtime publication for tables requiring instant dashboard reflection
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.machines;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_tasks;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.symbiosis_materials;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.symbiosis_matches;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.symbiosis_inquiries;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.image_inspections;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.teng_datasets;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
