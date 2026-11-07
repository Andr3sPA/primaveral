import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Module = require("node:module");
const originalLoad = Module._load;

Module._load = function (specifier, parent, isMain) {
  if (String(specifier).includes("server-only")) return {};
  return originalLoad.call(this, specifier, parent, isMain);
};
