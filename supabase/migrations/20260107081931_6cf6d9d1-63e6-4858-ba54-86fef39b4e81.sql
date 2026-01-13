-- Add onboarding_completed flag to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON public.profiles(id, onboarding_completed);