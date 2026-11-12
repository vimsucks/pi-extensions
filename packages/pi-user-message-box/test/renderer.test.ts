import assert from "node:assert/strict";
import test from "node:test";
import { Markdown, visibleWidth, type MarkdownTheme } from "@earendil-works/pi-tui";
import {
  patchNativeUserMessagePrototype,
  type PatchableUserMessagePrototype,
} from "../src/renderer.js";
import { unregisterUserMessageRenderPrototypePatch } from "../src/patch.js";
import { UserMessageComponent, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import userMessageBox from "../src/index.js";

const OSC_START = "\x1b]133;A\x07";
const OSC_END = "\x1b]133;B\x07\x1b]133;C\x07";

test("patches user messages only during interactive sessions", () => {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const pi = { on: (event: string, handler: (...args: unknown[]) => void) => handlers.set(event, handler) } as unknown as ExtensionAPI;
  const original = UserMessageComponent.prototype.render;
  userMessageBox(pi);
  assert.equal(UserMessageComponent.prototype.render, original);
  handlers.get("session_start")?.({}, { mode: "print", ui: {} });
  assert.equal(UserMessageComponent.prototype.render, original);
  handlers.get("session_start")?.({}, { mode: "tui", ui: { theme: undefined } });
  assert.notEqual(UserMessageComponent.prototype.render, original);
  handlers.get("session_shutdown")?.();
  assert.equal(UserMessageComponent.prototype.render, original);
});

function fixture(): PatchableUserMessagePrototype {
  return {
    render(width: number) {
      return [`message:${width}`];
    },
  };
}

function plainTheme(): MarkdownTheme {
  const identity = (text: string) => text;
  return {
    heading: identity,
    link: identity,
    linkUrl: identity,
    code: identity,
    codeBlock: identity,
    codeBlockBorder: identity,
    quote: identity,
    quoteBorder: identity,
    hr: identity,
    listBullet: identity,
    bold: identity,
    italic: identity,
    strikethrough: identity,
    underline: identity,
  };
}

test("frames a user message and preserves OSC 133 prompt zones", () => {
  const prototype = fixture();
  patchNativeUserMessagePrototype(prototype, () => undefined, () => true);

  const output = prototype.render(24);

  assert.equal(output[0], OSC_START);
  assert.match(output[1] ?? "", /^╭  ─+╮$/);
  assert.equal(output[3], "│ message:20           │");
  assert.match((output.at(-1) ?? "").slice(OSC_END.length), /^╰─+╯$/);
  assert.ok((output.at(-1) ?? "").startsWith(OSC_END));
  assert.ok(output.slice(1, -1).every((line) => [...line].length === 24));
});

test("uses the configured title", () => {
  const previous = process.env.PI_USER_MESSAGE_BOX_TITLE;
  process.env.PI_USER_MESSAGE_BOX_TITLE = "user";
  try {
    const prototype = fixture();
    patchNativeUserMessagePrototype(prototype, () => undefined, () => true);
    assert.match(prototype.render(24)[1] ?? "", /^╭ user ─+╮$/);
    process.env.PI_USER_MESSAGE_BOX_TITLE = "用户";
    const wide = fixture();
    patchNativeUserMessagePrototype(wide, () => undefined, () => true);
    assert.equal(visibleWidth(wide.render(24)[1] ?? ""), 24);
  } finally {
    if (previous === undefined) delete process.env.PI_USER_MESSAGE_BOX_TITLE;
    else process.env.PI_USER_MESSAGE_BOX_TITLE = previous;
  }
});

test("updates cached output after a theme change", () => {
  const prototype = fixture();
  const theme = { colors: { border: "old" }, fg: (_color: string, text: string) => `${theme.colors.border}:${text}` };
  patchNativeUserMessagePrototype(prototype, () => theme, () => true);
  assert.match(prototype.render(24)[1] ?? "", /old:/);
  theme.colors = { border: "new" };
  assert.match(prototype.render(24)[1] ?? "", /new:/);
});

test("passes message identity to markdown transformers", () => {
  const markdown = new Markdown("hello", 0, 0, plainTheme());
  let received: unknown;
  const prototype = Object.assign(fixture(), {
    children: [{ children: [markdown] }],
    messageId: "message-id",
    timestamp: "2026-01-01T00:00:00Z",
    markdownTransformers: [(text: string, context: unknown) => { received = context; return text; }],
  });
  patchNativeUserMessagePrototype(prototype, () => undefined, () => true);
  prototype.render(40);
  assert.deepEqual(received, { messageType: "user", isStreaming: false, availableWidth: 36, messageId: "message-id", timestamp: "2026-01-01T00:00:00Z" });
});

test("preserves ordered-list markers and applies user markdown transformers", () => {
  const markdown = new Markdown("3. before\n5. next", 0, 0, plainTheme());
  const prototype = Object.assign(fixture(), {
    children: [{ children: [markdown] }],
    markdownTransformers: [
      (text: string) => text.replace("before", "after"),
    ],
  });
  patchNativeUserMessagePrototype(prototype, () => undefined, () => true);

  const output = prototype.render(40).join("\n");

  assert.match(output, /3\. after/);
  assert.match(output, /5\. next/);
  assert.doesNotMatch(output, /1\. after/);
});

test("uses the original renderer in a terminal that is too narrow", () => {
  const prototype = fixture();
  patchNativeUserMessagePrototype(prototype, () => undefined, () => true);

  assert.deepEqual(prototype.render(7), ["message:7"]);
});

test("restores the original renderer during shutdown or reload", () => {
  const prototype = fixture();
  const original = prototype.render;
  patchNativeUserMessagePrototype(prototype, () => undefined, () => true);

  unregisterUserMessageRenderPrototypePatch(prototype);

  assert.equal(prototype.render, original);
  assert.deepEqual(prototype.render(12), ["message:12"]);
});
