/*
  Warnings:

  - You are about to drop the column `scheduleInfo` on the `classrooms` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `enrollments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_at_join` to the `live_session_participants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password_hash` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('teacher', 'host', 'manager', 'student');

-- DropForeignKey
ALTER TABLE "classroom_invitations" DROP CONSTRAINT "classroom_invitations_classroom_id_fkey";

-- DropForeignKey
ALTER TABLE "live_session_participants" DROP CONSTRAINT "live_session_participants_session_id_fkey";

-- DropForeignKey
ALTER TABLE "live_sessions" DROP CONSTRAINT "live_sessions_classroom_id_fkey";

-- DropIndex
DROP INDEX "users_role_idx";

-- AlterTable
ALTER TABLE "classrooms" DROP COLUMN "scheduleInfo",
ADD COLUMN     "schedule_info" VARCHAR(255);

-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "removed_at" TIMESTAMPTZ(6),
ADD COLUMN     "role_changed_at" TIMESTAMPTZ(6),
ADD COLUMN     "role_changed_by_id" UUID,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL;

-- AlterTable
ALTER TABLE "live_session_participants" ADD COLUMN     "last_seen_at" TIMESTAMPTZ(6),
ADD COLUMN     "role_at_join" "ParticipantRole" NOT NULL;

-- AlterTable
ALTER TABLE "live_sessions" ADD COLUMN     "title" VARCHAR(150);

-- AlterTable
ALTER TABLE "users" DROP COLUMN "password",
ADD COLUMN     "password_hash" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "enrollments_classroom_id_status_idx" ON "enrollments"("classroom_id", "status");

-- CreateIndex
CREATE INDEX "live_session_participants_user_id_joined_at_idx" ON "live_session_participants"("user_id", "joined_at");

-- CreateIndex
CREATE INDEX "live_sessions_status_updated_at_idx" ON "live_sessions"("status", "updated_at");

-- AddForeignKey
ALTER TABLE "classroom_invitations" ADD CONSTRAINT "classroom_invitations_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_role_changed_by_id_fkey" FOREIGN KEY ("role_changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_session_participants" ADD CONSTRAINT "live_session_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "live_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
