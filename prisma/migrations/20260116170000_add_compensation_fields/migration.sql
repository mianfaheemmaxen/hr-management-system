-- AlterTable
ALTER TABLE `Fine` ADD COLUMN `compensationRequested` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `compensationReason` TEXT NULL,
    ADD COLUMN `compensationRequestedAt` DATETIME(3) NULL,
    ADD COLUMN `compensationStatus` VARCHAR(191) NULL;

