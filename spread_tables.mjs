import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fwmnsqynjofedyzftgdf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3bW5zcXluam9mZWR5emZ0Z2RmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzExMDI0NCwiZXhwIjoyMDk4Njg2MjQ0fQ.GM1HprVaX1sDARibLzvtBJIk1lFhRivX-HI6o1JBNKI'
);

async function main() {
  const { data, error } = await supabase.from('tables').select('*').order('number');
  if (error) {
    console.error("DB Error:", error);
    return;
  }

  for (let i = 0; i < data.length; i++) {
    const table = data[i];
    const num = parseInt(table.number, 10);
    if (!isNaN(num) && num >= 1 && num <= 8) {
      // 4-column layout stretched to edges
      const col = (num - 1) % 4; // 0, 1, 2, 3
      const row = Math.floor((num - 1) / 4); // 0 or 1

      const newX = 0.12 + (col * 0.20); // 0.16, 0.36, 0.56, 0.76 (shifted slightly left)
      const newY = row === 0 ? 0.25 : 0.75;

      await supabase.from('tables').update({ pos_x: newX, pos_y: newY }).eq('id', table.id);
    }
  }
  console.log("Database table positions stretched perfectly!");
}
main();
