import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import { spawn } from "node:child_process";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath as file_url_to_path } from "node:url";
import {
	mkdtemp,
	mkdir,
	readFile as read_file,
	rm,
	writeFile as write_file,
} from "node:fs/promises";

const repo_root = dirname(file_url_to_path(import.meta.url));
const package_root = dirname(repo_root);
const vp_bin = process.env.VP_BIN ?? "vp";

describe("SvelteKit integration", () => {
	test("builds .sv routes and cross-extension component imports", async () => {
		const fixture_dir = await mkdtemp(join(tmpdir(), "svelte-sv-extension-"));

		try {
			await run_vp(package_root, ["pack"]);
			await run_vp(package_root, ["exec", "tsc", "-p", "tsconfig.build.json"]);
			await write_fixture(fixture_dir);
			await run_vp(fixture_dir, ["install"]);
			await run_vp(fixture_dir, ["exec", "svelte-kit", "sync"]);

			const generated_layout = await read_file(
				join(fixture_dir, ".svelte-kit", "generated", "client", "nodes", "0.js"),
				"utf8",
			);
			const generated_error = await read_file(
				join(fixture_dir, ".svelte-kit", "generated", "client", "nodes", "1.js"),
				"utf8",
			);
			const generated_sv_route = await read_file(
				join(fixture_dir, ".svelte-kit", "generated", "client", "nodes", "2.js"),
				"utf8",
			);
			const generated_svelte_route = await read_file(
				join(fixture_dir, ".svelte-kit", "generated", "client", "nodes", "3.js"),
				"utf8",
			);
			const generated_tsconfig = await read_file(
				join(fixture_dir, ".svelte-kit", "tsconfig.json"),
				"utf8",
			);

			expect(generated_layout).toContain("+layout.sv");
			expect(generated_error).toContain("+error.sv");
			expect(generated_sv_route).toContain("+page.sv");
			expect(generated_svelte_route).toContain("+page.svelte");
			expect(generated_tsconfig).toContain("../src/**/*.sv");

			const build_result = await run_vp(fixture_dir, ["build"]);

			expect(build_result.output).toContain("built");

			const root_html = await read_file(join(fixture_dir, "build", "index.html"), "utf8");
			const svelte_route_html = await read_file(
				join(fixture_dir, "build", "svelte-route.html"),
				"utf8",
			);

			expect(root_html).toContain("SV route");
			expect(root_html).toContain("from .svelte");
			expect(root_html).toContain("from .sv");
			expect(svelte_route_html).toContain("Svelte route");
			expect(svelte_route_html).toContain("from .sv");
		} finally {
			await rm(fixture_dir, { force: true, recursive: true });
		}
	}, 120_000);
});

async function write_fixture(fixture_dir: string): Promise<void> {
	await write_text(
		fixture_dir,
		"package.json",
		`${JSON.stringify(
			{
				type: "module",
				private: true,
				dependencies: {
					"@sveltejs/adapter-static": "^3.0.0",
					"@sveltejs/kit": "^2.0.0",
					svelte: "^5.0.0",
					"svelte-sv-extension": `file:${package_root.replace(/\\/g, "/")}`,
					vite: "8.1.3",
				},
				devEngines: {
					packageManager: {
						name: "pnpm",
						version: "11.10.0",
						onFail: "download",
					},
				},
			},
			null,
			"\t",
		)}\n`,
	);

	await write_text(
		fixture_dir,
		"svelte.config.js",
		[
			'import adapter from "@sveltejs/adapter-static";',
			'import { sv } from "svelte-sv-extension";',
			"",
			"export default sv({",
			"\tkit: {",
			"\t\tadapter: adapter(),",
			"\t},",
			"});",
			"",
		].join("\n"),
	);

	await write_text(
		fixture_dir,
		"vite.config.ts",
		[
			'import { sveltekit } from "@sveltejs/kit/vite";',
			'import { defineConfig } from "vite";',
			"",
			"export default defineConfig({",
			"\tplugins: [sveltekit()],",
			"});",
			"",
		].join("\n"),
	);

	await write_text(
		fixture_dir,
		"tsconfig.json",
		`${JSON.stringify(
			{
				extends: "./.svelte-kit/tsconfig.json",
				compilerOptions: {
					allowJs: true,
					checkJs: true,
					esModuleInterop: true,
					forceConsistentCasingInFileNames: true,
					resolveJsonModule: true,
					skipLibCheck: true,
					sourceMap: true,
					strict: true,
					moduleResolution: "bundler",
				},
			},
			null,
			"\t",
		)}\n`,
	);

	await write_text(
		fixture_dir,
		"src/app.html",
		[
			"<!doctype html>",
			'<html lang="en">',
			"\t<head>",
			'\t\t<meta charset="utf-8" />',
			'\t\t<meta name="viewport" content="width=device-width, initial-scale=1" />',
			"\t\t%sveltekit.head%",
			"\t</head>",
			"\t<body>",
			"\t\t<div>%sveltekit.body%</div>",
			"\t</body>",
			"</html>",
			"",
		].join("\n"),
	);

	await write_text(
		fixture_dir,
		"src/routes/+layout.sv",
		[
			'<script lang="ts">',
			"\tlet { children } = $props();",
			"</script>",
			"",
			"{@render children()}",
			"",
		].join("\n"),
	);

	await write_text(fixture_dir, "src/routes/+layout.ts", "export const prerender = true;\n");

	await write_text(
		fixture_dir,
		"src/routes/+error.sv",
		[
			'<script lang="ts">',
			'\timport { page } from "$app/state";',
			"</script>",
			"",
			"<h1>{page.status}</h1>",
			"",
		].join("\n"),
	);

	await write_text(
		fixture_dir,
		"src/routes/+page.sv",
		[
			'<script lang="ts">',
			'\timport FromSvelte from "$lib/from-svelte.svelte";',
			'\timport FromSv from "$lib/from-sv.sv";',
			"</script>",
			"",
			"<h1>SV route</h1>",
			"<FromSvelte />",
			"<FromSv />",
			"",
		].join("\n"),
	);

	await write_text(
		fixture_dir,
		"src/routes/svelte-route/+page.svelte",
		[
			'<script lang="ts">',
			'\timport FromSv from "$lib/from-sv.sv";',
			"</script>",
			"",
			"<h1>Svelte route</h1>",
			"<FromSv />",
			"",
		].join("\n"),
	);

	await write_text(
		fixture_dir,
		"src/lib/from-svelte.svelte",
		[
			'<script lang="ts">',
			'\timport NestedSv from "./nested-sv.sv";',
			"</script>",
			"",
			"<p>from .svelte</p>",
			"<NestedSv />",
			"",
		].join("\n"),
	);

	await write_text(
		fixture_dir,
		"src/lib/from-sv.sv",
		[
			'<script lang="ts">',
			'\timport NestedSvelte from "./nested-svelte.svelte";',
			"</script>",
			"",
			"<p>from .sv</p>",
			"<NestedSvelte />",
			"",
		].join("\n"),
	);

	await write_text(fixture_dir, "src/lib/nested-sv.sv", "<span>nested sv</span>\n");

	await write_text(fixture_dir, "src/lib/nested-svelte.svelte", "<span>nested svelte</span>\n");
}

async function write_text(root: string, path: string, content: string): Promise<void> {
	const file_path = join(root, path);

	await mkdir(dirname(file_path), { recursive: true });
	await write_file(file_path, content);
}

async function run_vp(cwd: string, args: string[]): Promise<{ code: number; output: string }> {
	return run_command(vp_bin, cwd, args);
}

async function run_command(
	command: string,
	cwd: string,
	args: string[],
): Promise<{ code: number; output: string }> {
	const result = await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
		const child = spawn(command, args, {
			cwd,
			env: {
				...process.env,
				NODE_PATH: [join(cwd, "node_modules"), process.env.NODE_PATH]
					.filter(Boolean)
					.join(delimiter),
			},
			stdio: ["ignore", "pipe", "pipe"],
		});

		let output = "";

		child.stdout.on("data", (chunk: Buffer) => {
			output += chunk.toString();
		});

		child.stderr.on("data", (chunk: Buffer) => {
			output += chunk.toString();
		});

		child.on("error", reject);
		child.on("close", (code: number | null) => {
			resolve({ code, output });
		});
	});

	if (result.code !== 0) {
		throw new Error(`${command} ${args.join(" ")} failed:\n${result.output}`);
	}

	return {
		code: result.code,
		output: result.output,
	};
}
