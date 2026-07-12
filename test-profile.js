const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://fwmnsqynjofedyzftgdf.supabase.co', 'sb_publishable_gdL9fSi4yGahwSFgF-3gqQ_SuA6V1M5');
async function test() {
  const { data, error } = await supabase.from('profiles').select('id, restaurant_id, role, must_change_password, consented_at').eq('id', 'ad6b41a9-10d0-4eb4-83d7-44970cab8228');
  console.log('Result:', data, error);
}
test();
