-- Migración de reconciliación + soporte de sync incremental.
--
-- Contexto: las columnas de reset de contraseña se aplicaron a la BD viva con
-- `prisma db push` sin generar migración, dejando el historial desincronizado
-- (una BD nueva creada con `migrate deploy` rompía forgot/reset-password).
-- Todo el SQL es idempotente (IF NOT EXISTS) para que funcione igual en la BD
-- viva y en BDs nuevas.

-- users: columnas de reset de contraseña (auditoría D1)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordResetExpiry" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "users_passwordResetToken_key" ON "users"("passwordResetToken");

-- meal_entries: timestamps para sync incremental y borrado lógico (auditoría D4/A3)
ALTER TABLE "meal_entries" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "meal_entries" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- food_entries: índice para la foreign key (auditoría D2)
CREATE INDEX IF NOT EXISTS "food_entries_mealId_idx" ON "food_entries"("mealId");
