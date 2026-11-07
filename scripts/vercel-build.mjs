import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** @param {Record<string, string | undefined>} [environment] */
export function shouldRunProductionMigrations(environment = process.env) {
  return environment.VERCEL === "1" && environment.VERCEL_ENV === "production";
}

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

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  if (shouldRunProductionMigrations()) {
    run("npm", ["run", "db:migrate"]);
  }

  run("npm", ["run", "build"]);
}
