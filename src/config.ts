import type { Config } from "@sveltejs/kit";

const default_extensions = [".svelte", ".sv"] as const;

type TsConfig = Record<string, unknown>;
type TsConfigHook = (config: TsConfig) => TsConfig | void;
type KitConfig = NonNullable<Config["kit"]>;
type TypescriptConfig = NonNullable<KitConfig["typescript"]>;
type SvKitConfig = KitConfig & {
	typescript: TypescriptConfig & {
		config: TsConfigHook;
	};
};

/**
 * Svelte config returned by {@link sv}. It preserves every field from the
 * caller's config while ensuring the component extension list is concrete.
 *
 * @example
 * ```ts
 * const config: SvConfig<Config> = sv({
 *   kit: {
 *     appDir: "app",
 *   },
 * });
 * ```
 *
 * @since 0.1.0
 * @typeParam T - Svelte config shape supplied by the caller.
 */
export type SvConfig<T extends Config = Config> = Omit<T, "extensions" | "kit"> & {
	extensions: string[];
	kit: SvKitConfig;
};

/**
 * Adds `.sv` as a Svelte component extension while preserving `.svelte` and
 * the rest of the supplied SvelteKit configuration.
 *
 * @example
 * ```ts
 * import adapter from "@sveltejs/adapter-auto";
 * import { sv } from "svelte-sv-extension";
 *
 * export default sv({
 *   kit: {
 *     adapter: adapter(),
 *   },
 * });
 * ```
 *
 * @since 0.1.0
 * @typeParam T - Svelte config shape supplied by the caller.
 * @param config - Existing SvelteKit or Svelte config to extend.
 * @returns A shallow copy of the config with `.svelte` and `.sv` extensions enabled.
 */
export function sv<T extends Config = Config>(config: T = {} as T): SvConfig<T> {
	const extensions = merge_extensions(config.extensions ?? []);
	const kit = config.kit ?? {};
	const typescript = kit.typescript ?? {};
	const user_tsconfig_hook = typescript.config as TsConfigHook | undefined;

	const configured = {
		...config,
		extensions,
		kit: {
			...kit,
			typescript: {
				...typescript,
				config: make_tsconfig_hook(user_tsconfig_hook),
			},
		},
	};

	return configured as unknown as SvConfig<T>;
}

function merge_extensions(extensions: readonly string[]): string[] {
	return [
		...extensions,
		...default_extensions.filter((extension) => !extensions.includes(extension)),
	];
}

function make_tsconfig_hook(user_hook: TsConfigHook | undefined): TsConfigHook {
	return (config) => {
		const configured = user_hook?.(config) ?? config;

		return add_sv_includes(configured);
	};
}

function add_sv_includes(config: TsConfig): TsConfig {
	const include = Array.isArray(config.include) ? config.include : [];
	const next_include = [...include];

	for (const entry of include) {
		if (typeof entry !== "string" || !entry.endsWith(".svelte")) {
			continue;
		}

		const sv_entry = entry.slice(0, -".svelte".length) + ".sv";

		if (next_include.includes(sv_entry)) {
			continue;
		}

		next_include.push(sv_entry);
	}

	return {
		...config,
		include: next_include,
	};
}
