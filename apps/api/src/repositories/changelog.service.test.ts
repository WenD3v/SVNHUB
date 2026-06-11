import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { BranchesService } from "../branches/branches.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { SvnEngineService } from "../svn-engine/svn-engine.service";
import { ChangelogService } from "./changelog.service";

const REPO = { id: "repo-1", slug: "demo", svnPath: "/var/svn/demo" };

const TAGS = {
  refs: [
    {
      name: "v2.0",
      kind: "tag" as const,
      svnPath: "/tags/v2.0",
      createdRevision: 100,
      createdAuthor: "alice",
      createdDate: "2026-06-01T10:00:00.000Z",
      lastChangedRevision: 100,
      lastChangedAuthor: "alice",
      lastChangedDate: "2026-06-01T10:00:00.000Z",
    },
    {
      name: "v1.0",
      kind: "tag" as const,
      svnPath: "/tags/v1.0",
      createdRevision: 50,
      createdAuthor: "bob",
      createdDate: "2026-05-01T10:00:00.000Z",
      lastChangedRevision: 50,
      lastChangedAuthor: "bob",
      lastChangedDate: "2026-05-01T10:00:00.000Z",
    },
  ],
};

function revisionRow(revision: number, author: string) {
  return {
    revision,
    author,
    date: new Date("2026-06-01T10:00:00.000Z"),
    message: `message ${revision}`,
    changedPaths: [],
  };
}

function createService(options: {
  repository?: typeof REPO | null;
  tags?: typeof TAGS;
  headRevision?: number;
  revisionsByRange?: Record<string, ReturnType<typeof revisionRow>[]>;
}) {
  const revisionsByRange = options.revisionsByRange ?? {};

  const prisma = {
    repository: {
      findUnique: vi.fn().mockResolvedValue(
        options.repository === null ? null : (options.repository ?? REPO),
      ),
    },
    revisionIndex: {
      findMany: vi.fn().mockImplementation(({ where }: { where: { revision: { gt: number; lte: number } } }) => {
        const key = `${where.revision.gt}:${where.revision.lte}`;
        return Promise.resolve(revisionsByRange[key] ?? []);
      }),
    },
  } as unknown as PrismaService;

  const branchesService = {
    listTags: vi.fn().mockResolvedValue(options.tags ?? TAGS),
  } as unknown as BranchesService;

  const svnEngine = {
    info: vi.fn().mockResolvedValue({ revision: options.headRevision ?? 105 }),
  } as unknown as SvnEngineService;

  return {
    service: new ChangelogService(prisma, branchesService, svnEngine),
    prisma,
  };
}

describe("ChangelogService", () => {
  it("throws when repository is missing", async () => {
    const { service } = createService({ repository: null });
    await expect(service.getChangelog("missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("builds sections with unreleased and tag ranges", async () => {
    const { service } = createService({
      revisionsByRange: {
        "100:105": [revisionRow(105, "alice"), revisionRow(101, "bob")],
        "50:100": [revisionRow(100, "alice"), revisionRow(75, "carol")],
        "0:50": [revisionRow(50, "bob"), revisionRow(10, "dave")],
      },
    });

    const result = await service.getChangelog("demo", 50);

    expect(result.sections).toHaveLength(3);
    expect(result.sections[0]).toMatchObject({
      name: "Unreleased",
      kind: "unreleased",
      revisionFrom: 100,
      revisionTo: 105,
      previousTagName: "v2.0",
      entries: [expect.objectContaining({ revision: 105 }), expect.objectContaining({ revision: 101 })],
    });
    expect(result.sections[1]).toMatchObject({
      name: "v2.0",
      kind: "tag",
      revisionFrom: 50,
      revisionTo: 100,
      previousTagName: "v1.0",
    });
    expect(result.sections[2]).toMatchObject({
      name: "v1.0",
      kind: "tag",
      revisionFrom: 0,
      revisionTo: 50,
      previousTagName: null,
    });
  });

  it("omits unreleased section when head equals latest tag", async () => {
    const { service } = createService({
      headRevision: 100,
      revisionsByRange: {
        "50:100": [revisionRow(100, "alice")],
        "0:50": [revisionRow(50, "bob")],
      },
    });

    const result = await service.getChangelog("demo");

    expect(result.sections.map((section) => section.name)).toEqual(["v2.0", "v1.0"]);
  });
});
