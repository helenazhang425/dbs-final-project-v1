import { createClientComponentClient } from '@supabase/ssr';
import { Database } from './database.types';

export const createClient = () => {
  return createClientComponentClient<Database>();
};

export const createServerClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const { createClient } = require('@supabase/supabase-js');
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};
