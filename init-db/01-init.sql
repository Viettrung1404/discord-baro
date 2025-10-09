-- Initialize Discord database
-- This script runs when PostgreSQL container first starts

\echo 'Creating Discord database extensions...'

-- Create extensions for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create extensions for better text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\echo 'Database initialization completed!'
