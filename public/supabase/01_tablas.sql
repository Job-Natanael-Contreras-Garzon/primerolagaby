-- =============================================
-- PASO 1: CREAR TABLAS EN ORDEN
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =============================================

-- 1.1 Municipios
CREATE TABLE municipios (
  id           SERIAL PRIMARY KEY,
  nombre       VARCHAR(150) NOT NULL,
  departamento VARCHAR(100) NOT NULL DEFAULT 'Santa Cruz',
  activo       BOOLEAN DEFAULT true
);

-- 1.2 Distritos
CREATE TABLE distritos (
  id               SERIAL PRIMARY KEY,
  nombre           VARCHAR(150) NOT NULL,
  numero_distrito  INT NOT NULL,
  municipio_id     INT NOT NULL REFERENCES municipios(id),
  activo           BOOLEAN DEFAULT true
);

-- 1.3 Recintos
CREATE TABLE recintos (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(200) NOT NULL,
  direccion   VARCHAR(300),
  distrito_id INT NOT NULL REFERENCES distritos(id),
  lat         DECIMAL(10,8),
  lng         DECIMAL(11,8),
  activo      BOOLEAN DEFAULT true
);

-- 1.4 Mesas
CREATE TABLE mesas (
  id                SERIAL PRIMARY KEY,
  numero_mesa       VARCHAR(20) NOT NULL,
  recinto_id        INT NOT NULL REFERENCES recintos(id),
  total_habilitados INT DEFAULT 0,
  estado            VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','transmitida','incidencia','no_validada')),
  activo            BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 1.5 Partidos
CREATE TABLE partidos (
  id        SERIAL PRIMARY KEY,
  nombre    VARCHAR(200) NOT NULL,
  sigla     VARCHAR(30) NOT NULL,
  color_hex VARCHAR(7),
  logo_url  VARCHAR(500),
  activo    BOOLEAN DEFAULT true
);

-- 1.6 Usuarios (extiende auth.users de Supabase Auth)
CREATE TABLE usuarios (
  id         SERIAL PRIMARY KEY,
  auth_id    UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre     VARCHAR(100) NOT NULL,
  apellido   VARCHAR(100) NOT NULL,
  email      VARCHAR(150) UNIQUE NOT NULL,
  rol        VARCHAR(20) NOT NULL
             CHECK (rol IN ('admin','supervisor2','supervisor1','veedor')),
  creado_por INT REFERENCES usuarios(id),
  distrito_id INT REFERENCES distritos(id),
  recinto_id  INT REFERENCES recintos(id),  -- solo para supervisor1
  activo      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 1.7 Veedor_Recintos (un veedor puede cubrir múltiples recintos)
CREATE TABLE veedor_recintos (
  id         SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  recinto_id INT NOT NULL REFERENCES recintos(id),
  activo     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, recinto_id)
);

-- 1.8 Transmisiones
CREATE TABLE transmisiones (
  id               SERIAL PRIMARY KEY,
  mesa_id          INT NOT NULL REFERENCES mesas(id),
  usuario_id       INT NOT NULL REFERENCES usuarios(id),
  imagen_acta_url  VARCHAR(500),
  es_valida        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 1.9 Resultados por transmisión
CREATE TABLE resultados_transmision (
  id               SERIAL PRIMARY KEY,
  transmision_id   INT NOT NULL REFERENCES transmisiones(id),
  partido_id       INT NOT NULL REFERENCES partidos(id),
  votos_obtenidos  INT NOT NULL DEFAULT 0,
  tipo_cargo       VARCHAR(20) NOT NULL
                   CHECK (tipo_cargo IN ('alcalde','concejal'))
);

-- 1.10 Votos especiales
CREATE TABLE votos_especiales (
  id              SERIAL PRIMARY KEY,
  transmision_id  INT NOT NULL REFERENCES transmisiones(id) UNIQUE,
  votos_blancos   INT NOT NULL DEFAULT 0,
  votos_nulos     INT NOT NULL DEFAULT 0,
  votos_validos   INT NOT NULL DEFAULT 0
);

-- 1.11 Incidencias
CREATE TABLE incidencias (
  id              SERIAL PRIMARY KEY,
  mesa_id         INT NOT NULL REFERENCES mesas(id),
  transmision_id  INT NOT NULL REFERENCES transmisiones(id),
  solicitado_por  INT NOT NULL REFERENCES usuarios(id),
  justificativo   TEXT NOT NULL,
  estado          VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','resuelto')),
  resuelto_por    INT REFERENCES usuarios(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

-- 1.12 Monitoreo Config (tabla de una sola fila)
CREATE TABLE monitoreo_config (
  id                INT PRIMARY KEY DEFAULT 1,
  mostrar_cargo     VARCHAR(20) DEFAULT 'ambos'
                    CHECK (mostrar_cargo IN ('alcalde','concejal','ambos')),
  mostrar_blancos   BOOLEAN DEFAULT true,
  mostrar_nulos     BOOLEAN DEFAULT true,
  mostrar_validos   BOOLEAN DEFAULT true,
  nivel_geografico  VARCHAR(20) DEFAULT 'municipio'
                    CHECK (nivel_geografico IN ('municipio','distrito','recinto')),
  actualizado_por   INT REFERENCES usuarios(id),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  CHECK (id = 1)
);

-- Fila única inicial
INSERT INTO monitoreo_config (id) VALUES (1);

-- 1.13 Monitoreo Partidos Visibles
CREATE TABLE monitoreo_partidos_visibles (
  id         SERIAL PRIMARY KEY,
  partido_id INT NOT NULL REFERENCES partidos(id) UNIQUE,
  visible    BOOLEAN DEFAULT true
);

-- 1.14 Bitácora de requests
CREATE TABLE bitacora_requests (
  id          SERIAL PRIMARY KEY,
  usuario_id  INT REFERENCES usuarios(id),
  metodo      VARCHAR(10) NOT NULL,
  endpoint    VARCHAR(300) NOT NULL,
  payload     JSONB,
  ip_origen   VARCHAR(50),
  status_code INT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
