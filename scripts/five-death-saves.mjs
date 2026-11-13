import {
  applyDeathSave,
  autoDownFailureEnabled,
  clampTrackerValue,
  MAX_FAILURES,
  MAX_SUCCESSES,
  MODULE_ID,
  systemFailureValue
} from "./rules.mjs";

const FLAG_FAILURES = "failures";
const FLAG_SUCCESSES = "successes";
const FLAG_AUTO_DOWN_FAILURE = "autoDownFailure";
const trayOpenStates = new WeakMap();

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

function getAutoDownFailure(actor) {
  const path = `flags.${MODULE_ID}.${FLAG_AUTO_DOWN_FAILURE}`;
  const override = foundry.utils.getProperty(actor.overrides ?? {}, path);
  return autoDownFailureEnabled({
    stored: actor.getFlag(MODULE_ID, FLAG_AUTO_DOWN_FAILURE),
    override
  });
}

function writeAutoDownFailure(update, enabled) {
  setUpdate(update, `flags.${MODULE_ID}.${FLAG_AUTO_DOWN_FAILURE}`, enabled);
}

function localize(key, data = {}) {
  return game.i18n.format(`${MODULE_ID}.${key}`, data);
}

function canManageTracker() {
  return game.user.isGM;
}

function createPips(type, maximum, filled, editable) {
  const pips = document.createElement("div");
  pips.className = `pips fds-pips ${type}`;
  pips.setAttribute("role", "list");
  pips.setAttribute("aria-label", localize(`tracker.${type}`, { count: filled, maximum }));

  for (let number = 1; number <= maximum; number += 1) {
    const pip = document.createElement(editable ? "button" : "span");
    pip.className = `pip ${type}${number <= filled ? " filled" : ""}`;
    pip.setAttribute("role", "listitem");
    if (editable) {
      const value = number === filled ? number - 1 : number;
      pip.type = "button";
      pip.classList.add("fds-editable-pip");
      pip.dataset.fdsTracker = type;
      pip.dataset.fdsValue = String(value);
      pip.setAttribute("aria-label", localize(`tracker.set${type[0].toUpperCase()}${type.slice(1)}`, { value }));
      pip.title = localize(`tracker.set${type[0].toUpperCase()}${type.slice(1)}`, { value });
    } else {
      pip.setAttribute("aria-label", localize(`tracker.${type}Pip`, { number, maximum }));
    }
    pips.append(pip);
  }

  return pips;
}

function prepareConfigurationButton(button) {
  delete button.dataset.action;
  delete button.dataset.config;
  button.dataset.fdsAction = "configure";
  button.setAttribute("aria-label", localize("configuration.button"));
  button.title = localize("configuration.button");
  return button;
}

function createConfigurationButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "fds-config config-button unbutton";
  button.innerHTML = '<i class="fas fa-cog" inert></i>';
  return prepareConfigurationButton(button);
}

async function updateTracker(actor, tracker) {
  const update = {};
  writeTracker(update, tracker);
  writeSystemTracker(update, tracker);
  await actor.update(update);
}

async function showConfiguration(actor) {
  const tracker = getTracker(actor);
  const automaticFailure = getAutoDownFailure(actor);
  const result = await foundry.applications.api.DialogV2.prompt({
    rejectClose: false,
    window: { title: localize("configuration.title"), icon: "fa-solid fa-skull" },
    position: { width: 360 },
    content: `
      <fieldset class="fds-configuration">
        <div class="form-group">
          <label>${localize("configuration.successes")}</label>
          <input type="number" name="successes" min="0" max="${MAX_SUCCESSES}" step="1" value="${tracker.successes}">
        </div>
        <div class="form-group">
          <label>${localize("configuration.failures")}</label>
          <input type="number" name="failures" min="0" max="${MAX_FAILURES}" step="1" value="${tracker.failures}">
        </div>
        <div class="form-group">
          <label>${localize("configuration.autoDownFailure")}</label>
          <input type="checkbox" name="autoDownFailure" ${automaticFailure ? "checked" : ""}>
          <p class="hint">${localize("configuration.autoDownFailureHint")}</p>
        </div>
      </fieldset>`,
    ok: {
      label: localize("configuration.save"),
      callback: (_event, button) => ({
        successes: button.form.elements.successes.value,
        failures: button.form.elements.failures.value,
        autoDownFailure: button.form.elements.autoDownFailure.checked
      })
    }
  });
  if (!result) return;

  const nextTracker = {
    successes: clampTrackerValue(result.successes, MAX_SUCCESSES),
    failures: clampTrackerValue(result.failures, MAX_FAILURES)
  };
  const update = {};
  writeTracker(update, nextTracker);
  writeSystemTracker(update, nextTracker);
  writeAutoDownFailure(update, result.autoDownFailure);
  await actor.update(update);
}

function bindManualTrackerControls(saves, actor) {
  if (!canManageTracker()) return;

  saves.addEventListener("click", async event => {
    const pip = event.target.closest("button[data-fds-tracker]");
    if (pip) {
      event.preventDefault();
      event.stopPropagation();
      const tracker = getTracker(actor);
      const type = pip.dataset.fdsTracker;
      const maximum = type === "successes" ? MAX_SUCCESSES : MAX_FAILURES;
      tracker[type] = clampTrackerValue(pip.dataset.fdsValue, maximum);
      await updateTracker(actor, tracker);
      return;
    }

    if (event.target.closest("button[data-fds-action=configure]")) {
      event.preventDefault();
      event.stopPropagation();
      await showConfiguration(actor);
    }
  });
}

function synchronizePips(pips, type, filled, maximum) {
  if (!pips) return;

  pips.setAttribute("aria-label", localize(`tracker.${type}`, { count: filled, maximum }));
  for (const [index, pip] of pips.querySelectorAll(".pip").entries()) {
    const number = index + 1;
    pip.classList.toggle("filled", number <= filled);

    if (pip.matches("button[data-fds-tracker]")) {
      const value = number === filled ? number - 1 : number;
      pip.dataset.fdsValue = String(value);
      pip.setAttribute("aria-label", localize(`tracker.set${type[0].toUpperCase()}${type.slice(1)}`, { value }));
      pip.title = localize(`tracker.set${type[0].toUpperCase()}${type.slice(1)}`, { value });
    }
  }
}

function synchronizeTrackerDisplay(actor) {
  const app = actor.sheet;
  const element = app?.element;
  if (app?.constructor?.name !== "CharacterActorSheet" || !app.rendered || !element) return;

  const tray = element.querySelector(".death-tray.five-death-saves");
  const saves = tray?.querySelector(".death-saves");
  if (!tray || !saves) return;

  const tracker = getTracker(actor);
  synchronizePips(saves.querySelector(".fds-pips.successes"), "successes", tracker.successes, MAX_SUCCESSES);
  synchronizePips(saves.querySelector(".fds-pips.failures"), "failures", tracker.failures, MAX_FAILURES);

  const rollButton = saves.querySelector("button.death-save[data-action=roll]");
  if (!rollButton) return;

  const terminal = tracker.successes >= MAX_SUCCESSES || tracker.failures >= MAX_FAILURES;
  rollButton.disabled = terminal;
  rollButton.setAttribute("aria-disabled", String(terminal));
  rollButton.classList.toggle("rollable", !terminal);
}

function preserveTrayState(app, tray, context) {
  const remembered = trayOpenStates.get(app);
  const shouldOpen = context?.death?.open === true
    ? true
    : (remembered ?? Boolean(app._deathTrayOpen ?? tray.classList.contains("open")));

  tray.classList.toggle("open", shouldOpen);
  tray.classList.add("fds-rendering");
  trayOpenStates.set(app, shouldOpen);

  const tab = tray.querySelector(".death-tab");
  tab?.addEventListener("click", () => {
    // This listener runs before D&D5e's action handler. Remember the intended
    // state immediately so a sheet re-render cannot reset the tray in between.
    const nextState = !tray.classList.contains("open");
    trayOpenStates.set(app, nextState);
    app._deathTrayOpen = nextState;
  }, { capture: true });

  requestAnimationFrame(() => tray.classList.remove("fds-rendering"));
}

function replaceDeathSaveLayout(app, element, context) {
  const actor = app.actor;
  if (!supportsFiveDeathSaves(actor)) return;

  const tray = element.matches?.(".death-tray") ? element : element.querySelector(".death-tray");
  const saves = tray?.querySelector(".death-saves");
  const rollButton = saves?.querySelector("button.death-save");
  if (!tray || !saves || !rollButton) return;

  preserveTrayState(app, tray, context);
  const tracker = getTracker(actor);
  const editable = canManageTracker();
  tray.classList.add("five-death-saves");
  saves.replaceChildren(
    createPips("successes", MAX_SUCCESSES, tracker.successes, editable),
    rollButton,
    createPips("failures", MAX_FAILURES, tracker.failures, editable)
  );
  if (editable) {
    const configButton = rollButton.dataset.action === "showConfiguration"
      ? prepareConfigurationButton(rollButton)
      : createConfigurationButton();
    if (configButton !== rollButton) saves.append(configButton);
  }
  bindManualTrackerControls(saves, actor);

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
function onRenderApplicationV2(app, element, context) {
  if (app.constructor?.name !== "CharacterActorSheet") return;
  replaceDeathSaveLayout(app, element, context);
}

function onActorPreUpdate(actor, changes) {
  if (!supportsFiveDeathSaves(actor)) return;

  const nextHitPoints = foundry.utils.getProperty(changes, "system.attributes.hp.value");
  if (!Number.isFinite(nextHitPoints)) return;

  const currentHitPoints = actor.system.attributes.hp.value;
  const tracker = getTracker(actor);

  // A character only gains the automatic failure when crossing from positive HP
  // to zero. Repeated updates while already down therefore cannot add more.
  if (currentHitPoints > 0 && nextHitPoints <= 0 && getAutoDownFailure(actor)) {
    const nextTracker = {
      successes: 0,
      failures: Math.min(tracker.failures + 1, MAX_FAILURES)
    };
    writeTracker(changes, nextTracker);
    writeSystemTracker(changes, nextTracker);
    return;
  }

  // Successes are cleared when a character regains consciousness. Failures are
  // deliberately retained: this homebrew resets them only after a rest. A rest
  // itself also restores HP, so preserve a failure value the rest workflow has
  // already queued instead of overwriting it with the old actor value.
  if (currentHitPoints <= 0 && nextHitPoints > 0) {
    const pendingFailures = foundry.utils.getProperty(changes, `flags.${MODULE_ID}.${FLAG_FAILURES}`)
      ?? changes[`flags.${MODULE_ID}.${FLAG_FAILURES}`];
    writeTracker(changes, {
      successes: 0,
      failures: pendingFailures === undefined
        ? tracker.failures
        : clampTrackerValue(pendingFailures, MAX_FAILURES)
    });
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

function onActorUpdate(actor, changes) {
  if (!supportsFiveDeathSaves(actor)) return;

  const flagChanges = foundry.utils.getProperty(changes, `flags.${MODULE_ID}`)
    ?? changes[`flags.${MODULE_ID}`];
  const changedTracker = [FLAG_SUCCESSES, FLAG_FAILURES].some(key => {
    return (flagChanges && (key in flagChanges)) || (`flags.${MODULE_ID}.${key}` in changes);
  });
  if (!changedTracker) return;

  // The native HP display is part of D&D5e's template. Our extra pips live in
  // the already-rendered tray, so update those elements directly instead of
  // forcing a full sheet re-render (and its tray animation).
  synchronizeTrackerDisplay(actor);
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
  Hooks.on("updateActor", onActorUpdate);
  Hooks.on("dnd5e.rollDeathSave", onDeathSave);
  Hooks.on("dnd5e.preRestCompleted", onPreRestCompleted);
  Hooks.on("renderApplicationV2", onRenderApplicationV2);
});
