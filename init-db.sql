-- Initialize the database for the homeschooling exam system
-- This script is automatically run when the PostgreSQL container starts

-- Create the database if it doesn't exist
-- Note: In PostgreSQL Docker containers, the database is created automatically via POSTGRES_DB
-- This script serves as a placeholder for any additional initialization

-- Set timezone
SET timezone = 'UTC';

-- Ensure the database uses UTF-8 encoding
-- ALTER DATABASE homeschooling_exam_db SET ENCODING TO 'UTF8';