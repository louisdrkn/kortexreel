-- Migration: Create Vector Search Function for Expert Knowledge
-- Description: Adds an RPC function to search across both documents and website pages using embeddings.

create or replace function match_project_knowledge (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  search_project_id uuid
)
returns table (
  content text,
  similarity float,
  source_type text,
  source_name text
)
language plpgsql
as $$
begin
  return query (
    -- Search in Documents
    select
      cdc.content,
      1 - (cdc.embedding <=> query_embedding) as similarity,
      'document' as source_type,
      cd.file_name as source_name
    from company_document_chunks cdc
    join company_documents cd on cd.id = cdc.document_id
    where cd.project_id = search_project_id
    and 1 - (cdc.embedding <=> query_embedding) > match_threshold

    union all

    -- Search in Website Pages
    select
      wp.content,
      1 - (wp.embedding <=> query_embedding) as similarity,
      'website' as source_type,
      wp.url as source_name
    from website_pages wp
    where wp.project_id = search_project_id
    and 1 - (wp.embedding <=> query_embedding) > match_threshold

    -- Order by similarity across both
    order by similarity desc
    limit match_count
  );
end;
$$;
