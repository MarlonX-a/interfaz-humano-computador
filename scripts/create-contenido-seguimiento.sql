-- ============================================================
-- Tabla: contenido_seguimiento
-- Permite a los estudiantes "seguir" contenidos.
-- Solo los contenidos seguidos aparecen en su progreso/dashboard
-- y en el panel de desempeño del profesor.
-- ============================================================

CREATE TABLE IF NOT EXISTS contenido_seguimiento (
  id BIGSERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contenido_id BIGINT NOT NULL REFERENCES contenido(id) ON DELETE CASCADE,
  fecha_seguimiento TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, contenido_id)
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_contenido_seguimiento_usuario ON contenido_seguimiento(usuario_id);
CREATE INDEX IF NOT EXISTS idx_contenido_seguimiento_contenido ON contenido_seguimiento(contenido_id);

-- RLS: los estudiantes solo pueden ver/gestionar sus propios seguimientos
ALTER TABLE contenido_seguimiento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own follows"
  ON contenido_seguimiento FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Users can insert own follows"
  ON contenido_seguimiento FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can delete own follows"
  ON contenido_seguimiento FOR DELETE
  USING (auth.uid() = usuario_id);

-- Teachers/admins can view all follows (for performance panel)
CREATE POLICY "Teachers can view all follows"
  ON contenido_seguimiento FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );
