-- FuelBridge Supabase Schema
-- Run this in your Supabase SQL editor to set up tables

-- ─── Fuel Stations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fuel_stations (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  brand       TEXT NOT NULL,
  lat         DECIMAL(10, 7) NOT NULL,
  lng         DECIMAL(10, 7) NOT NULL,
  address     TEXT,
  city        TEXT,
  price_gas91 DECIMAL(6, 2),
  price_gas95 DECIMAL(6, 2),
  price_diesel DECIMAL(6, 2),
  is_open     BOOLEAN DEFAULT true,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT,
  vehicle_type TEXT CHECK (vehicle_type IN ('tricycle', 'jeepney', 'motorcycle', 'delivery_van')),
  cooperative  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Fuel Logs (tracks individual refuels) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS fuel_logs (
  id          SERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  station_id  INTEGER REFERENCES fuel_stations(id),
  fuel_type   TEXT CHECK (fuel_type IN ('gas91', 'gas95', 'diesel')),
  liters      DECIMAL(6, 2) NOT NULL,
  price_per_liter DECIMAL(6, 2) NOT NULL,
  total_cost  DECIMAL(8, 2) GENERATED ALWAYS AS (liters * price_per_liter) STORED,
  logged_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Wallet Transactions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id          SERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT CHECK (type IN ('savings_credit', 'bulk_purchase', 'withdrawal', 'cooperative_share')),
  amount      DECIMAL(10, 2) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Price Reports (user-submitted, for crowdsourcing) ────────────────────────
CREATE TABLE IF NOT EXISTS price_reports (
  id          SERIAL PRIMARY KEY,
  station_id  INTEGER REFERENCES fuel_stations(id),
  user_id     UUID REFERENCES users(id),
  fuel_type   TEXT CHECK (fuel_type IN ('gas91', 'gas95', 'diesel')),
  price       DECIMAL(6, 2) NOT NULL,
  confirmed_by INT DEFAULT 0,  -- upvote count
  reported_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Seed Data: Fuel Stations ─────────────────────────────────────────────────
INSERT INTO fuel_stations (name, brand, lat, lng, address, city, price_gas91, price_gas95, price_diesel, is_open) VALUES
  ('Petron - EDSA Magallanes', 'Petron', 14.5547, 121.0244, 'EDSA cor. Magallanes Ave, Makati', 'Makati', 56.20, 60.15, 52.10, true),
  ('Shell - Alabang', 'Shell', 14.4195, 121.0438, 'Alabang-Zapote Rd, Muntinlupa', 'Muntinlupa', 55.80, 59.75, 51.90, true),
  ('Caltex - Laguna Blvd', 'Caltex', 14.2717, 121.4115, 'National Hwy, Calamba, Laguna', 'Calamba', 54.50, 58.30, 50.75, true),
  ('Phoenix - Sta. Rosa', 'Phoenix', 14.2872, 121.0862, 'Sta. Rosa-Tagaytay Rd, Sta. Rosa', 'Sta. Rosa', 53.90, 57.80, 50.20, true),
  ('Unioil - Biñan', 'Unioil', 14.3404, 121.0797, 'National Hwy, Biñan, Laguna', 'Biñan', 53.50, 57.20, 49.90, true),
  ('Petron - Quezon Ave', 'Petron', 14.6372, 121.0014, 'Quezon Ave, Quezon City', 'Quezon City', 56.50, 60.45, 52.30, true),
  ('Shell - C5 Road', 'Shell', 14.5764, 121.0734, 'C5 Road, Taguig', 'Taguig', 56.10, 60.00, 52.00, true),
  ('Caltex - Manila North', 'Caltex', 14.6507, 120.9839, 'Espana Blvd, Manila', 'Manila', 55.60, 59.55, 51.70, false),
  ('Phoenix - Pasig', 'Phoenix', 14.5764, 121.0851, 'Ortigas Ave, Pasig', 'Pasig', 55.00, 58.90, 51.10, true),
  ('Seaoil - Los Baños', 'Seaoil', 14.1665, 121.2419, 'National Hwy, Los Baños, Laguna', 'Los Baños', 53.20, 56.95, 49.60, true),
  ('Petron - Bacoor', 'Petron', 14.4590, 120.9610, 'Aguinaldo Hwy, Bacoor, Cavite', 'Bacoor', 55.40, 59.30, 51.50, true),
  ('Shell - Pasay', 'Shell', 14.5386, 121.0005, 'Taft Ave, Pasay', 'Pasay', 56.30, 60.25, 52.20, true)
ON CONFLICT DO NOTHING;

-- ─── Row Level Security (Optional — for production) ───────────────────────────
-- ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE price_reports ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can only see their own logs"
--   ON fuel_logs FOR SELECT USING (auth.uid() = user_id);

-- CREATE POLICY "Users can only insert their own logs"
--   ON fuel_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
