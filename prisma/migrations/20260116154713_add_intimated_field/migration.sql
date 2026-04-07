-- AlterTable: Add intimated field to AttendanceRecord
ALTER TABLE `AttendanceRecord` ADD COLUMN `intimated` BOOLEAN NOT NULL DEFAULT false;

