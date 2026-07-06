export default {
	fmt: {
		ignorePatterns: [
			".dist/**",
			".svelte-kit/**",
			".vite/**",
			"build/**",
			"coverage/**",
			"node_modules/**",
		],
		tabWidth: 4,
		useTabs: true,
	},
	lint: {
		ignorePatterns: [
			".dist/**",
			".svelte-kit/**",
			".vite/**",
			"build/**",
			"coverage/**",
			"node_modules/**",
		],
		options: { typeAware: true, typeCheck: true },
	},
	pack: {
		dts: false,
		entry: ["src/mod.ts", "src/config.ts", "src/init.ts", "src/cli.ts"],
		format: ["esm"],
		outDir: ".dist",
		sourcemap: true,
	},
};
