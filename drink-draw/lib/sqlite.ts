import { spawnSync } from "node:child_process";
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { CatalogValidationError, initialCatalog } from "@/lib/catalog";

export function sqlite<T>(command: string, args: Record<string, unknown> = {}): T {
  const directory = mkdtempSync(join(tmpdir(), "drink-draw-sqlite-"));
  try {
    const input = join(directory, "request.json");
    const output = join(directory, "response.json");
    writeFileSync(input, JSON.stringify({
      path: resolve(process.env.DRINK_DRAW_DATABASE_PATH || "data/drink-draw.sqlite"),
      seed: initialCatalog,
      command,
      args,
    }), { mode: 0o600 });
    const stdin = openSync(input, "r");
    try {
      const stdout = openSync(output, "w", 0o600);
      try {
        const result = spawnSync(
          process.env.DRINK_DRAW_PYTHON || "python3",
          [resolve("scripts/sqlite_bridge.py")],
          { stdio: [stdin, stdout, "inherit"], timeout: 15000, windowsHide: true },
        );
        if (result.error) throw result.error;
        if (result.status !== 0) throw new Error("Falha na operação SQLite.");
      } finally {
        closeSync(stdout);
      }
    } finally {
      closeSync(stdin);
    }
    const response = JSON.parse(readFileSync(output, "utf8")) as { result: T; error?: string };
    if (response.error) throw new CatalogValidationError(response.error);
    return response.result;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
