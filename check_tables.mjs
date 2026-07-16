import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fwmnsqynjofedyzftgdf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3bW5zcXluam9mZWR5emZ0Z2RmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzExMDI0NCwiZXhwIjoyMDk4Njg2MjQ0fQ.GM1HprVaX1sDARibLzvtBJIk1lFhRivX-HI6o1JBNKI'
);

async function main() {
  const { data, error } = await supabase.from('tables').select('number, pos_x').order('number');
  if (error) {
    console.error("DB Error:", error);
    return;
  }
  console.log("Current DB values:", data);
}
main();
