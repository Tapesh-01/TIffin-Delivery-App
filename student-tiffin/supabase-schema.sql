-- STUDENT TIFFIN - SUPABASE DATABASE SCHEMA
-- Copy this entire file and paste it into the "SQL Editor" of your Supabase project (https://supabase.com).
-- Click "Run" to set up your tables, relationships, and triggers!

-- 1. Create Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  plan TEXT DEFAULT 'none', -- 'basic', 'standard', 'premium', 'none'
  wallet_balance NUMERIC(10,2) DEFAULT 0.00,
  streak INTEGER DEFAULT 0,
  address_hostel TEXT,
  address_room TEXT,
  vacation_start DATE,
  vacation_end DATE,
  is_paused BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create Policies for Profiles
CREATE POLICY "Users can view their own profile." 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile." 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Trigger to automatically create a profile when a new user signs up via Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, name, wallet_balance, streak, plan)
  VALUES (
    new.id,
    new.phone,
    COALESCE(new.raw_user_meta_data->>'name', 'Student User'),
    100.00, -- Welcome Bonus ₹100!
    0,
    'none'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL,
  delivery_date DATE DEFAULT CURRENT_DATE NOT NULL,
  status TEXT DEFAULT 'cooking' NOT NULL, -- 'cooking', 'packed', 'out_for_delivery', 'delivered'
  driver_lat NUMERIC(10, 6) DEFAULT 28.6139 NOT NULL,
  driver_lng NUMERIC(10, 6) DEFAULT 77.2090 NOT NULL,
  driver_phone TEXT DEFAULT '+91 99887 76655' NOT NULL,
  driver_name TEXT DEFAULT 'Ramesh Kumar' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policies for Orders
CREATE POLICY "Users can view their own orders." 
  ON public.orders FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders." 
  ON public.orders FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view and update all orders."
  ON public.orders FOR ALL
  USING (true); -- Simulating unrestricted admin access


-- 3. Create Order Add-ons Table
CREATE TABLE IF NOT EXISTS public.order_addons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  addon_id TEXT NOT NULL, -- 'extra_roti', 'curd', 'gulab_jamun', 'salad'
  quantity INTEGER DEFAULT 1 NOT NULL,
  price_charged NUMERIC(10,2) NOT NULL
);

ALTER TABLE public.order_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order add-ons."
  ON public.order_addons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_addons.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own order add-ons."
  ON public.order_addons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_addons.order_id 
      AND orders.user_id = auth.uid()
    )
  );


-- 4. Create Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10,2) NOT NULL, -- Positive for recharge, Negative for orders/add-ons
  type TEXT NOT NULL, -- 'recharge', 'meal_debit', 'addon_debit', 'refund'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions."
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions."
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert transactions (refunds/debits)."
  ON public.transactions FOR ALL
  USING (true);


-- 5. Create Community Feed Table
CREATE TABLE IF NOT EXISTS public.community_feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name TEXT NOT NULL,
  hostel_name TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  likes_yum INTEGER DEFAULT 0 NOT NULL,
  likes_good INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.community_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view feed posts."
  ON public.community_feed FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert feed posts."
  ON public.community_feed FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- 6. Create Menu Polls Table
CREATE TABLE IF NOT EXISTS public.menu_polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  votes_a INTEGER DEFAULT 0 NOT NULL,
  votes_b INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.menu_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view polls."
  ON public.menu_polls FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote/update polls."
  ON public.menu_polls FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Seed Initial Poll Data
INSERT INTO public.menu_polls (question, option_a, option_b, votes_a, votes_b, is_active)
VALUES (
  'Saturday Special: What should we make?',
  'Chole Bhature 🍛',
  'Paneer Tikka + Butter Roti 🧀',
  24,
  18,
  true
) ON CONFLICT DO NOTHING;

-- 7. Create Weekly Menu Table
CREATE TABLE IF NOT EXISTS public.weekly_menu (
  id INTEGER PRIMARY KEY, -- 1 to 7 for Mon-Sun
  day_name TEXT NOT NULL,
  main_dish TEXT NOT NULL,
  side_dish TEXT NOT NULL,
  emoji TEXT NOT NULL,
  calories TEXT
);

ALTER TABLE public.weekly_menu ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view weekly menu"
  ON public.weekly_menu FOR SELECT USING (true);

CREATE POLICY "Only admins can edit weekly menu"
  ON public.weekly_menu FOR UPDATE
  USING ( (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true );

-- Seed Initial Weekly Menu
INSERT INTO public.weekly_menu (id, day_name, main_dish, side_dish, emoji, calories)
VALUES 
  (1, 'Monday', 'Dal + Sabji', 'Roti, Rice', '🍲', '~520 kcal'),
  (2, 'Tuesday', 'Rajma + Aloo', 'Roti, Rice', '🫘', '~580 kcal'),
  (3, 'Wednesday', 'Chole + Paneer Masala', 'Roti, Rice', '🍛', '~610 kcal'),
  (4, 'Thursday', 'Ghar-Made Masala', 'Roti, Rice', '🌶️', '~550 kcal'),
  (5, 'Friday', 'Palak + Packed Soups', 'Roti, Rice', '🥬', '~490 kcal'),
  (6, 'Saturday', 'Special Meal', 'Roti, Rice + Meetha', '⭐', '~650 kcal'),
  (7, 'Sunday', 'Holiday', 'No Service', '🛌', '0 kcal')
ON CONFLICT (id) DO NOTHING;

-- 8. Enable Realtime Publications
-- Run this to enable real-time WebSockets for orders!
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_menu;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_feed;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_addons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_polls;
