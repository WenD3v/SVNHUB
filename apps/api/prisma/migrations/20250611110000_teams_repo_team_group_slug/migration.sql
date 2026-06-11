-- CreateTable
CREATE TABLE "RepoTeam" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "role" "RepoRole" NOT NULL DEFAULT 'READER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepoTeam_pkey" PRIMARY KEY ("id")
);

-- Add slug column (nullable during backfill)
ALTER TABLE "Group" ADD COLUMN "slug" TEXT;

-- Generate slugs from existing group names
WITH base AS (
    SELECT
        id,
        regexp_replace(
            regexp_replace(lower(trim("name")), '[^a-z0-9]+', '-', 'g'),
            '(^-+|-+$)',
            '',
            'g'
        ) AS base_slug
    FROM "Group"
),
numbered AS (
    SELECT
        id,
        CASE
            WHEN base_slug = '' THEN 'team'
            ELSE base_slug
        END AS base_slug,
        ROW_NUMBER() OVER (
            PARTITION BY CASE WHEN base_slug = '' THEN 'team' ELSE base_slug END
            ORDER BY id
        ) AS rn
    FROM base
)
UPDATE "Group" g
SET "slug" = CASE
    WHEN n.rn = 1 THEN n.base_slug
    ELSE n.base_slug || '-' || n.rn
END
FROM numbered n
WHERE g.id = n.id;

-- Enforce slug constraints
ALTER TABLE "Group" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Group_slug_key" ON "Group"("slug");

-- CreateIndex
CREATE INDEX "RepoTeam_groupId_idx" ON "RepoTeam"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "RepoTeam_repositoryId_groupId_key" ON "RepoTeam"("repositoryId", "groupId");

-- AddForeignKey
ALTER TABLE "RepoTeam" ADD CONSTRAINT "RepoTeam_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepoTeam" ADD CONSTRAINT "RepoTeam_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
