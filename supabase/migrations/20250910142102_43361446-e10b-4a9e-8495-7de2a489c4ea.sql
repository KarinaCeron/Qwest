-- Update the trigger function to handle all profile fields from signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    display_name, 
    first_name, 
    last_name,
    phone,
    location,
    linkedin_url,
    portfolio_url,
    bio
  )
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email),
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'location',
    NEW.raw_user_meta_data ->> 'linkedin_url',
    NEW.raw_user_meta_data ->> 'portfolio_url',
    NEW.raw_user_meta_data ->> 'bio'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;