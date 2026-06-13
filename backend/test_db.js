const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase.rpc('delete_user_account'); // let's see if we can call it or get metadata
  console.log('rpc delete_user_account response:', data, error);

  // Let's query pg_proc to find any custom functions
  const { data: functions, error: funcError } = await supabase
    .from('pg_proc')
    .select('proname')
    .limit(10);
  console.log('Functions:', functions, funcError);
}

test();
