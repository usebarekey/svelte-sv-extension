#!/usr/bin/env node
import { realpathSync as realpath_sync } from "node:fs";
import { pathToFileURL as path_to_file_url } from "node:url";
import { init_sv_extension, parse_sv_extension_cli_args } from "./init.ts";

import process from "node:process";

const help_text = `
svelte-sv-extension

Usage:
  svelte-sv-extension init [--global] [--editor <name>]

Options:
  --global, -g          Write editor user settings instead of .vscode/settings.json.
  --editor <name>       vscode, vscode-insiders, cursor, vscodium, or windsurf.
  --cwd <path>          Project directory for local settings. Defaults to cwd.
  --settings <path>     Explicit settings.json path.
  --help, -h            Show this help.
`.trim();

if (is_cli_entrypoint()) {
	await main(process.argv.slice(2));
}

/**
 * Runs the `svelte-sv-extension` command line interface.
 *
 * @example
 * ```ts
 * await main(["init", "--global", "--editor", "cursor"]);
 * ```
 *
 * @since 0.1.0
 * @param args - Command-line arguments excluding the executable and script path.
 * @returns A promise that resolves when the command has finished.
 */
export async function main(args: readonly string[]): Promise<void> {
	try {
		const options = parse_sv_extension_cli_args(args);

		if (options.help) {
			console.log(help_text);
			return;
		}

		const result = await init_sv_extension(options);
		const verb = result.changed ? "Updated" : "Already configured";

		console.log(`${verb} ${result.settings_path}`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);

		console.error(`svelte-sv-extension: ${message}`);
		process.exitCode = 1;
	}
}

function is_cli_entrypoint(): boolean {
	const script_path = process.argv[1];

	if (!script_path) {
		return false;
	}

	if (import.meta.url === path_to_file_url(script_path).href) {
		return true;
	}

	return import.meta.url === path_to_file_url(realpath_sync(script_path)).href;
}
