/*
  Warnings:

  - You are about to drop the column `approvedAt` on the `fine` table. All the data in the column will be lost.
  - You are about to drop the column `approvedBy` on the `fine` table. All the data in the column will be lost.
  - You are about to drop the column `waiveReason` on the `fine` table. All the data in the column will be lost.
  - You are about to drop the column `waivedAt` on the `fine` table. All the data in the column will be lost.
  - You are about to drop the column `waivedBy` on the `fine` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `fine` DROP COLUMN `approvedAt`,
    DROP COLUMN `approvedBy`,
    DROP COLUMN `waiveReason`,
    DROP COLUMN `waivedAt`,
    DROP COLUMN `waivedBy`,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'unpaid';
