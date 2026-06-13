-- AuraHealth Database Schema

-- 1. PROFILES Table (Extends Auth.Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'patient', -- 'patient', 'doctor'
  phone_number TEXT,
  gender TEXT,
  age INTEGER,
  blood_group TEXT,
  weight_kg DECIMAL,
  height_cm DECIMAL,
  medical_history TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Visibility
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Doctors Visibility
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view doctor professional info" ON public.doctors;
CREATE POLICY "Anyone can view doctor professional info" 
  ON public.doctors FOR SELECT 
  USING (true);


-- 2. HEALTH METRICS Table
CREATE TABLE IF NOT EXISTS public.health_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  metric_type TEXT NOT NULL, -- 'heart_rate', 'blood_pressure', 'steps', 'sleep', etc.
  value JSONB NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own metrics" ON public.health_metrics;
DROP POLICY IF EXISTS "Users can insert their own metrics" ON public.health_metrics;
DROP POLICY IF EXISTS "Users can update their own metrics" ON public.health_metrics;
DROP POLICY IF EXISTS "Users can manage their own metrics" ON public.health_metrics;

CREATE POLICY "Users can manage their own metrics" 
  ON public.health_metrics FOR ALL USING (auth.uid() = user_id);


-- 3. EMERGENCY CONTACTS Table
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  relationship TEXT,
  phone_number TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own emergency contacts" ON public.emergency_contacts;

CREATE POLICY "Users can manage their own emergency contacts" 
  ON public.emergency_contacts FOR ALL USING (auth.uid() = user_id);

-- 4. APPOINTMENTS Table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_name TEXT NOT NULL,
  specialization TEXT,
  appointment_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users and Doctors can view shared appointments" ON public.appointments;
CREATE POLICY "Users and Doctors can view shared appointments" 
  ON public.appointments FOR SELECT USING (auth.uid() = user_id OR auth.uid() = doctor_id);


DROP POLICY IF EXISTS "Users and Doctors can update shared appointments" ON public.appointments;
CREATE POLICY "Users and Doctors can update shared appointments" 
  ON public.appointments FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Patients can book appointments" ON public.appointments;
CREATE POLICY "Patients can book appointments" 
  ON public.appointments FOR INSERT WITH CHECK (auth.uid() = user_id);



-- 5. FUNCTION & TRIGGER: Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_name TEXT;
  v_exp_years INTEGER;
BEGIN
  -- 1. Extract and Clean Metadata
  v_role := LOWER(COALESCE(new.raw_user_meta_data->>'role', 'patient'));
  v_name := COALESCE(new.raw_user_meta_data->>'full_name', 'User');
  
  -- SAFE CAST for Experience: Check if it's a valid number, otherwise default to 0
  IF (new.raw_user_meta_data->>'experience_years') ~ '^[0-9]+$' THEN
    v_exp_years := (new.raw_user_meta_data->>'experience_years')::INTEGER;
  ELSE
    v_exp_years := 0;
  END IF;

  -- 2. Create Profile Record
  INSERT INTO public.profiles (
    id, 
    full_name, 
    email, 
    avatar_url, 
    role, 
    phone_number, 
    gender
  )
  VALUES (
    new.id, 
    v_name,
    new.email, 
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''), 
    v_role,
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'gender'
  ) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;


  -- 3. If user is a doctor, create professional registry entry
  IF v_role = 'doctor' THEN
    INSERT INTO public.doctors (
      id, 
      name, 
      specialty, 
      license_number, 
      hospital_name, 
      hospital_address, 
      experience_years,
      status
    )
    VALUES (
      new.id, 
      v_name, 
      COALESCE(new.raw_user_meta_data->>'specialty', 'General Physician'), 
      COALESCE(new.raw_user_meta_data->>'license_number', 'PENDING'),
      COALESCE(new.raw_user_meta_data->>'hospital_name', 'Medical Center'),
      COALESCE(new.raw_user_meta_data->>'hospital_address', 'Check Settings'),
      v_exp_years,
      'online'
    ) ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      specialty = EXCLUDED.specialty,
      experience_years = EXCLUDED.experience_years;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Last resort: Just return NEW so the user can at least log in
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;




-- Drop trigger if exists before creating
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. INSIGHTS Table
CREATE TABLE IF NOT EXISTS public.insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'warning', 'success', 'info'
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own insights" ON public.insights;

CREATE POLICY "Users can manage their own insights" 
  ON public.insights FOR ALL USING (auth.uid() = user_id);

-- 7. DAILY SCORES Table
CREATE TABLE IF NOT EXISTS public.daily_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL,
  label TEXT, -- 'Poor', 'Fair', 'Good', 'Excellent'
  recorded_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, recorded_at)
);


ALTER TABLE public.daily_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own daily scores" ON public.daily_scores;

CREATE POLICY "Users can manage their own daily scores" 
  ON public.daily_scores FOR ALL USING (auth.uid() = user_id);

-- 8. MEDICATIONS Table
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  time TIME NOT NULL, -- e.g., '08:00:00'
  frequency TEXT DEFAULT 'daily',
  stock_count INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own medications" ON public.medications;

CREATE POLICY "Users can manage their own medications" 
  ON public.medications FOR ALL USING (auth.uid() = user_id);

-- 9. MEDICATION LOGS Table (Tracking intake)
CREATE TABLE IF NOT EXISTS public.medication_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  medication_id UUID REFERENCES public.medications(id) ON DELETE CASCADE NOT NULL,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'taken' -- 'taken', 'skipped'
);

ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own medication logs" ON public.medication_logs;

CREATE POLICY "Users can manage their own medication logs" 
  ON public.medication_logs FOR ALL USING (auth.uid() = user_id);

-- 10. CHAT HISTORY Table
CREATE TABLE IF NOT EXISTS public.chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL, -- 'user', 'bot'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()

);

ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own chat history" ON public.chat_history;
CREATE POLICY "Users can manage their own chat history" 
  ON public.chat_history FOR ALL USING (auth.uid() = user_id);

-- 11. AUTOMATIC SCORE CALCULATION
CREATE OR REPLACE FUNCTION public.update_daily_score()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_score INTEGER := 0;
  v_label TEXT;
  v_water DECIMAL := 0;
  v_steps INTEGER := 0;
  v_sleep DECIMAL := 0;
  v_calories INTEGER := 0;
BEGIN
  v_user_id := NEW.user_id;

  -- Get SUM of metrics for today
  SELECT COALESCE((SELECT SUM((value->>'current')::DECIMAL) FROM public.health_metrics WHERE user_id = v_user_id AND metric_type = 'water' AND recorded_at::DATE = CURRENT_DATE), 0) INTO v_water;
  SELECT COALESCE((SELECT SUM((value->>'current')::INTEGER) FROM public.health_metrics WHERE user_id = v_user_id AND metric_type = 'steps' AND recorded_at::DATE = CURRENT_DATE), 0) INTO v_steps;
  SELECT COALESCE((SELECT SUM((value->>'current')::DECIMAL) FROM public.health_metrics WHERE user_id = v_user_id AND metric_type = 'sleep' AND recorded_at::DATE = CURRENT_DATE), 0) INTO v_sleep;
  SELECT COALESCE((SELECT SUM((value->>'current')::INTEGER) FROM public.health_metrics WHERE user_id = v_user_id AND metric_type = 'calories' AND recorded_at::DATE = CURRENT_DATE), 0) INTO v_calories;


  -- Basic Score Calculation Logic
  v_score := (
    LEAST((v_water / 3.0) * 25, 25) + -- Water (Goal 3L)
    LEAST((v_steps / 10000.0) * 25, 25) + -- Steps (Goal 10k)
    LEAST((v_sleep / 8.0) * 25, 25) + -- Sleep (Goal 8hrs)
    LEAST((v_calories / 2000.0) * 25, 25) -- Calories (Goal 2k)
  );

  IF v_score >= 90 THEN v_label := 'Excellent';
  ELSIF v_score >= 75 THEN v_label := 'Very Good';
  ELSIF v_score >= 50 THEN v_label := 'Good';
  ELSIF v_score >= 25 THEN v_label := 'Fair';
  ELSE v_label := 'Poor';
  END IF;

  -- Upsert into daily_scores
  INSERT INTO public.daily_scores (user_id, score, label, recorded_at)
  VALUES (v_user_id, v_score, v_label, CURRENT_DATE)
  ON CONFLICT (user_id, recorded_at) 
  DO UPDATE SET score = EXCLUDED.score, label = EXCLUDED.label;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_metric_logged ON public.health_metrics;
CREATE TRIGGER on_metric_logged
  AFTER INSERT OR UPDATE ON public.health_metrics
  FOR EACH ROW EXECUTE PROCEDURE public.update_daily_score();
-- 11. DOCTORS Table
-- Clear old fake data before redefining
TRUNCATE TABLE public.doctors CASCADE;

CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  license_number TEXT,
  hospital_name TEXT,
  hospital_address TEXT,
  experience_years INTEGER,
  rating DECIMAL DEFAULT 4.5,
  reviews INTEGER DEFAULT 0,
  image_url TEXT,
  status TEXT DEFAULT 'online', -- 'online', 'offline'
  created_at TIMESTAMPTZ DEFAULT NOW()
);


ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Doctors are viewable by everyone" ON public.doctors;
CREATE POLICY "Doctors are viewable by everyone" 
  ON public.doctors FOR SELECT USING (true);

-- Note: doctor_id already references public.profiles(id) ON DELETE CASCADE in the table creation above.

-- 12. ACCOUNT DELETION FUNCTION
-- This function allows a user to delete their own account and all associated data
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void AS $$
BEGIN
  -- Since we have ON DELETE CASCADE on our tables, 
  -- deleting the profile will cascade to health_metrics, appointments, etc.
  -- To delete the actual Auth user, we need to delete from auth.users (requires high privs)
  -- The easiest way is to delete the profile which is linked via CASCADE in many setups.
  -- However, to be thorough and because we are using Supabase:
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. INQUIRIES Table (Patient messages to doctors)
CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_name TEXT,
  subject TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'new', -- 'new', 'read', 'urgent'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Add Policy
DROP POLICY IF EXISTS "Users can view their own inquiries" ON public.inquiries;
CREATE POLICY "Users can view their own inquiries" 
  ON public.inquiries FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = doctor_id);


-- 13. REVIEWS Table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_name TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Patients can insert their own reviews" ON public.reviews;
CREATE POLICY "Patients can insert their own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- 14. MESSAGES Table (Chat)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON public.messages;
CREATE POLICY "Users can view messages they sent or received" 
  ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;
CREATE POLICY "Users can insert their own messages" 
  ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

