-- AlterTable
ALTER TABLE `SystemSettings` ADD COLUMN `complementaryLeaveQuota` INTEGER NOT NULL DEFAULT 5;
ALTER TABLE `SystemSettings` ADD COLUMN `unpaidLeaveQuota` INTEGER NOT NULL DEFAULT 0;

