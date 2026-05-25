import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env manually
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'] || 'https://wjejbsiuqyjwzepbzbwt.supabase.co';
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'] || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('app_users').select('*').limit(1);
  if (error) {
    console.error('Error fetching user:', error);
  } else {
    console.log('User keys:', data[0] ? Object.keys(data[0]) : 'No users found');
    console.log('First user:', data[0]);
  }
}

test();
