export const MODULE_ID = "five-death-saves";
export const MAX_SUCCESSES = 3;
export const MAX_FAILURES = 5;

/** Clamp a tracker value to its valid integer range. */
export function clampTrackerValue(value, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(Math.max(Math.trunc(number), 0), maximum);
}

/**
 * The D&D5e system stores a maximum of three failures. We retain at most two
 * until the fifth homebrew failure actually kills the character.
 */
export function systemFailureValue(failures) {
  return clampTrackerValue(failures, MAX_FAILURES) >= MAX_FAILURES
    ? MAX_SUCCESSES
    : Math.min(clampTrackerValue(failures, MAX_FAILURES), MAX_SUCCESSES - 1);
}

/**
 * Work out the homebrew result of a death save without relying on Foundry APIs.
 * This makes the rule boundaries easy to test independently.
 */
export function applyDeathSave({ successes = 0, failures = 0, isSuccess, isCritical = false, isFumble = false }) {
  successes = clampTrackerValue(successes, MAX_SUCCESSES);
  failures = clampTrackerValue(failures, MAX_FAILURES);

  if (isSuccess && isCritical) {
    return {
      successes: 0,
      failures,
      hitPoints: 1,
      outcome: "revive"
    };
  }

  if (isSuccess) {
    const nextSuccesses = Math.min(successes + 1, MAX_SUCCESSES);
    return {
      successes: nextSuccesses,
      failures,
      hitPoints: null,
      outcome: nextSuccesses === MAX_SUCCESSES ? "stable" : null
    };
  }

  const nextFailures = Math.min(failures + (isFumble ? 2 : 1), MAX_FAILURES);
  return {
    successes,
    failures: nextFailures,
    hitPoints: null,
    outcome: nextFailures === MAX_FAILURES ? "death" : null
  };
}
