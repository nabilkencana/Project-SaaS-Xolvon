-- Migration: 0009_course_resources_course_id.sql
-- Fix 502 on POST /lessons/:id/resources: add course_id column to course_resources table.
-- Ensures course_resources references courses(id) directly for cascading lookups and integrity.

ALTER TABLE course_resources ADD COLUMN course_id TEXT REFERENCES courses(id);
