BEGIN;

-- CreateTable
CREATE TABLE "project_issues" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_dependencies" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "dependsOnId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_reviews" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "summary" TEXT NOT NULL,
    "evidence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "feedback" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_check_ins" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "completed" TEXT NOT NULL,
    "nextStep" TEXT NOT NULL,
    "needsHelp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_notes" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department_requests" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "fromDepartment" TEXT NOT NULL,
    "toDepartment" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'media',
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "department_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_issues_projectId_status_idx" ON "project_issues"("projectId", "status");

-- CreateIndex
CREATE INDEX "task_dependencies_projectId_idx" ON "task_dependencies"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "task_dependencies_taskId_dependsOnId_key" ON "task_dependencies"("taskId", "dependsOnId");

-- CreateIndex
CREATE INDEX "task_reviews_projectId_status_idx" ON "task_reviews"("projectId", "status");

-- CreateIndex
CREATE INDEX "task_reviews_taskId_createdAt_idx" ON "task_reviews"("taskId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "project_check_ins_projectId_authorId_day_key" ON "project_check_ins"("projectId", "authorId", "day");

-- CreateIndex
CREATE INDEX "project_notes_projectId_kind_idx" ON "project_notes"("projectId", "kind");

-- CreateIndex
CREATE INDEX "department_requests_projectId_status_idx" ON "department_requests"("projectId", "status");

-- CreateIndex
CREATE INDEX "department_requests_toDepartment_status_idx" ON "department_requests"("toDepartment", "status");

-- AddForeignKey
ALTER TABLE "project_issues" ADD CONSTRAINT "project_issues_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_issues" ADD CONSTRAINT "project_issues_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_issues" ADD CONSTRAINT "project_issues_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_reviews" ADD CONSTRAINT "task_reviews_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_reviews" ADD CONSTRAINT "task_reviews_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_reviews" ADD CONSTRAINT "task_reviews_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_reviews" ADD CONSTRAINT "task_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_check_ins" ADD CONSTRAINT "project_check_ins_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_check_ins" ADD CONSTRAINT "project_check_ins_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_notes" ADD CONSTRAINT "project_notes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_notes" ADD CONSTRAINT "project_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_requests" ADD CONSTRAINT "department_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_requests" ADD CONSTRAINT "department_requests_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Enforce a single pending review, including concurrent submissions.
CREATE UNIQUE INDEX "task_reviews_one_pending_per_task" ON "task_reviews"("taskId") WHERE "status" = 'pending';

COMMIT;
