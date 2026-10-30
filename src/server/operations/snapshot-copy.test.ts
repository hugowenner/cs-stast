import { describe, expect, it } from "vitest";
import { assertDevTarget, quoteIdentifier } from "./snapshot-copy";
describe("snapshot target guard", () => {
  it.each([
    "postgresql://cs2stats_dev:secret@localhost:5432/cs2_stats_dev_snapshot_20260920",
    "postgresql://cs2stats_dev:secret@127.0.0.1:5432/cs2_stats_test_disposable",
  ])("accepts exact local DEV identity", url => expect(() => assertDevTarget(url)).not.toThrow());
  it.each([
    "postgresql://postgres:secret@evil.test:5432/cs2_stats_dev",
    "postgresql://user:cs2stats_dev@localhost:5432/cs2_stats_dev",
    "postgresql://postgres:secret@localhost:5432/cs2stats",
    "postgresql://postgres:secret@localhost:5433/cs2_stats_dev",
    "postgresql://postgres:secret@localhost.evil.test:5432/cs2_stats_dev",
  ])("rejects misleading identity", url => expect(() => assertDevTarget(url)).toThrow());
  it("quotes identifiers", () => expect(quoteIdentifier('a"b')).toBe('"a""b"'));
});
