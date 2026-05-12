import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

function readLocalEnv() {
  const envPath = join(process.cwd(), '.env.local');
  const env = {};

  if (!existsSync(envPath)) {
    return env;
  }

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    env[trimmedLine.slice(0, separatorIndex)] = trimmedLine.slice(separatorIndex + 1);
  }

  return env;
}

function requireEnv(env, key) {
  const value = env[key] ?? process.env[key];

  if (!value) {
    throw new Error(`Missing ${key}`);
  }

  return value;
}

function createSupabaseClient(url, key) {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function main() {
  const env = readLocalEnv();
  const supabaseUrl = requireEnv(env, 'NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv(env, 'SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = requireEnv(env, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const serviceClient = createSupabaseClient(supabaseUrl, serviceRoleKey);
  const anonClient = createSupabaseClient(supabaseUrl, anonKey);
  const probeUserId = `codex_v3_probe_${Date.now()}`;
  const probeState = {
    slots: [],
    completionHistory: {},
    completionLog: {},
    recoveryNotes: {},
    recoveryHistory: {},
  };

  const serviceRead = await serviceClient
    .from('user_dashboard_states')
    .select('clerk_user_id')
    .limit(1);

  if (serviceRead.error) {
    throw new Error(`Service-role select failed: ${serviceRead.error.message}`);
  }

  const serviceWrite = await serviceClient
    .from('user_dashboard_states')
    .upsert(
      {
        clerk_user_id: probeUserId,
        state: probeState,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'clerk_user_id' }
    )
    .select('clerk_user_id')
    .single();

  if (serviceWrite.error || serviceWrite.data?.clerk_user_id !== probeUserId) {
    throw new Error(`Service-role upsert failed: ${serviceWrite.error?.message ?? 'unexpected response'}`);
  }

  const anonRead = await anonClient
    .from('user_dashboard_states')
    .select('clerk_user_id')
    .eq('clerk_user_id', probeUserId);

  if (anonRead.error) {
    console.log(`- anonymous client cannot select dashboard state: ${anonRead.error.message}`);
  } else if (anonRead.data.length !== 0) {
    throw new Error('Anonymous client could read the V3 dashboard probe row.');
  } else {
    console.log('- anonymous client cannot read the probe row');
  }

  const anonWrite = await anonClient
    .from('user_dashboard_states')
    .insert({
      clerk_user_id: `${probeUserId}_anon`,
      state: probeState,
    });

  if (!anonWrite.error) {
    throw new Error('Anonymous client could insert a V3 dashboard row.');
  }

  const cleanup = await serviceClient
    .from('user_dashboard_states')
    .delete()
    .eq('clerk_user_id', probeUserId);

  if (cleanup.error) {
    throw new Error(`Probe cleanup failed: ${cleanup.error.message}`);
  }

  console.log('V3 Supabase verification passed.');
  console.log('- service-role select/upsert/delete works');
  console.log('- anonymous client cannot insert dashboard state');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
