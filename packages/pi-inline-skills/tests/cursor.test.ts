import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { textBeforeCursor } from "../src/cursor.js";

describe("textBeforeCursor", () => {
  it("joins preceding lines with the current line prefix", () => {
    assert.equal(textBeforeCursor(["Hello", "/code-review later"], 1, "/code-review".length), "Hello\n/code-review");
  });

  it("uses only the current line prefix on the first line", () => {
    assert.equal(textBeforeCursor(["Use /code-review later"], 0, "Use /code-review".length), "Use /code-review");
  });
});
