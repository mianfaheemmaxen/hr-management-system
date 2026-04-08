-- CreateTable: LeaveBalanceHistory
-- Tracks archived leave balances from previous years
CREATE TABLE `LeaveBalanceHistory` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `leaveType` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `totalDays` INTEGER NOT NULL,
    `usedDays` INTEGER NOT NULL,
    `remainingDays` INTEGER NOT NULL,
    `archivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LeaveBalanceHistory_employeeId_year_idx`(`employeeId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: EmployeeEvaluation
-- Tracks tests and interviews during employee probation
CREATE TABLE `EmployeeEvaluation` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `evaluationType` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `totalMarks` INTEGER NULL,
    `obtainedMarks` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `wasRetaken` BOOLEAN NOT NULL DEFAULT false,
    `evaluationDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EmployeeEvaluation_employeeId_idx`(`employeeId`),
    INDEX `EmployeeEvaluation_evaluationType_idx`(`evaluationType`),
    INDEX `EmployeeEvaluation_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: MonthlyDeductibleFine
-- Stores finalized monthly fine deductions per employee
CREATE TABLE `MonthlyDeductibleFine` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `actualAmount` DOUBLE NOT NULL,
    `deductibleAmount` DOUBLE NOT NULL,
    `finalDeductibleAmount` DOUBLE NOT NULL,
    `multiplier` INTEGER NOT NULL DEFAULT 2,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MonthlyDeductibleFine_employeeId_month_year_key`(`employeeId`, `month`, `year`),
    INDEX `MonthlyDeductibleFine_month_year_idx`(`month`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EmployeeEvaluation` ADD CONSTRAINT `EmployeeEvaluation_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MonthlyDeductibleFine` ADD CONSTRAINT `MonthlyDeductibleFine_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
