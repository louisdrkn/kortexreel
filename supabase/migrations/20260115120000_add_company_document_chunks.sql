-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create company_document_chunks table
CREATE TABLE IF NOT EXISTS public.company_document_chunks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES public.company_documents(id) ON DELETE CASCADE,
    content TEXT,
    embedding vector(768), -- Gemini text-embedding-004
    chunk_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for similarity search
CREATE INDEX IF NOT EXISTS company_document_chunks_embedding_idx ON public.company_document_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable RLS
ALTER TABLE public.company_document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own document chunks"
ON public.company_document_chunks
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.company_documents cd
        WHERE cd.id = document_id
        AND cd.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert own document chunks"
ON public.company_document_chunks
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.company_documents cd
        WHERE cd.id = document_id
        AND cd.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete own document chunks"
ON public.company_document_chunks
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.company_documents cd
        WHERE cd.id = document_id
        AND cd.user_id = auth.uid()
    )
);
