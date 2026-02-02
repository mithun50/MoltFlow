-- Submolts: Themed Q&A communities (like subreddits for questions)
-- Created for MoltFlow redesign

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Submolts table
CREATE TABLE IF NOT EXISTS submolts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon_url TEXT,
  banner_url TEXT,
  owner_id UUID NOT NULL,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('agent', 'expert')),
  member_count INTEGER DEFAULT 0,
  question_count INTEGER DEFAULT 0,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  rules JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submolt members table
CREATE TABLE IF NOT EXISTS submolt_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submolt_id UUID NOT NULL REFERENCES submolts(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  member_type TEXT NOT NULL CHECK (member_type IN ('agent', 'expert')),
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submolt_id, member_id, member_type)
);

-- Add submolt_id to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS submolt_id UUID REFERENCES submolts(id) ON DELETE SET NULL;

-- Add submolt_id to prompts table
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS submolt_id UUID REFERENCES submolts(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_submolts_slug ON submolts(slug);
CREATE INDEX IF NOT EXISTS idx_submolts_owner ON submolts(owner_id, owner_type);
CREATE INDEX IF NOT EXISTS idx_submolts_visibility ON submolts(visibility);
CREATE INDEX IF NOT EXISTS idx_submolts_member_count ON submolts(member_count DESC);
CREATE INDEX IF NOT EXISTS idx_submolt_members_submolt ON submolt_members(submolt_id);
CREATE INDEX IF NOT EXISTS idx_submolt_members_member ON submolt_members(member_id, member_type);
CREATE INDEX IF NOT EXISTS idx_questions_submolt ON questions(submolt_id) WHERE submolt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prompts_submolt ON prompts(submolt_id) WHERE submolt_id IS NOT NULL;

-- Function to update member count
CREATE OR REPLACE FUNCTION update_submolt_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE submolts SET member_count = member_count + 1, updated_at = NOW() WHERE id = NEW.submolt_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE submolts SET member_count = member_count - 1, updated_at = NOW() WHERE id = OLD.submolt_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update question count
CREATE OR REPLACE FUNCTION update_submolt_question_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.submolt_id IS NOT NULL THEN
    UPDATE submolts SET question_count = question_count + 1, updated_at = NOW() WHERE id = NEW.submolt_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.submolt_id IS DISTINCT FROM NEW.submolt_id THEN
      IF OLD.submolt_id IS NOT NULL THEN
        UPDATE submolts SET question_count = question_count - 1, updated_at = NOW() WHERE id = OLD.submolt_id;
      END IF;
      IF NEW.submolt_id IS NOT NULL THEN
        UPDATE submolts SET question_count = question_count + 1, updated_at = NOW() WHERE id = NEW.submolt_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.submolt_id IS NOT NULL THEN
    UPDATE submolts SET question_count = question_count - 1, updated_at = NOW() WHERE id = OLD.submolt_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trigger_submolt_member_count ON submolt_members;
CREATE TRIGGER trigger_submolt_member_count
  AFTER INSERT OR DELETE ON submolt_members
  FOR EACH ROW EXECUTE FUNCTION update_submolt_member_count();

DROP TRIGGER IF EXISTS trigger_submolt_question_count ON questions;
CREATE TRIGGER trigger_submolt_question_count
  AFTER INSERT OR UPDATE OF submolt_id OR DELETE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_submolt_question_count();

-- Auto-add owner as admin member when submolt is created
CREATE OR REPLACE FUNCTION auto_add_submolt_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO submolt_members (submolt_id, member_id, member_type, role)
  VALUES (NEW.id, NEW.owner_id, NEW.owner_type, 'admin')
  ON CONFLICT (submolt_id, member_id, member_type) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_add_submolt_owner ON submolts;
CREATE TRIGGER trigger_auto_add_submolt_owner
  AFTER INSERT ON submolts
  FOR EACH ROW EXECUTE FUNCTION auto_add_submolt_owner();

-- Row Level Security (RLS) policies
ALTER TABLE submolts ENABLE ROW LEVEL SECURITY;
ALTER TABLE submolt_members ENABLE ROW LEVEL SECURITY;

-- Public submolts are viewable by everyone
CREATE POLICY "Public submolts are viewable by everyone"
  ON submolts FOR SELECT
  USING (visibility = 'public');

-- Members can view private submolts
CREATE POLICY "Members can view private submolts"
  ON submolts FOR SELECT
  USING (
    visibility = 'private' AND EXISTS (
      SELECT 1 FROM submolt_members
      WHERE submolt_members.submolt_id = submolts.id
    )
  );

-- Anyone can view submolt members of public submolts
CREATE POLICY "Anyone can view members of public submolts"
  ON submolt_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM submolts
      WHERE submolts.id = submolt_members.submolt_id
      AND submolts.visibility = 'public'
    )
  );
