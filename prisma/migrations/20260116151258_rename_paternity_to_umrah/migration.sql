-- AlterTable: Rename paternityLeaveQuota to umrahLeaveQuota in SystemSettings
ALTER TABLE `SystemSettings` CHANGE COLUMN `paternityLeaveQuota` `umrahLeaveQuota` INTEGER NOT NULL DEFAULT 15;

