CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_status') THEN
    CREATE TYPE room_status AS ENUM ('waiting', 'playing', 'finished');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_visibility') THEN
    CREATE TYPE room_visibility AS ENUM ('public', 'private', 'invite_only');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_type') THEN
    CREATE TYPE property_type AS ENUM (
      'city',
      'station',
      'utility',
      'tax',
      'chance',
      'community_chest',
      'start',
      'jail',
      'parking'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users_guest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(10) NOT NULL UNIQUE,
  room_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255),
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  visibility room_visibility NOT NULL DEFAULT 'public',
  invite_code VARCHAR(64) UNIQUE,
  max_players INT NOT NULL DEFAULT 4,
  starting_money INT NOT NULL DEFAULT 15000000,
  turn_timer_seconds INT NOT NULL DEFAULT 60,
  status room_status NOT NULL DEFAULT 'waiting',
  created_by UUID NOT NULL REFERENCES users_guest(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (max_players BETWEEN 2 AND 8),
  CHECK (starting_money > 0),
  CHECK (turn_timer_seconds BETWEEN 15 AND 300),
  CHECK (
    (visibility = 'public' AND is_public = TRUE)
    OR (visibility IN ('private', 'invite_only') AND is_public = FALSE)
  ),
  CHECK (
    (visibility = 'invite_only' AND invite_code IS NOT NULL)
    OR visibility <> 'invite_only'
  )
);

CREATE TABLE IF NOT EXISTS room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users_guest(id) ON DELETE CASCADE,
  player_name VARCHAR(50) NOT NULL,
  money INT NOT NULL DEFAULT 0,
  position INT NOT NULL DEFAULT 0,
  is_bankrupt BOOLEAN NOT NULL DEFAULT FALSE,
  is_host BOOLEAN NOT NULL DEFAULT FALSE,
  is_ready BOOLEAN NOT NULL DEFAULT FALSE,
  turn_order INT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (position BETWEEN 0 AND 39),
  CHECK (turn_order IS NULL OR turn_order >= 0),
  UNIQUE (room_id, user_id),
  UNIQUE (room_id, turn_order)
);

CREATE TABLE IF NOT EXISTS properties (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type property_type NOT NULL,
  color_group VARCHAR(20),
  price INT,
  base_rent INT,
  rent_1_house INT,
  rent_2_house INT,
  rent_3_house INT,
  rent_4_house INT,
  rent_hotel INT,
  house_price INT,
  mortgage_value INT,
  CHECK (id BETWEEN 0 AND 39),
  CHECK (price IS NULL OR price > 0),
  CHECK (base_rent IS NULL OR base_rent >= 0),
  CHECK (house_price IS NULL OR house_price > 0),
  CHECK (mortgage_value IS NULL OR mortgage_value > 0),
  CHECK (
    type <> 'city'
    OR (
      color_group IS NOT NULL
      AND price IS NOT NULL
      AND base_rent IS NOT NULL
      AND house_price IS NOT NULL
      AND mortgage_value IS NOT NULL
    )
  )
);

CREATE TABLE IF NOT EXISTS room_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  property_id INT NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  owner_id UUID REFERENCES room_players(id) ON DELETE SET NULL,
  house_count INT NOT NULL DEFAULT 0,
  hotel_count INT NOT NULL DEFAULT 0,
  is_mortgaged BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (room_id, property_id),
  CHECK (house_count BETWEEN 0 AND 4),
  CHECK (hotel_count IN (0, 1)),
  CHECK (NOT (hotel_count = 1 AND house_count > 0))
);

CREATE TABLE IF NOT EXISTS game_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_public_status ON rooms(is_public, status);
CREATE INDEX IF NOT EXISTS idx_rooms_visibility_status ON rooms(visibility, status);
CREATE INDEX IF NOT EXISTS idx_room_players_room_id ON room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_color_group ON properties(color_group);
CREATE INDEX IF NOT EXISTS idx_room_properties_room_id ON room_properties(room_id);
CREATE INDEX IF NOT EXISTS idx_room_properties_owner_id ON room_properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_game_logs_room_created_at ON game_logs(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_game_logs_room_event_type ON game_logs(room_id, event_type);
