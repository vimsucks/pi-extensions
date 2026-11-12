import { randomUUID } from "node:crypto";

const LABEL = "pi.session-tab-title";
const OWNER = Symbol.for("pi.herdr-session-title.owner");
globalThis[OWNER] ??= randomUUID();

export default function (pi) {
  const terminal = process.env.HC_TERMINAL_ID;
  if (!terminal) return;
  let pending = Promise.resolve();

  async function sync(name, ctx, quit = false) {
    if (ctx.mode !== "tui") return;
    name = typeof name === "string" ? name.replace(/[\x00-\x1f\x7f-\x9f]/g, " ").trim() : "";
    try {
      const get = await pi.exec("hc", ["get", terminal, "--json"], { timeout: 3000 });
      if (get.code !== 0) throw new Error("Could not read terminal information");
      const core = JSON.parse(get.stdout);
      const tabId = core.labels?.["herdr.tab"];
      const spaceId = core.labels?.["herdr.space"];
      if (!tabId || !spaceId) return;
      let state;
      try { state = JSON.parse(core.labels[LABEL] || "null"); } catch { return; }
      if (state?.owner !== globalThis[OWNER] || state?.tab !== tabId) state = null;
      if (state?.disabled || (!state && (!name || quit))) return;
      const list = await pi.exec("herdr-app", ["ls"], { timeout: 3000 });
      if (list.code !== 0) throw new Error("Could not read the Herdr App layout");
      const spaces = JSON.parse(list.stdout).spaces;
      if (!Array.isArray(spaces)) throw new Error("Invalid Herdr App layout");
      const matches = [];
      for (const space of spaces) {
        if (space.machine != null || space.id !== spaceId || !Array.isArray(space.tabs)) continue;
        for (const [index, tab] of space.tabs.entries()) {
          if (tab.id === tabId && Array.isArray(tab.terminals) && tab.terminals.some(p => p.terminal === terminal)) matches.push({ tab, index });
        }
      }
      if (matches.length !== 1) return;
      const { tab, index } = matches[0];
      const save = async value => {
        const result = await pi.exec("hc", ["label", terminal, `${LABEL}=${value ? JSON.stringify(value) : ""}`], { timeout: 3000 });
        if (result.code !== 0) throw new Error("Could not save tab title synchronization state");
      };
      if (tab.terminals.length !== 1) {
        if (state) await save({ ...state, disabled: true });
        return;
      }
      if (!state) {
        state = { owner: globalThis[OWNER], tab: tabId, original: tab.name === String(index + 1) ? null : tab.name, last: tab.name };
      } else {
        const expected = state.last === null ? String(index + 1) : state.last;
        if (tab.name !== expected) {
          await save({ ...state, disabled: true });
          return;
        }
      }
      const target = quit || !name ? state.original : name;
      const displayed = target === null ? String(index + 1) : target;
      if (tab.name !== displayed || (target === null && state.last !== null)) {
        const renamed = await pi.exec("herdr-app", ["do", "tab.rename", JSON.stringify({ id: tabId, name: target ?? "" })], { timeout: 3000 });
        if (renamed.code !== 0) throw new Error("Could not rename Herdr tab");
      }
      await save(quit ? null : { ...state, last: target });
    } catch (error) {
      ctx.ui.notify(`Herdr tab synchronization failed: ${error.message}`, "warning");
    }
  }

  function enqueue(name, ctx, quit = false) {
    pending = pending.then(() => sync(name, ctx, quit));
    return pending;
  }
  pi.on("session_start", (_event, ctx) => enqueue(ctx.sessionManager.getSessionName(), ctx));
  pi.on("session_info_changed", (event, ctx) => enqueue(event.name, ctx));
  pi.on("session_shutdown", (event, ctx) => event.reason === "quit" ? enqueue(undefined, ctx, true) : undefined);
}
