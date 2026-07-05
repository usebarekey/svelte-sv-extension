import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";

const source_files = [
  "cli",
  "config",
  "init",
  "mod",
] as const;

const target_paths: string[] = [];

for (const source_file of source_files) {
  const source_path = join("src", `${source_file}.ts`);
  const target_path = join("src", `${source_file}.js`);
  const source = await readFile(source_path, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: false,
    },
    fileName: source_path,
  });
  const code = rewrite_ts_extensions(transpiled.outputText);

  await writeFile(target_path, code);
  target_paths.push(target_path);
}

await run_command([Deno.execPath(), "fmt", ...target_paths]);

function rewrite_ts_extensions(code: string): string {
  return code
    .replace(/(from\s+["'][^"']+)\.ts(["'])/g, "$1.js$2")
    .replace(/(import\(\s*["'][^"']+)\.ts(["']\s*\))/g, "$1.js$2");
}

async function run_command(
  command: readonly [string, ...string[]],
): Promise<void> {
  const [cmd, ...args] = command;
  const process = new Deno.Command(cmd, {
    args,
    stderr: "piped",
    stdout: "piped",
  });
  const output = await process.output();

  if (output.success) {
    return;
  }

  const stdout = new TextDecoder().decode(output.stdout);
  const stderr = new TextDecoder().decode(output.stderr);

  throw new Error(
    [`Command failed: ${command.join(" ")}`, stdout, stderr].join("\n"),
  );
}
