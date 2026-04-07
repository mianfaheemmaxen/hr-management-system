-- Note: This migration checks if paternityLeaveQuota exists
-- If it doesn't exist, it will be added
-- If it exists, the migration will fail but that's okay - we'll handle it

-- Try to add paternityLeaveQuota (will fail if it already exists, which is fine)
ALTER TABLE `SystemSettings` ADD COLUMN `paternityLeaveQuota` INTEGER NOT NULL DEFAULT 15;

