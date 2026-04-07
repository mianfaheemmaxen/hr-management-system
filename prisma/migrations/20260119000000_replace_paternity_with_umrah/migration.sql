-- Migration: Replace Paternity Leave with Umrah Leave
-- This migration removes paternityLeaveQuota and adds umrahLeaveQuota

-- Step 1: Check if paternityLeaveQuota exists and drop it
-- Note: This will fail silently if the column doesn't exist
SET @dbname = DATABASE();
SET @tablename = "SystemSettings";
SET @columnname = "paternityLeaveQuota";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "ALTER TABLE SystemSettings DROP COLUMN paternityLeaveQuota;",
  "SELECT 1;"
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

-- Step 2: Add umrahLeaveQuota if it doesn't exist
SET @columnname = "umrahLeaveQuota";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) = 0,
  "ALTER TABLE SystemSettings ADD COLUMN umrahLeaveQuota INTEGER NOT NULL DEFAULT 15;",
  "SELECT 1;"
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

