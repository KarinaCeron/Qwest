-- Add cover_letter column to job_applications table
ALTER TABLE public.job_applications 
ADD COLUMN cover_letter TEXT;