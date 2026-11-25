/*
  Warnings:

  - You are about to drop the column `course_id` on the `classrooms` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `classrooms` table. All the data in the column will be lost.
  - You are about to drop the `courses` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[token_hash]` on the table `classroom_invitations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `token_hash` to the `classroom_invitations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `owner_id` to the `classrooms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `classrooms` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('scheduled', 'live', 'ended');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('active', 'suspended', 'removed');

-- CreateEnum
CREATE TYPE "ClassroomMemberRole" AS ENUM ('student', 'host', 'manager');

-- CreateEnum
CREATE TYPE "SessionEndReason" AS ENUM ('host_ended', 'all_left', 'system');

-- DropForeignKey
ALTER TABLE "classrooms" DROP CONSTRAINT "classrooms_course_id_fkey";

-- DropIndex
DROP INDEX "classrooms_course_id_idx";

-- AlterTable
ALTER TABLE "classroom_invitations" ADD COLUMN     "token_hash" VARCHAR(64) NOT NULL;

-- AlterTable
ALTER TABLE "classrooms" DROP COLUMN "course_id",
DROP COLUMN "name",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "owner_id" UUID NOT NULL,
ADD COLUMN     "scheduleInfo" VARCHAR(255),
ADD COLUMN     "title" VARCHAR(100) NOT NULL;

-- DropTable
DROP TABLE "courses";

-- CreateTable
CREATE TABLE "live_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "classroom_id" UUID NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'scheduled',
    "scheduled_start" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6),
    "ended_at" TIMESTAMPTZ(6),
    "started_by_id" UUID,
    "ended_by_id" UUID,
    "end_reason" "SessionEndReason",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "live_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_session_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ(6),

    CONSTRAINT "live_session_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "classroom_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "role" "ClassroomMemberRole" NOT NULL DEFAULT 'student',
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'active',
    "enrolled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "live_sessions_classroom_id_status_idx" ON "live_sessions"("classroom_id", "status");

-- CreateIndex
CREATE INDEX "live_sessions_classroom_id_started_at_idx" ON "live_sessions"("classroom_id", "started_at");

-- CreateIndex
CREATE INDEX "live_session_participants_session_id_left_at_idx" ON "live_session_participants"("session_id", "left_at");

-- CreateIndex
CREATE INDEX "enrollments_student_id_status_idx" ON "enrollments"("student_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_classroom_id_student_id_key" ON "enrollments"("classroom_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "classroom_invitations_token_hash_key" ON "classroom_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "classrooms_owner_id_idx" ON "classrooms"("owner_id");

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_started_by_id_fkey" FOREIGN KEY ("started_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_ended_by_id_fkey" FOREIGN KEY ("ended_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_session_participants" ADD CONSTRAINT "live_session_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_session_participants" ADD CONSTRAINT "live_session_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------

-- 0. MUST run BEFORE the CREATE TABLE statements (top of the very first
--    migration), otherwise the Citext columns fail.
CREATE EXTENSION IF NOT EXISTS citext;

-- 1. At most ONE live session per classroom at any time.
CREATE UNIQUE INDEX live_sessions_one_live_per_classroom
  ON live_sessions (classroom_id)
  WHERE status = 'live';

-- 2. At most ONE open participation row per user per session
--    (prevents duplicates from page refresh / second tab).
CREATE UNIQUE INDEX live_session_participants_one_open
  ON live_session_participants (session_id, user_id)
  WHERE left_at IS NULL;

-- 3. A live session must have started_at; an ended session must have
--    ended_at and end_reason.
ALTER TABLE live_sessions
  ADD CONSTRAINT live_sessions_live_has_started
  CHECK (status <> 'live' OR started_at IS NOT NULL);

ALTER TABLE live_sessions
  ADD CONSTRAINT live_sessions_ended_has_fields
  CHECK (status <> 'ended' OR (ended_at IS NOT NULL AND end_reason IS NOT NULL));

-- 4. Time sanity.
ALTER TABLE live_sessions
  ADD CONSTRAINT live_sessions_end_after_start
  CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at);

ALTER TABLE live_session_participants
  ADD CONSTRAINT live_session_participants_left_after_joined
  CHECK (left_at IS NULL OR left_at >= joined_at);

-- ---------------------------------------------------------------------------
-- If you are changing an EXISTING database instead of starting fresh,
-- rename instead of drop/create so data is kept (edit the generated migration):
--   ALTER TABLE users RENAME COLUMN password TO password_hash;
-- and give role_at_join a default/backfill before making it NOT NULL, e.g.:
--   UPDATE live_session_participants SET role_at_join = 'student';
-- ---------------------------------------------------------------------------
