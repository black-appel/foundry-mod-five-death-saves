import {
  applyDeathSave,
  clampTrackerValue,
  MAX_FAILURES,
  MAX_SUCCESSES,
  MODULE_ID,
  systemFailureValue
} from "./rules.mjs";

const FLAG_FAILURES = "failures";
const FLAG_SUCCESSES = "successes";

function supportsFiveDeathSaves(actor) {
  return game.system.id === "dnd5e"
    && actor?.type === "character"
    && actor.system?.attributes?.death
    && actor.system?.attributes?.hp;
}

function getFlagOrFallback(actor, key, fallback, maximum) {
  const value = actor.getFlag(MODULE_ID, key);
  return value === undefined || value === null
    ? clampTrackerValue(fallback, maximum)
    : clampTrackerValue(value, maximum);
}

function getTracker(actor) {
  const death = actor.system.attributes.death;
  return {
    successes: getFlagOrFallback(actor, FLAG_SUCCESSES, death.success, MAX_SUCCESSES),
    failures: getFlagOrFallback(actor, FLAG_FAILURES, death.failure, MAX_FAILURES)
  };
}

function setUpdate(update, path, value) {
  foundry.utils.setProperty(update, path, value);
}

function writeTracker(update, { successes, failures }) {
  setUpdate(update, `flags.${MODULE_ID}.${FLAG_SUCCESSES}`, successes);
  setUpdate(update, `flags.${MODULE_ID}.${FLAG_FAILURES}`, failures);
}

function writeSystemTracker(update, { successes, failures }) {
  setUpdate(update, "system.attributes.death.success", Math.min(successes, MAX_SUCCESSES - 1));
  setUpdate(update, "system.attributes.death.failure", systemFailureValue(failures));
}

function localize(key, data = {}) {
  return game.i18n.format(`${MODULE_ID}.${key}`, data);
}

function createPips(type, maximum, filled) {
  const pips = document.createElement("div");
  pips.className = `pips fds-pips ${type}`;
  pips.setAttribute("role", "list");
  pips.setAttribute("aria-label", localize(`tracker.${type}`, { count: filled, maximum }));

  for (let number = 1; number <= maximum; number += 1) {
    const pip = document.createElement("span");
    pip.className = `pip ${type}${number <= filled ? " filled" : ""}`;
    pip.setAttribute("role", "listitem");
    pip.setAttribute("aria-label", localize(`tracker.${type}Pip`, { number, maximum }));
    pips.append(pip);
  }

  return pips;
}

function replaceDeathSaveLayout(app, element) {
  const actor = app.actor;
  if (!supportsFiveDeathSaves(actor)) return;

  const tray = element.matches?.(".death-tray") ? element : element.querySelector(".death-tray");
  const saves = tray?.querySelector(".death-saves");
  const rollButton = saves?.querySelector("button.death-save");
  if (!tray || !saves || !rollButton) return;

  const tracker = getTracker(actor);
  tray.classList.add("five-death-saves");
  saves.replaceChildren(
    createPips("successes", MAX_SUCCESSES, tracker.successes),
    rollButton,
    createPips("failures", MAX_FAILURES, tracker.failures)
  );

  const terminal = tracker.successes >= MAX_SUCCESSES || tracker.failures >= MAX_FAILURES;
  if (rollButton.dataset.action === "roll") {
    rollButton.disabled = terminal;
    rollButton.setAttribute("aria-disabled", String(terminal));
    if (terminal) rollButton.classList.remove("rollable");
  }
}

/**
 * D&D5e character sheets use Foundry's ApplicationV2 framework. Listening to
 * its base hook is more reliable than a system-specific render hook because
 * it is dispatched for every V2 application in the inheritance chain.
 */
function onRenderApplicationV2(app, element) {
  if (app.constructor?.name !== "CharacterActorSheet") return;
  replaceDeathSaveLayout(app, element);
}

function onActorPreUpdate(actor, changes) {
  if (!supportsFiveDeathSaves(actor)) return;

  const nextHitPoints = foundry.utils.getProperty(changes, "system.attributes.hp.value");
  if (!Number.isFinite(nextHitPoints)) return;

  const currentHitPoints = actor.system.attributes.hp.value;
  const tracker = getTracker(actor);

  // A character only gains the automatic failure when crossing from positive HP
  // to zero. Repeated updates while already down therefore cannot add more.
  if (currentHitPoints > 0 && nextHitPoints <= 0) {
    const nextTracker = {
      successes: 0,
      failures: Math.min(tracker.failures + 1, MAX_FAILURES)
    };
    writeTracker(changes, nextTracker);
    writeSystemTracker(changes, nextTracker);
    return;
  }

  // Successes are cleared when a character regains consciousness. Failures are
  // deliberately retained: this homebrew resets them only after a rest.
  if (currentHitPoints <= 0 && nextHitPoints > 0) {
    writeTracker(changes, { successes: 0, failures: tracker.failures });
  }
}

function onDeathSave(rolls, data) {
  const actor = data.subject;
  if (!supportsFiveDeathSaves(actor)) return;

  const roll = rolls[0];
  if (!roll) return;

  const tracker = getTracker(actor);
  const result = applyDeathSave({
    ...tracker,
    isSuccess: roll.total >= (roll.options.target ?? 10),
    isCritical: roll.isCritical,
    isFumble: roll.isFumble
  });

  writeTracker(data.updates, result);
  writeSystemTracker(data.updates, result);
  if (result.hitPoints !== null) setUpdate(data.updates, "system.attributes.hp.value", result.hitPoints);
  data.outcome = result.outcome;
}

function onPreRestCompleted(actor, result, config) {
  if (!supportsFiveDeathSaves(actor) || !["short", "long"].includes(config.type)) return;

  const tracker = getTracker(actor);
  if (tracker.failures === 0) return;

  const resetTracker = { successes: tracker.successes, failures: 0 };
  writeTracker(result.updateData, resetTracker);
  writeSystemTracker(result.updateData, resetTracker);
}

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing Five Death Saves`);
});

Hooks.once("ready", () => {
  if (game.system.id !== "dnd5e") {
    ui.notifications.warn(localize("notifications.requiresDnd5e"));
    return;
  }

  Hooks.on("preUpdateActor", onActorPreUpdate);
  Hooks.on("dnd5e.rollDeathSave", onDeathSave);
  Hooks.on("dnd5e.preRestCompleted", onPreRestCompleted);
  Hooks.on("renderApplicationV2", onRenderApplicationV2);
});
