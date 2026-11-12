import assert from "node:assert/strict";
import test from "node:test";
import { Markdown, visibleWidth, type MarkdownTheme } from "@earendil-works/pi-tui";
import {
  patchNativeUserMessagePrototype,
  type PatchableUserMessagePrototype,
} from "../src/renderer.js";
import { unregisterUserMessageRenderPrototypePatch } from "../src/patch.js";

const OSC_START = "\x1b]133;A\x07";
const OSC_END = "\x1b]133;B\x07\x1b]133;C\x07";

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
