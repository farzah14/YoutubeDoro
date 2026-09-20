import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const source = resolve("node_modules/@mediapipe/tasks-vision/wasm");
const destination = resolve("public/mediapipe/wasm");

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });
