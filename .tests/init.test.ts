import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "node:path";
import {
  init_sv_extension,
  parse_sv_extension_cli_args,
  patch_sv_extension_vscode_settings,
  resolve_vscode_settings_path,
} from "../src/init.ts";

Deno.test("patch_sv_extension_vscode_settings creates .sv association", () => {
  const result = patch_sv_extension_vscode_settings("{}\n");

  assertEquals(result.changed, true);
  assertStringIncludes(result.text, '"*.sv": "svelte"');
});

Deno.test("patch_sv_extension_vscode_settings preserves and overrides associations", () => {
  const result = patch_sv_extension_vscode_settings(`{
    // keep this comment
    "files.associations": {
      "*.foo": "typescript",
      "*.sv": "plaintext"
    }
  }
`);

  assertEquals(result.changed, true);
  assertStringIncludes(result.text, "// keep this comment");
  assertStringIncludes(result.text, '"*.foo": "typescript"');
  assertStringIncludes(result.text, '"*.sv": "svelte"');
});

Deno.test("init_sv_extension writes local VS Code settings", async () => {
  const root = await Deno.makeTempDir();
  const result = await init_sv_extension({ cwd: root });
  const settings_path = join(root, ".vscode", "settings.json");
  const settings_text = await Deno.readTextFile(settings_path);

  assertEquals(result.settings_path, settings_path);
  assertEquals(result.scope, "local");
  assertEquals(result.changed, true);
  assertStringIncludes(settings_text, '"*.sv": "svelte"');
});

Deno.test("resolve_vscode_settings_path supports Windows VS Code-family editors", () => {
  const path = resolve_vscode_settings_path({
    editor: "cursor",
    platform: "win32",
    env: { APPDATA: "C:\\Users\\Sander\\AppData\\Roaming" },
    home_dir: "C:\\Users\\Sander",
  });

  assertEquals(
    path,
    "C:\\Users\\Sander\\AppData\\Roaming\\Cursor\\User\\settings.json",
  );
});

Deno.test("resolve_vscode_settings_path supports macOS VS Code-family editors", () => {
  const path = resolve_vscode_settings_path({
    editor: "vscodium",
    platform: "darwin",
    home_dir: "/Users/sander",
  });

  assertEquals(
    path,
    "/Users/sander/Library/Application Support/VSCodium/User/settings.json",
  );
});

Deno.test("resolve_vscode_settings_path supports Linux VS Code-family editors", () => {
  const path = resolve_vscode_settings_path({
    editor: "windsurf",
    platform: "linux",
    env: { XDG_CONFIG_HOME: "/home/sander/.config/custom" },
    home_dir: "/home/sander",
  });

  assertEquals(
    path,
    "/home/sander/.config/custom/Windsurf/User/settings.json",
  );
});

Deno.test("parse_sv_extension_cli_args parses init flags", () => {
  const options = parse_sv_extension_cli_args([
    "init",
    "--global",
    "--editor",
    "cursor",
    "--cwd",
    "fixture",
  ]);

  assertEquals(options, {
    global: true,
    editor: "cursor",
    cwd: "fixture",
  });
});
