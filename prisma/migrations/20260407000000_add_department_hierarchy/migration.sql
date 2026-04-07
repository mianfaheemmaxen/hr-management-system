-- AlterTable: Add parentDepartmentId to Department for self-referential hierarchy
ALTER TABLE `Department` ADD COLUMN `parentDepartmentId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Department` ADD CONSTRAINT `Department_parentDepartmentId_fkey` FOREIGN KEY (`parentDepartmentId`) REFERENCES `Department`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
