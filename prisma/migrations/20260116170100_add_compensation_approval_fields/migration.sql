-- AlterTable
ALTER TABLE `Fine` ADD COLUMN `compensationApprovedBy` VARCHAR(191) NULL,
    ADD COLUMN `compensationApprovedAt` DATETIME(3) NULL,
    ADD COLUMN `compensationRejectionReason` TEXT NULL;

