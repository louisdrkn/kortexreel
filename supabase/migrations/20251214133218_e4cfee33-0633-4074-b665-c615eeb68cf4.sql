-- Create storage bucket for project files
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false);

-- Create table for company documents
CREATE TABLE public.company_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  extracted_content TEXT,
  extraction_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own documents
CREATE POLICY "Users can view own documents"
ON public.company_documents
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own documents"
ON public.company_documents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
ON public.company_documents
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
ON public.company_documents
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_company_documents_updated_at
BEFORE UPDATE ON public.company_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for project-files bucket
CREATE POLICY "Users can upload own files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);