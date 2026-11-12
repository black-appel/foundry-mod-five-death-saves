import assert from "node:assert/strict";
import test from "node:test";

import { applyDeathSave, systemFailureValue } from "../scripts/rules.mjs";

test("the third success stabilizes a character", () => {
  const result = applyDeathSave({ successes: 2, failures: 2, isSuccess: true });
  assert.deepEqual(result, { successes: 3, failures: 2, hitPoints: null, outcome: "stable" });
});

test("the third and fourth failure do not kill a character", () => {
  assert.equal(applyDeathSave({ successes: 0, failures: 2, isSuccess: false }).outcome, null);
  assert.equal(applyDeathSave({ successes: 0, failures: 3, isSuccess: false }).outcome, null);
});

test("the fifth failure kills a character", () => {
  const result = applyDeathSave({ successes: 1, failures: 4, isSuccess: false });
  assert.equal(result.failures, 5);
  assert.equal(result.outcome, "death");
  assert.equal(systemFailureValue(result.failures), 3);
});

test("a natural one counts as two failures", () => {
  const result = applyDeathSave({ successes: 0, failures: 3, isSuccess: false, isFumble: true });
  assert.equal(result.failures, 5);
  assert.equal(result.outcome, "death");
});

test("a natural twenty restores one hit point but retains homebrew failures", () => {
  const result = applyDeathSave({ successes: 1, failures: 3, isSuccess: true, isCritical: true });
  assert.deepEqual(result, { successes: 0, failures: 3, hitPoints: 1, outcome: "revive" });
});
