-- AlterTable: Add waiverReason column to Fine table (was dropped in simplify_fine_status, re-added in schema but never migrated)
ALTER TABLE `Fine` ADD COLUMN `waiverReason` TEXT NULL;
