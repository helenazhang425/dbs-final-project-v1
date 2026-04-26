-- Database schema for Trio - Hobby Discovery App

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
CREATE INDEX idx_discovery_responses_user_id ON discovery_responses(user_id);
CREATE INDEX idx_discovery_responses_category ON discovery_responses(category);

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
CREATE INDEX idx_hobbies_user_id ON hobbies(user_id);
CREATE INDEX idx_hobbies_category ON hobbies(category);
CREATE INDEX idx_hobbies_status ON hobbies(status);

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

CREATE INDEX idx_plans_hobby_id ON plans(hobby_id);

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

CREATE INDEX idx_plan_tasks_plan_id ON plan_tasks(plan_id);
CREATE INDEX idx_plan_tasks_completed ON plan_tasks(completed);

-- Row Level Security (RLS) - enable for all tables
ALTER TABLE discovery_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE hobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_tasks ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see their own data
CREATE POLICY "Users can view their own discovery responses" ON discovery_responses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own discovery responses" ON discovery_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own hobbies" ON hobbies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own hobbies" ON hobbies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own hobbies" ON hobbies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own plans" ON plans
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM hobbies WHERE hobbies.id = plans.hobby_id AND hobbies.user_id = auth.uid()
  ));

CREATE POLICY "Users can view their own tasks" ON plan_tasks
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM plans
    JOIN hobbies ON hobbies.id = plans.hobby_id
    WHERE plans.id = plan_tasks.plan_id AND hobbies.user_id = auth.uid()
  ));
