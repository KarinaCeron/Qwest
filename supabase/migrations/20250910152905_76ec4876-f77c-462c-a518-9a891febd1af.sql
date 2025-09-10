-- Add job_content column to store the full job posting content
ALTER TABLE public.job_applications 
ADD COLUMN job_content TEXT;