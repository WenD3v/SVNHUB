import { describe, expect, it } from "vitest";

import { selectBackupsForRetention } from "./backup-retention";

describe("selectBackupsForRetention", () => {
  const backups = [
    { id: "a", createdAt: new Date("2026-06-01T00:00:00Z") },
    { id: "b", createdAt: new Date("2026-06-02T00:00:00Z") },
    { id: "c", createdAt: new Date("2026-06-03T00:00:00Z") },
    { id: "d", createdAt: new Date("2026-06-04T00:00:00Z") },
  ];

  it("keeps the newest N backups and returns older ones for deletion", () => {
    const toDelete = selectBackupsForRetention(backups, 2);
    expect(toDelete.map((entry) => entry.id)).toEqual(["a", "b"]);
  });

  it("returns nothing when retention covers all backups", () => {
    expect(selectBackupsForRetention(backups, 10)).toEqual([]);
  });

  it("returns all backups when retention count is below one", () => {
    expect(selectBackupsForRetention(backups, 0)).toEqual(backups);
  });
});
