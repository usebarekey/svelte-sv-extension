import { sv } from "../src/mod";
import { describe, expect, test } from "vitest";

describe("sv", () => {
	test("enables .svelte and .sv by default", () => {
		const config = sv({});

		expect(config.extensions).toEqual([".svelte", ".sv"]);
	});

	test("preserves .svelte and appends .sv once", () => {
		const config = sv({
			extensions: [".svelte"],
		});

		expect(config.extensions).toEqual([".svelte", ".sv"]);
	});

	test("preserves custom extensions", () => {
		const config = sv({
			extensions: [".svelte", ".md"],
		});

		expect(config.extensions).toEqual([".svelte", ".md", ".sv"]);
	});

	test("does not duplicate .sv", () => {
		const config = sv({
			extensions: [".svelte", ".sv"],
		});

		expect(config.extensions).toEqual([".svelte", ".sv"]);
	});

	test("preserves fields without mutating the input config", () => {
		const kit = { appDir: "app" };
		const vite_plugin = { inspector: true };
		const config = {
			extensions: [".svelte"],
			kit,
			vitePlugin: vite_plugin,
			custom: "value",
		};

		const result = sv(config);

		expect(result).not.toBe(config);
		expect(result.kit).not.toBe(kit);
		expect(result.kit.appDir).toBe("app");
		expect(result.vitePlugin).toBe(vite_plugin);
		expect(result.custom).toBe("value");
		expect(config.extensions).toEqual([".svelte"]);
		expect(result.extensions).toEqual([".svelte", ".sv"]);
	});

	test("includes .sv files in SvelteKit's generated tsconfig", () => {
		const config = sv({});
		const configure_typescript = config.kit.typescript?.config;

		expect(configure_typescript).toBeDefined();

		const tsconfig = configure_typescript?.({
			include: ["../src/**/*.ts", "../src/**/*.svelte", "../tests/**/*.svelte"],
		});

		expect(tsconfig?.include).toEqual([
			"../src/**/*.ts",
			"../src/**/*.svelte",
			"../tests/**/*.svelte",
			"../src/**/*.sv",
			"../tests/**/*.sv",
		]);
	});

	test("preserves and composes an existing TypeScript config hook", () => {
		const config = sv({
			kit: {
				typescript: {
					config: (tsconfig) => ({
						...tsconfig,
						include: [
							...(Array.isArray(tsconfig.include) ? tsconfig.include : []),
							"../custom/**/*.svelte",
						],
					}),
				},
			},
		});
		const configure_typescript = config.kit.typescript?.config;

		expect(configure_typescript).toBeDefined();

		const tsconfig = configure_typescript?.({
			include: ["../src/**/*.svelte"],
		});

		expect(tsconfig?.include).toEqual([
			"../src/**/*.svelte",
			"../custom/**/*.svelte",
			"../src/**/*.sv",
			"../custom/**/*.sv",
		]);
	});
});
