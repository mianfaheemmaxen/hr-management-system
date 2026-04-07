-- AlterTable
ALTER TABLE `Employee` ADD COLUMN `biometricId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Employee_biometricId_key` ON `Employee`(`biometricId`);

