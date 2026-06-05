-- Schéma de base de données PropManager MVP (Supabase PostgreSQL)

-- 1. Table des Propriétés (Biens)
CREATE TABLE properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  type TEXT NOT NULL, -- e.g., 'Studio', 'Appartement', 'Maison'
  surface NUMERIC,
  rooms INTEGER,
  rent_amount NUMERIC NOT NULL,
  charges_amount NUMERIC DEFAULT 0,
  deposit_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Vacant', -- 'Loué', 'Vacant', 'En travaux'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table des Locataires
CREATE TABLE tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  property_id UUID REFERENCES properties(id) NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birthdate DATE,
  entry_date DATE NOT NULL,
  exit_date DATE,
  rent_amount NUMERIC NOT NULL,
  deposit_paid BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table des Paiements (Loyers)
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  property_id UUID REFERENCES properties(id) NOT NULL,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  amount_expected NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  status TEXT DEFAULT 'En attente', -- 'Payé', 'Partiel', 'Impayé', 'En attente'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table des Documents
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  property_id UUID REFERENCES properties(id),
  tenant_id UUID REFERENCES tenants(id),
  category TEXT NOT NULL, -- 'Bail', 'Quittance', 'Facture', 'Autre'
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Table des Profils Utilisateurs (Settings comme la devise)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  currency TEXT DEFAULT 'XAF',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fonctions & Triggers de base
-- Créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, currency)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'XAF');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Activer Row Level Security (RLS)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Création des Policies (Un propriétaire ne voit que ses propres données)
CREATE POLICY "Users can view their own properties" ON properties FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own properties" ON properties FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own properties" ON properties FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own properties" ON properties FOR DELETE USING (auth.uid() = user_id);

-- (Répéter les policies pour tenants, payments, documents, profiles)
CREATE POLICY "Users can manage their own tenants" ON tenants FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own payments" ON payments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own documents" ON documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own profiles" ON profiles FOR ALL USING (auth.uid() = id);
