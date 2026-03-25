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
