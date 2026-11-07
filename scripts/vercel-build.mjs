import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** @param {string} command @param {string[]} args */
function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

/** @param {(command: string, args: string[]) => void} [runCommand] */
export function runVercelBuild(runCommand = run) {
  runCommand("npm", ["run", "build"]);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  runVercelBuild();
}
