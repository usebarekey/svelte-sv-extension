const default_extensions = [".svelte", ".sv"];
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
 * @param config - Existing SvelteKit or Svelte config to extend.
 * @returns A shallow copy of the config with `.svelte` and `.sv` extensions enabled.
 */
export function sv(config = {}) {
  const extensions = merge_extensions(config.extensions ?? []);
  const kit = config.kit ?? {};
  const typescript = kit.typescript ?? {};
  const user_tsconfig_hook = typescript.config;
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
  return configured;
}
function merge_extensions(extensions) {
  return [
    ...extensions,
    ...default_extensions.filter((extension) =>
      !extensions.includes(extension)
    ),
  ];
}
function make_tsconfig_hook(user_hook) {
  return (config) => {
    const configured = user_hook?.(config) ?? config;
    return add_sv_includes(configured);
  };
}
function add_sv_includes(config) {
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
