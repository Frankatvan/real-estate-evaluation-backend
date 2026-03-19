-- File Uploads Table
-- Records all file uploads to Supabase Storage

CREATE TABLE IF NOT EXISTS file_uploads (
    id SERIAL PRIMARY KEY,
    version_id INTEGER NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    upload_type VARCHAR(50) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_upload_type CHECK (upload_type IN ('sales_import', 'construction_import', 'units_import', 'tenants_import', 'plan_import'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_uploads_version_id ON file_uploads(version_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_upload_type ON file_uploads(upload_type);
CREATE INDEX IF NOT EXISTS idx_file_uploads_uploaded_at ON file_uploads(uploaded_at DESC);

-- Comment for documentation
COMMENT ON TABLE file_uploads IS 'Tracks all file uploads to Supabase Storage with metadata';
COMMENT ON COLUMN file_uploads.version_id IS 'Reference to the version this file belongs to';
COMMENT ON COLUMN file_uploads.file_path IS 'Path to the file in Supabase Storage';
COMMENT ON COLUMN file_uploads.file_name IS 'Original filename of the uploaded file';
COMMENT ON COLUMN file_uploads.file_size IS 'Size of the uploaded file in bytes';
COMMENT ON COLUMN file_uploads.upload_type IS 'Type of data uploaded (sales_import, construction_import, etc.)';
COMMENT ON COLUMN file_uploads.uploaded_at IS 'Timestamp when the file was uploaded';