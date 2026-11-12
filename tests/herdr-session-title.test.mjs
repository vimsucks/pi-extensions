import assert from "node:assert/strict";
import extension from "../extensions/herdr-session-title/index.js";
process.env.HC_TERMINAL_ID = "t3";
const labels = { "herdr.tab": "tab", "herdr.space": "space" };
const tab = { id: "tab", name: "原名称", terminals: [{ terminal: "t3" }] };
let failAfterRename = false;
const pi = {
  handlers: {},
  on(event, handler) { this.handlers[event] = handler; },
  async exec(command, args) {
    if (command === "hc" && args[0] === "get") return { code: 0, stdout: JSON.stringify({ labels }) };
    if (command === "herdr-app" && args[0] === "ls") return { code: 0, stdout: JSON.stringify({ spaces: [{ id: "space", machine: null, tabs: [tab] }] }) };
    if (command === "herdr-app" && args[0] === "do") { const name = JSON.parse(args[2]).name; tab.name = name || "1"; return { code: 0 }; }
    if (command === "hc" && args[0] === "label") { if (failAfterRename && tab.name === "session after failure") { failAfterRename = false; return { code: 1 }; } const i = args[2].indexOf("="); labels[args[2].slice(0, i)] = args[2].slice(i + 1); return { code: 0 }; }
    throw new Error("unexpected command");
  },
};
const ctx = { mode: "tui", sessionManager: { getSessionName: () => "会话一" }, ui: { notify: message => { throw new Error(message); } } };
extension(pi);
await pi.handlers.session_start({}, ctx);
assert.equal(tab.name, "会话一");
await pi.handlers.session_shutdown({ reason: "reload" }, ctx);
extension(pi);
await pi.handlers.session_start({}, { ...ctx, sessionManager: { getSessionName: () => "会话二" } });
assert.equal(tab.name, "会话二");
await pi.handlers.session_info_changed({ name: undefined }, ctx);
assert.equal(tab.name, "原名称");
await pi.handlers.session_info_changed({ name: "会话三" }, ctx);
assert.equal(tab.name, "会话三");
await pi.handlers.session_shutdown({ reason: "quit" }, ctx);
assert.equal(tab.name, "原名称");

tab.name = "1";
await pi.handlers.session_info_changed({ name: "会话四" }, ctx);
assert.equal(tab.name, "会话四");
await pi.handlers.session_shutdown({ reason: "quit" }, ctx);
assert.equal(tab.name, "1");
await pi.handlers.session_info_changed({ name: "会话五" }, ctx);
tab.name = "用户修改";
await pi.handlers.session_info_changed({ name: "会话六" }, ctx);
await pi.handlers.session_shutdown({ reason: "quit" }, ctx);
assert.equal(tab.name, "用户修改");
await pi.handlers.session_info_changed({ name: "会话七" }, ctx);
assert.equal(tab.name, "用户修改");
labels["pi.session-tab-title"] = "";
tab.name = "1";
await pi.handlers.session_info_changed({ name: "多 pane 前" }, ctx);
tab.terminals.push({ terminal: "t4" });
await pi.handlers.session_info_changed({ name: "多 pane 后" }, ctx);
tab.terminals.pop();
await pi.handlers.session_shutdown({ reason: "quit" }, ctx);
assert.equal(tab.name, "多 pane 前");
labels["pi.session-tab-title"] = "";
tab.name = "Original";
failAfterRename = true;
const warnings = [];
const failureContext = { ...ctx, ui: { notify: message => warnings.push(message) } };
await pi.handlers.session_info_changed({ name: "session after failure" }, failureContext);
assert.equal(warnings.length, 1);
await pi.handlers.session_shutdown({ reason: "quit" }, failureContext);
assert.equal(tab.name, "Original");
console.log("herdr-session-title: ok");
