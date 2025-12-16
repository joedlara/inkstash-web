-- Add graded item support to listings table

-- Add graded item columns
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS is_graded boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS professional_grader character varying(50),
ADD COLUMN IF NOT EXISTS grade character varying(20),
ADD COLUMN IF NOT EXISTS certification_number character varying(100),
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add indexes for graded items
CREATE INDEX IF NOT EXISTS idx_listings_is_graded ON public.listings(is_graded);
CREATE INDEX IF NOT EXISTS idx_listings_grader ON public.listings(professional_grader) WHERE professional_grader IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.listings.is_graded IS 'Whether the item is professionally graded';
COMMENT ON COLUMN public.listings.professional_grader IS 'Grading company (PSA, BGS, CGC, SGC, etc.)';
COMMENT ON COLUMN public.listings.grade IS 'Grade value (1-10 scale or company-specific)';
COMMENT ON COLUMN public.listings.certification_number IS 'Certification/serial number from grading company';
COMMENT ON COLUMN public.listings.metadata IS 'Additional item metadata including search query and detail filters';
