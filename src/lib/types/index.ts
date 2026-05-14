export type HobbyCategory = 'physical' | 'intellectual' | 'creative';

export interface Hobby {
  id: string;
  user_id: string;
  category: HobbyCategory;
  name: string;
  status: 'active' | 'dormant' | 'completed';
  discovered_at: Date;
  started_at?: Date;
  last_completed_at?: Date;
  streak_days: number;
  total_sessions: number;
}

export interface Plan {
  id: string;
  hobby_id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  schedule: string;
  total_sessions: number;
  created_at: Date;
}

export interface PlanTask {
  id: string;
  plan_id: string;
  day_number: number;
  title: string;
  description?: string;
  completed: boolean;
  completed_at?: Date;
}

export interface DiscoveryResponse {
  hobby_name: string;
  category: HobbyCategory;
  reason: string;
  starter_plan: {
    duration: string;
    frequency: string;
    first_task: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: Date;
  onboarding_complete: boolean;
}
