-- Championship (yearly competition series) support
-- Run this in Supabase SQL Editor

-- 1. Championships table (top-level yearly entity)
CREATE TABLE IF NOT EXISTS championships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  year int NOT NULL,
  description text,
  registration_fee decimal(10,2),
  registration_opens timestamptz,
  registration_closes timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Championship registrations (shooter joins the yearly competition)
CREATE TABLE IF NOT EXISTS championship_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id uuid NOT NULL REFERENCES championships(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  discipline_id uuid NOT NULL REFERENCES disciplines(id),
  registration_status text DEFAULT 'pending'
    CHECK (registration_status IN ('pending', 'confirmed', 'cancelled')),
  payment_status text DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'partial', 'refunded')),
  amount_paid decimal(10,2),
  payment_reference text,
  registered_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (championship_id, user_id, discipline_id)
);

-- 3. Link events (competitions) to a championship
ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS championship_id uuid REFERENCES championships(id) ON DELETE SET NULL;

-- 4. RLS policies for championships (public read, admin write)
ALTER TABLE championships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Championships are publicly readable"
  ON championships FOR SELECT USING (true);

CREATE POLICY "Admins can manage championships"
  ON championships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- 5. RLS policies for championship_registrations
ALTER TABLE championship_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own championship registrations"
  ON championship_registrations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all championship registrations"
  ON championship_registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Authenticated users can insert their own championship registration"
  ON championship_registrations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage championship registrations"
  ON championship_registrations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );
