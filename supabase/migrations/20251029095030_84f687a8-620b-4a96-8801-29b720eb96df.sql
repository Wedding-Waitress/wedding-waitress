-- Add formatting settings columns to running_sheets table
ALTER TABLE running_sheets 
ADD COLUMN all_font text DEFAULT 'Inter',
ADD COLUMN all_text_size text DEFAULT 'medium',
ADD COLUMN all_bold boolean DEFAULT false,
ADD COLUMN all_italic boolean DEFAULT false,
ADD COLUMN all_text_color text DEFAULT '#000000',
ADD COLUMN header_font text DEFAULT 'Inter',
ADD COLUMN header_size text DEFAULT 'large',
ADD COLUMN header_bold boolean DEFAULT true,
ADD COLUMN header_italic boolean DEFAULT false,
ADD COLUMN header_color text DEFAULT '#6D28D9';

-- Add check constraints for size fields
ALTER TABLE running_sheets
ADD CONSTRAINT all_text_size_check CHECK (all_text_size IN ('small', 'medium', 'large')),
ADD CONSTRAINT header_size_check CHECK (header_size IN ('small', 'medium', 'large'));

-- Add comments for documentation
COMMENT ON COLUMN running_sheets.all_font IS 'Font family for all table text (not headers)';
COMMENT ON COLUMN running_sheets.all_text_size IS 'Text size for all table text: small=12pt, medium=14pt, large=16pt';
COMMENT ON COLUMN running_sheets.all_bold IS 'Apply bold styling to all table text';
COMMENT ON COLUMN running_sheets.all_italic IS 'Apply italic styling to all table text';
COMMENT ON COLUMN running_sheets.all_text_color IS 'Text color for all table text in hex format';
COMMENT ON COLUMN running_sheets.header_font IS 'Font family for header row';
COMMENT ON COLUMN running_sheets.header_size IS 'Text size for header row: small=12pt, medium=14pt, large=16pt';
COMMENT ON COLUMN running_sheets.header_bold IS 'Apply bold styling to header row';
COMMENT ON COLUMN running_sheets.header_italic IS 'Apply italic styling to header row';
COMMENT ON COLUMN running_sheets.header_color IS 'Text color for header row in hex format';