-- AlterTable
ALTER TABLE `Employee` ADD COLUMN     `nationality` TEXT,
ADD COLUMN     `probationCompleteDate` TIMESTAMP(3),
ADD COLUMN     `emergencyContactName` TEXT,
ADD COLUMN     `emergencyContactNumber` TEXT,
ADD COLUMN     `emergencyContactRelation` TEXT,
ADD COLUMN     `cnicNumber` TEXT,
ADD COLUMN     `passportNumber` TEXT;

