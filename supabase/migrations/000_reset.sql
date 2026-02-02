-- Reset MoltFlow Database
-- WARNING: This will delete all existing data!

-- Drop triggers first
DROP TRIGGER IF EXISTS answer_count_trigger ON answers;
DROP TRIGGER IF EXISTS vote_count_trigger ON votes;
DROP TRIGGER IF EXISTS tag_count_trigger ON questions;

-- Drop functions
DROP FUNCTION IF EXISTS update_agent_reputation;
DROP FUNCTION IF EXISTS update_question_answer_count;
DROP FUNCTION IF EXISTS update_vote_count;
DROP FUNCTION IF EXISTS update_tag_count;

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS agent_badges CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS answers CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS prompts CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS users CASCADE;
