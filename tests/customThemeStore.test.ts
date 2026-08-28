import assert from "node:assert/strict";
import test from "node:test";
import { validateCustomThemeMetadata } from "../lib/customThemeStore.ts";

test("accepts supported custom theme metadata within the image limits", () => {
  assert.equal(validateCustomThemeMetadata({ type: "image/webp", size: 5 * 1024 * 1024, width: 800 }), null);
  assert.equal(validateCustomThemeMetadata({ type: "image/svg+xml", size: 10, width: 1200 }), "Use a JPG, PNG, or WEBP image.");
});

test("rejects oversized and too-small custom theme metadata", () => {
  assert.equal(validateCustomThemeMetadata({ type: "image/png", size: 5 * 1024 * 1024 + 1, width: 1200 }), "Custom themes must be 5 MB or smaller.");
  assert.equal(validateCustomThemeMetadata({ type: "image/jpeg", size: 100, width: 799 }), "Custom themes need a minimum width of 800px.");
});
