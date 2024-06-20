import { ECMA_262_6_1_7_ARRAY_INDEX } from "./resolution.js";
import { strictEqual } from "node:assert";
import { describe, it } from "node:test";

describe("ECMA_262_6_1_7_ARRAY_INDEX", () => {
  it("should reject NaN", () => {
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(NaN), false);
  });

  it("should reject Infinity values", () => {
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(-Infinity), false);
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(+Infinity), false);
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(Infinity), false);
  });

  it("should reject float numbers", () => {
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(0.1), false);
  });

  it("should reject negative numbers", () => {
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(-1), false);
  })

  it("should reject integers that are not inside the array indices range", () => {
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(-1), false);
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(0.1), false);
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(2 ** 32), false);
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(-0), false);
  })

  it("should accept integers that are in the array indices range", () => {
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(2 ** 32 - 2), true);
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(0), true);
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(+0), true);
  });
});
