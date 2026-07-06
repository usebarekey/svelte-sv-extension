import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import { mkdtemp, readFile as read_file, rm } from "node:fs/promises";
import {
	init_sv_extension,
	parse_sv_extension_cli_args,
	patch_sv_extension_vscode_settings,
	resolve_vscode_settings_path,
} from "../src/init";

describe("init", () => {
	test("patch_sv_extension_vscode_settings creates .sv association", () => {
		const result = patch_sv_extension_vscode_settings("{}\n");

		expect(result.changed).toBe(true);
		expect(result.text).toContain('"*.sv": "svelte"');
	});

	test("patch_sv_extension_vscode_settings preserves and overrides associations", () => {
		const result = patch_sv_extension_vscode_settings(`{
	// keep this comment
	"files.associations": {
		"*.foo": "typescript",
		"*.sv": "plaintext"
	}
}
`);

		expect(result.changed).toBe(true);
		expect(result.text).toContain("// keep this comment");
		expect(result.text).toContain('"*.foo": "typescript"');
		expect(result.text).toContain('"*.sv": "svelte"');
	});

	test("patch_sv_extension_vscode_settings rejects non-object settings", () => {
		expect(() => patch_sv_extension_vscode_settings("[]\n")).toThrow(
			"VS Code settings must be a JSON object.",
		);
	});

	test("patch_sv_extension_vscode_settings rejects non-object file associations", () => {
		const settings_text = `{
	"files.associations": ["*.sv"]
}
`;

		expect(() => patch_sv_extension_vscode_settings(settings_text)).toThrow(
			'VS Code setting "files.associations" must be a JSON object when present.',
		);
	});

	test("init_sv_extension writes local VS Code settings", async () => {
		const root = await mkdtemp(join(tmpdir(), "svelte-sv-extension-init-"));

		try {
			const result = await init_sv_extension({ cwd: root });
			const settings_path = join(root, ".vscode", "settings.json");
			const settings_text = await read_file(settings_path, "utf8");

			expect(result.settings_path).toBe(settings_path);
			expect(result.scope).toBe("local");
			expect(result.changed).toBe(true);
			expect(settings_text).toContain('"*.sv": "svelte"');
		} finally {
			await rm(root, { force: true, recursive: true });
		}
	});

	test("resolve_vscode_settings_path supports Windows VS Code-family editors", () => {
		const path = resolve_vscode_settings_path({
			editor: "cursor",
			platform: "win32",
			env: { APPDATA: "C:\\Users\\Sander\\AppData\\Roaming" },
			home_dir: "C:\\Users\\Sander",
		});

		expect(path).toBe("C:\\Users\\Sander\\AppData\\Roaming\\Cursor\\User\\settings.json");
	});

	test("resolve_vscode_settings_path supports macOS VS Code-family editors", () => {
		const path = resolve_vscode_settings_path({
			editor: "vscodium",
			platform: "darwin",
			home_dir: "/Users/sander",
		});

		expect(path).toBe("/Users/sander/Library/Application Support/VSCodium/User/settings.json");
	});

	test("resolve_vscode_settings_path supports Linux VS Code-family editors", () => {
		const path = resolve_vscode_settings_path({
			editor: "windsurf",
			platform: "linux",
			env: { XDG_CONFIG_HOME: "/home/sander/.config/custom" },
			home_dir: "/home/sander",
		});

		expect(path).toBe("/home/sander/.config/custom/Windsurf/User/settings.json");
	});

	test("parse_sv_extension_cli_args parses init flags", () => {
		const options = parse_sv_extension_cli_args([
			"init",
			"--global",
			"--editor",
			"cursor",
			"--cwd",
			"fixture",
		]);

		expect(options).toEqual({
			global: true,
			editor: "cursor",
			cwd: "fixture",
		});
	});
});
