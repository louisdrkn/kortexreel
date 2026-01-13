-- Update project-files bucket to explicitly allow needed MIME types
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ],
  file_size_limit = 52428800
WHERE id = 'project-files';

-- Also update knowledge-vault to include DOCX and TXT
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown'
]
WHERE id = 'knowledge-vault';