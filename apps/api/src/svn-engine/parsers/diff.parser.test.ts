import { describe, expect, it } from "vitest";

import { parseUnifiedDiff } from "./diff.parser";

describe("parseUnifiedDiff", () => {
  it("parses svn unified diff output", () => {
    const sample = `Index: trunk/README.md
===================================================================
--- trunk/README.md\t(revision 1)
+++ trunk/README.md\t(revision 2)
@@ -0,0 +1 @@
+# Hello SVNHUB
`;

    const files = parseUnifiedDiff(sample);
    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe("/trunk/README.md");
    expect(files[0]?.diff).toContain("+# Hello SVNHUB");
  });
});
