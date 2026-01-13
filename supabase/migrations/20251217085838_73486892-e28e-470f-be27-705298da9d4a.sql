-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create knowledge_base table (parent documents)
CREATE TABLE public.knowledge_base (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    summary TEXT,
    doc_type TEXT NOT NULL DEFAULT 'pitch_deck' CHECK (doc_type IN ('pitch_deck', 'price_list', 'case_study', 'proposal', 'other')),
    extracted_data JSONB DEFAULT '{}'::jsonb,
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create knowledge_chunks table (vectorized segments)
CREATE TABLE public.knowledge_chunks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    knowledge_id UUID NOT NULL REFERENCES public.knowledge_base(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for vector similarity search
CREATE INDEX knowledge_chunks_embedding_idx ON public.knowledge_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create index for faster lookups
CREATE INDEX knowledge_base_org_id_idx ON public.knowledge_base(org_id);
CREATE INDEX knowledge_chunks_knowledge_id_idx ON public.knowledge_chunks(knowledge_id);

-- Enable RLS on both tables
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge_base
CREATE POLICY "knowledge_base_select_own_org" ON public.knowledge_base
    FOR SELECT USING (
        org_id = get_user_org_id(auth.uid()) OR is_platform_admin(auth.uid())
    );

CREATE POLICY "knowledge_base_insert_own_org" ON public.knowledge_base
    FOR INSERT WITH CHECK (
        org_id = get_user_org_id(auth.uid()) OR is_platform_admin(auth.uid())
    );

CREATE POLICY "knowledge_base_update_own_org" ON public.knowledge_base
    FOR UPDATE USING (
        org_id = get_user_org_id(auth.uid()) OR is_platform_admin(auth.uid())
    );

CREATE POLICY "knowledge_base_delete_own_org" ON public.knowledge_base
    FOR DELETE USING (
        has_org_role(auth.uid(), org_id, 'admin') OR is_platform_admin(auth.uid())
    );

-- RLS Policies for knowledge_chunks (via parent knowledge_base)
CREATE POLICY "knowledge_chunks_select_via_parent" ON public.knowledge_chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.knowledge_base kb 
            WHERE kb.id = knowledge_id 
            AND (kb.org_id = get_user_org_id(auth.uid()) OR is_platform_admin(auth.uid()))
        )
    );

CREATE POLICY "knowledge_chunks_insert_via_parent" ON public.knowledge_chunks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.knowledge_base kb 
            WHERE kb.id = knowledge_id 
            AND (kb.org_id = get_user_org_id(auth.uid()) OR is_platform_admin(auth.uid()))
        )
    );

CREATE POLICY "knowledge_chunks_delete_via_parent" ON public.knowledge_chunks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.knowledge_base kb 
            WHERE kb.id = knowledge_id 
            AND (has_org_role(auth.uid(), kb.org_id, 'admin') OR is_platform_admin(auth.uid()))
        )
    );

-- Create updated_at trigger for knowledge_base
CREATE TRIGGER update_knowledge_base_updated_at
    BEFORE UPDATE ON public.knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for knowledge documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'knowledge-vault', 
    'knowledge-vault', 
    false,
    52428800, -- 50MB limit
    ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
);

-- Storage policies for knowledge-vault bucket
CREATE POLICY "knowledge_vault_select_own_org" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'knowledge-vault' 
        AND auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
    );

CREATE POLICY "knowledge_vault_insert_own_org" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'knowledge-vault'
        AND auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
    );

CREATE POLICY "knowledge_vault_delete_own_org" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'knowledge-vault'
        AND auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
    );

-- RPC Function for semantic similarity search
CREATE OR REPLACE FUNCTION public.match_documents(
    p_query_embedding vector(1536),
    p_org_id UUID,
    p_match_threshold FLOAT DEFAULT 0.7,
    p_match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT,
    file_name TEXT,
    doc_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Security: Verify caller belongs to this org
    IF NOT (
        get_user_org_id(auth.uid()) = p_org_id 
        OR is_platform_admin(auth.uid())
    ) THEN
        RAISE EXCEPTION 'Access denied to organization documents';
    END IF;

    RETURN QUERY
    SELECT 
        kc.id,
        kc.content,
        kc.metadata,
        1 - (kc.embedding <=> p_query_embedding) AS similarity,
        kb.file_name,
        kb.doc_type
    FROM public.knowledge_chunks kc
    JOIN public.knowledge_base kb ON kb.id = kc.knowledge_id
    WHERE kb.org_id = p_org_id
        AND kb.processing_status = 'completed'
        AND 1 - (kc.embedding <=> p_query_embedding) > p_match_threshold
    ORDER BY kc.embedding <=> p_query_embedding
    LIMIT p_match_count;
END;
$$;

-- Add brand_identity column to organizations if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'brand_identity'
    ) THEN
        ALTER TABLE public.organizations ADD COLUMN brand_identity JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;