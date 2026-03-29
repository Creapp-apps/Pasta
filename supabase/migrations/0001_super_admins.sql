CREATE TABLE super_admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS básico para seguridad
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can read all" ON super_admins FOR SELECT USING (id = auth.uid());

-- Trigger para registrar a creapp.ar@gmail.com como Super Admin automáticamente si se registra en el futuro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  IF NEW.email = 'creapp.ar@gmail.com' THEN
    INSERT INTO public.super_admins (id, email)
    VALUES (NEW.id, NEW.email);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Inserción directa en caso de que ya hayas creado la cuenta de creapp en Supabase Auth
INSERT INTO public.super_admins (id, email)
SELECT id, email FROM auth.users WHERE email = 'creapp.ar@gmail.com'
ON CONFLICT DO NOTHING;
