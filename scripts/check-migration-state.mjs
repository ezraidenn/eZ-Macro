// Diagnóstico de estado de migraciones vs schema (solo lectura)
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

try {
  const cols = await pool.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('users', 'meal_entries', 'food_entries', 'weight_entries', 'profiles')
    ORDER BY table_name, ordinal_position
  `);
  console.log("=== COLUMNAS ===");
  for (const r of cols.rows) console.log(`${r.table_name}.${r.column_name} (${r.data_type})`);

  const idx = await pool.query(`
    SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename
  `);
  console.log("\n=== INDICES ===");
  for (const r of idx.rows) console.log(`${r.tablename}: ${r.indexname}`);

  const mig = await pool.query(`
    SELECT migration_name, finished_at, applied_steps_count
    FROM _prisma_migrations ORDER BY finished_at
  `).catch((e) => ({ rows: [], error: e.message }));
  console.log("\n=== _prisma_migrations ===");
  if (mig.error) console.log("(sin tabla _prisma_migrations:", mig.error, ")");
  else for (const r of mig.rows) console.log(`${r.migration_name} — finished: ${r.finished_at} — steps: ${r.applied_steps_count}`);
} finally {
  await pool.end();
}
