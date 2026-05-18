-- Database schema for Trio - Hobby Discovery App

-- V3 durable dashboard state. Clerk user ids are text values (for example, user_...),
-- so this table is keyed by Clerk identity instead of Supabase auth.users UUIDs.
CREATE TABLE IF NOT EXISTS user_dashboard_states (
  clerk_user_id TEXT PRIMARY KEY,
  state JSONB NOT NULL CHECK (jsonb_typeof(state) = 'object'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_dashboard_states ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_dashboard_states TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_dashboard_states TO authenticated;
REVOKE ALL ON TABLE user_dashboard_states FROM anon;

-- Final-version AI observability and budget controls. This stores operational metadata only:
-- no prompts, no raw user answers, and no model output text.
CREATE TABLE IF NOT EXISTS ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  ip_fingerprint TEXT,
  feature TEXT NOT NULL CHECK (feature IN ('custom_hobby_plan', 'hobby_recommendations')),
  category TEXT NOT NULL CHECK (category IN ('physical', 'intellectual', 'creative')),
  model TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('ai', 'fallback')),
  status TEXT NOT NULL CHECK (status IN ('success', 'fallback', 'blocked', 'error', 'invalid_response')),
  estimated_input_tokens INTEGER NOT NULL CHECK (estimated_input_tokens >= 0),
  max_output_tokens INTEGER NOT NULL CHECK (max_output_tokens >= 0),
  latency_ms INTEGER NOT NULL CHECK (latency_ms >= 0),
  error_type TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON TABLE ai_usage_events TO service_role;
REVOKE ALL ON TABLE ai_usage_events FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_user_day
  ON ai_usage_events(clerk_user_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_ip_day
  ON ai_usage_events(ip_fingerprint, requested_at DESC)
  WHERE ip_fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_feature_status
  ON ai_usage_events(feature, status, requested_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_user_dashboard_states_updated_at ON user_dashboard_states;
CREATE TRIGGER set_user_dashboard_states_updated_at
  BEFORE UPDATE ON user_dashboard_states
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "Users can view their own dashboard state" ON user_dashboard_states;
CREATE POLICY "Users can view their own dashboard state" ON user_dashboard_states
  FOR SELECT USING (auth.jwt() ->> 'sub' = clerk_user_id);

DROP POLICY IF EXISTS "Users can insert their own dashboard state" ON user_dashboard_states;
CREATE POLICY "Users can insert their own dashboard state" ON user_dashboard_states
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);

DROP POLICY IF EXISTS "Users can update their own dashboard state" ON user_dashboard_states;
CREATE POLICY "Users can update their own dashboard state" ON user_dashboard_states
  FOR UPDATE USING (auth.jwt() ->> 'sub' = clerk_user_id)
  WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);

-- Table for storing discovery conversation responses
CREATE TABLE IF NOT EXISTS discovery_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  responses JSONB NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_discovery_responses_user_id ON discovery_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_discovery_responses_category ON discovery_responses(category);

-- Table for storing discovered/active hobbies
CREATE TABLE IF NOT EXISTS hobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('physical', 'intellectual', 'creative')),
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'dormant', 'completed')),
  discovered_from_response_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  last_completed_at TIMESTAMPTZ,
  streak_days INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (discovered_from_response_id) REFERENCES discovery_responses(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hobbies_user_id ON hobbies(user_id);
CREATE INDEX IF NOT EXISTS idx_hobbies_category ON hobbies(category);
CREATE INDEX IF NOT EXISTS idx_hobbies_status ON hobbies(status);

-- Table for storing generated starter plans
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hobby_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  schedule TEXT,
  total_sessions INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (hobby_id) REFERENCES hobbies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plans_hobby_id ON plans(hobby_id);

-- Table for individual daily tasks
CREATE TABLE IF NOT EXISTS plan_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL,
  day_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plan_tasks_plan_id ON plan_tasks(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_completed ON plan_tasks(completed);

-- Row Level Security (RLS) - enable for all tables
ALTER TABLE discovery_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE hobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_tasks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE discovery_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE hobbies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE plan_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE discovery_responses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE hobbies TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE plans TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE plan_tasks TO service_role;
REVOKE ALL ON TABLE discovery_responses, hobbies, plans, plan_tasks FROM anon;

-- Policies: Users can only see and mutate their own data.
DROP POLICY IF EXISTS "Users can view their own discovery responses" ON discovery_responses;
CREATE POLICY "Users can view their own discovery responses" ON discovery_responses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own discovery responses" ON discovery_responses;
CREATE POLICY "Users can insert their own discovery responses" ON discovery_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own discovery responses" ON discovery_responses;
CREATE POLICY "Users can update their own discovery responses" ON discovery_responses
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own discovery responses" ON discovery_responses;
CREATE POLICY "Users can delete their own discovery responses" ON discovery_responses
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own hobbies" ON hobbies;
CREATE POLICY "Users can view their own hobbies" ON hobbies
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own hobbies" ON hobbies;
CREATE POLICY "Users can insert their own hobbies" ON hobbies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own hobbies" ON hobbies;
CREATE POLICY "Users can update their own hobbies" ON hobbies
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own hobbies" ON hobbies;
CREATE POLICY "Users can delete their own hobbies" ON hobbies
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own plans" ON plans;
CREATE POLICY "Users can view their own plans" ON plans
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM hobbies WHERE hobbies.id = plans.hobby_id AND hobbies.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert plans for their own hobbies" ON plans;
CREATE POLICY "Users can insert plans for their own hobbies" ON plans
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM hobbies WHERE hobbies.id = plans.hobby_id AND hobbies.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update their own plans" ON plans;
CREATE POLICY "Users can update their own plans" ON plans
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM hobbies WHERE hobbies.id = plans.hobby_id AND hobbies.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM hobbies WHERE hobbies.id = plans.hobby_id AND hobbies.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete their own plans" ON plans;
CREATE POLICY "Users can delete their own plans" ON plans
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM hobbies WHERE hobbies.id = plans.hobby_id AND hobbies.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can view their own tasks" ON plan_tasks;
CREATE POLICY "Users can view their own tasks" ON plan_tasks
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM plans
    JOIN hobbies ON hobbies.id = plans.hobby_id
    WHERE plans.id = plan_tasks.plan_id AND hobbies.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert tasks for their own plans" ON plan_tasks;
CREATE POLICY "Users can insert tasks for their own plans" ON plan_tasks
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM plans
    JOIN hobbies ON hobbies.id = plans.hobby_id
    WHERE plans.id = plan_tasks.plan_id AND hobbies.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update their own tasks" ON plan_tasks;
CREATE POLICY "Users can update their own tasks" ON plan_tasks
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM plans
    JOIN hobbies ON hobbies.id = plans.hobby_id
    WHERE plans.id = plan_tasks.plan_id AND hobbies.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM plans
    JOIN hobbies ON hobbies.id = plans.hobby_id
    WHERE plans.id = plan_tasks.plan_id AND hobbies.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete their own tasks" ON plan_tasks;
CREATE POLICY "Users can delete their own tasks" ON plan_tasks
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM plans
    JOIN hobbies ON hobbies.id = plans.hobby_id
    WHERE plans.id = plan_tasks.plan_id AND hobbies.user_id = auth.uid()
  ));
