import { describe, expect, it } from "vitest";
import { reconcileIds } from "../src/lib/coverage";

describe("coverage reconciler", () => {
  it("finds missing, unmatched, and duplicate IDs without uploading data", () => {
    const result = reconcileIds(
      "REQ-1\nREQ-2\nreq-2\nREQ-3",
      "req-1;REQ-3;REQ-4;REQ-4",
    );
    expect(result).toContain("Coverage: 2/3 requirements (67%)");
    expect(result).toContain("MISSING TEST EVIDENCE (1)\nreq-2");
    expect(result).toContain("EVIDENCE WITHOUT REQUIREMENT (1)\nREQ-4");
    expect(result).toContain("DUPLICATE REQUIREMENT IDS (1)\nreq-2");
    expect(result).toContain("DUPLICATE EVIDENCE IDS (1)\nREQ-4");
  });
});
