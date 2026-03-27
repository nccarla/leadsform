-- Estado del formulario (un solo registro, id = 1)
CREATE TABLE IF NOT EXISTS lead_app_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO lead_app_state (id, payload)
VALUES (
  1,
  '{"draft":{},"history":[],"currentStageIndex":0}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Directorio de oportunidad → cliente/vendedor (autocompletado por número de oportunidad)
CREATE TABLE IF NOT EXISTS opportunity_directory (
  opportunity_number TEXT PRIMARY KEY,
  client_name TEXT NOT NULL DEFAULT '',
  client_email TEXT NOT NULL DEFAULT '',
  client_phone TEXT NOT NULL DEFAULT '',
  seller_name TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auditorias recibidas por endpoint /api/audit
CREATE TABLE IF NOT EXISTS audits (
  id BIGSERIAL PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT '',
  client_name TEXT NOT NULL DEFAULT '',
  client_email TEXT NOT NULL DEFAULT '',
  client_phone TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  description TEXT NOT NULL DEFAULT '',
  validator_source TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  meeting_day TEXT NOT NULL DEFAULT '',
  advisor_name TEXT NOT NULL DEFAULT '',
  advisor_status TEXT NOT NULL DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'pending',
  reminder_minutes INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Autonumeración de oportunidades
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'opportunity_number_seq') THEN
    CREATE SEQUENCE opportunity_number_seq START 1;
  END IF;
END $$;

-- Actividades/agenda asociadas a una oportunidad
CREATE TABLE IF NOT EXISTS opportunity_activities (
  id UUID PRIMARY KEY,
  opportunity_number TEXT NOT NULL REFERENCES opportunity_directory(opportunity_number) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS opportunity_activities_by_opp
  ON opportunity_activities (opportunity_number, scheduled_at);

-- Respuestas de preguntas por etapa, vinculadas a una oportunidad
CREATE TABLE IF NOT EXISTS opportunity_stage_data (
  opportunity_number TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (opportunity_number, stage_id)
);

-- Bitácora / audit trail de todo lo que pasa con cada oportunidad
CREATE TABLE IF NOT EXISTS opportunity_logs (
  id BIGSERIAL PRIMARY KEY,
  opportunity_number TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  stage_id TEXT NOT NULL DEFAULT '',
  from_stage TEXT NOT NULL DEFAULT '',
  to_stage TEXT NOT NULL DEFAULT '',
  seller_name TEXT NOT NULL DEFAULT '',
  client_name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS opportunity_logs_by_opp
  ON opportunity_logs (opportunity_number, created_at);
CREATE INDEX IF NOT EXISTS opportunity_logs_by_event
  ON opportunity_logs (event_type, created_at);
