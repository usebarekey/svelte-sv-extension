import { dirname, join, posix, win32 } from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import process from "node:process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { applyEdits, modify, parse } from "jsonc-parser";
const editor_folders = {
  "vscode": "Code",
  "vscode-insiders": "Code - Insiders",
  "cursor": "Cursor",
  "vscodium": "VSCodium",
  "windsurf": "Windsurf",
};
/**
 * Parses CLI arguments for `svelte-sv-extension`.
 *
 * @example
 * ```ts
 * const options = parse_sv_extension_cli_args(["init", "--global", "--editor", "cursor"]);
 * ```
 *
 * @since 0.1.0
 * @param args - Command-line arguments excluding the executable and script path.
 * @returns Parsed init options or a help marker.
 */
export function parse_sv_extension_cli_args(args) {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    return { help: true };
  }
  const [command, ...rest] = args;
  if (command !== "init") {
    throw new Error(`Unknown command "${command}". Expected "init".`);
  }
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--help" || arg === "-h") {
      return { help: true };
    }
    if (arg === "--global" || arg === "-g") {
      options.global = true;
      continue;
    }
    if (arg.startsWith("--editor=")) {
      options.editor = arg.slice("--editor=".length);
      continue;
    }
    if (arg === "--editor") {
      options.editor = read_required_arg(rest, index, "--editor");
      index += 1;
      continue;
    }
    if (arg.startsWith("--cwd=")) {
      options.cwd = arg.slice("--cwd=".length);
      continue;
    }
    if (arg === "--cwd") {
      options.cwd = read_required_arg(rest, index, "--cwd");
      index += 1;
      continue;
    }
    if (arg.startsWith("--settings=")) {
      options.settings_path = arg.slice("--settings=".length);
      continue;
    }
    if (arg === "--settings") {
      options.settings_path = read_required_arg(rest, index, "--settings");
      index += 1;
      continue;
    }
    throw new Error(`Unknown option "${arg}".`);
  }
  return options;
}
/**
 * Writes VS Code-family settings for `.sv` language-mode support.
 *
 * @example
 * ```ts
 * await init_sv_extension();
 * await init_sv_extension({ global: true, editor: "cursor" });
 * ```
 *
 * @since 0.1.0
 * @param options - Init behavior, including local/global scope and editor choice.
 * @returns The settings path and whether it was changed.
 */
export async function init_sv_extension(options = {}) {
  const scope = options.global ? "global" : "local";
  const editor = scope === "global"
    ? normalize_vscode_editor(options.editor)
    : undefined;
  const settings_path = options.settings_path ??
    (scope === "global"
      ? resolve_vscode_settings_path({ ...options, editor })
      : join(options.cwd ?? process.cwd(), ".vscode", "settings.json"));
  const source = existsSync(settings_path)
    ? await readFile(settings_path, "utf8")
    : "{}\n";
  const patched = patch_sv_extension_vscode_settings(source);
  if (patched.changed) {
    await mkdir(dirname(settings_path), { recursive: true });
    await writeFile(settings_path, patched.text);
  }
  return {
    settings_path,
    changed: patched.changed,
    scope,
    editor,
  };
}
/**
 * Adds the `.sv` file association to VS Code settings.
 *
 * @example
 * ```ts
 * const result = patch_sv_extension_vscode_settings("{}");
 * ```
 *
 * @since 0.1.0
 * @param text - Existing JSONC settings text.
 * @returns Patched settings text and a changed flag.
 */
export function patch_sv_extension_vscode_settings(text) {
  const source = text.trim() === "" ? "{}\n" : text;
  const settings = parse_settings(source);
  const existing = settings["files.associations"];
  const associations = merge_file_associations(existing);
  return replace_setting(source, "files.associations", associations);
}
/**
 * Resolves the user `settings.json` path for a VS Code-family editor.
 *
 * @example
 * ```ts
 * const path = resolve_vscode_settings_path({
 *   editor: "vscode",
 *   platform: "linux",
 *   home_dir: "/home/sander",
 * });
 * ```
 *
 * @since 0.1.0
 * @param options - Editor, platform, env, and home directory overrides.
 * @returns The platform-specific user settings path.
 */
export function resolve_vscode_settings_path(options = {}) {
  const editor = normalize_vscode_editor(options.editor);
  const platform = normalize_platform(options.platform ?? process.platform);
  const env = options.env ?? process.env;
  const home = options.home_dir ?? homedir();
  const folder = editor_folders[editor];
  if (platform === "win32") {
    const app_data = env.APPDATA ?? win32.join(home, "AppData", "Roaming");
    return win32.join(app_data, folder, "User", "settings.json");
  }
  if (platform === "darwin") {
    return posix.join(
      home,
      "Library",
      "Application Support",
      folder,
      "User",
      "settings.json",
    );
  }
  const config_home = env.XDG_CONFIG_HOME ?? posix.join(home, ".config");
  return posix.join(config_home, folder, "User", "settings.json");
}
function normalize_platform(platform) {
  if (platform === "win32" || platform === "darwin" || platform === "linux") {
    return platform;
  }
  throw new Error(
    `Unsupported platform "${platform}". Supported platforms are macOS, Windows, and Linux.`,
  );
}
function normalize_vscode_editor(editor) {
  const normalized = (editor ?? "vscode").toLowerCase();
  if (normalized === "code" || normalized === "vscode") {
    return "vscode";
  }
  if (normalized === "code-insiders" || normalized === "vscode-insiders") {
    return "vscode-insiders";
  }
  if (normalized === "cursor") {
    return "cursor";
  }
  if (normalized === "vscodium" || normalized === "codium") {
    return "vscodium";
  }
  if (normalized === "windsurf") {
    return "windsurf";
  }
  throw new Error(
    `Unsupported editor "${editor}". Supported editors are vscode, vscode-insiders, cursor, vscodium, and windsurf.`,
  );
}
function parse_settings(text) {
  const errors = [];
  const settings = parse(text, errors, {
    allowTrailingComma: true,
    disallowComments: false,
  });
  if (errors.length > 0) {
    throw new Error("Could not parse VS Code settings JSONC.");
  }
  if (
    settings === null ||
    Array.isArray(settings) ||
    typeof settings !== "object"
  ) {
    throw new Error("VS Code settings must be a JSON object.");
  }
  return settings;
}
function merge_file_associations(existing) {
  const existing_associations = existing !== null && !Array.isArray(existing) &&
      typeof existing === "object"
    ? existing
    : {};
  return {
    ...existing_associations,
    "*.sv": "svelte",
  };
}
function replace_setting(text, key, value) {
  const settings = parse_settings(text);
  const current = settings[key];
  if (JSON.stringify(current) === JSON.stringify(value)) {
    return { text, changed: false };
  }
  const next_text = applyEdits(
    text,
    modify(text, [key], value, {
      formattingOptions: {
        eol: "\n",
        insertSpaces: true,
        tabSize: 2,
      },
    }),
  );
  return {
    text: next_text,
    changed: next_text !== text,
  };
}
function read_required_arg(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    throw new Error(`Expected a value after ${flag}.`);
  }
  return value;
}
