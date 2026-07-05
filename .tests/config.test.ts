import { assert, assertEquals, assertExists } from "@std/assert";
import { sv } from "../src/mod.ts";

Deno.test("sv enables .svelte and .sv by default", () => {
  const config = sv({});

  assertEquals(config.extensions, [".svelte", ".sv"]);
});

Deno.test("sv preserves .svelte and appends .sv once", () => {
  const config = sv({
    extensions: [".svelte"],
  });

  assertEquals(config.extensions, [".svelte", ".sv"]);
});

Deno.test("sv preserves custom extensions", () => {
  const config = sv({
    extensions: [".svelte", ".md"],
  });

  assertEquals(config.extensions, [".svelte", ".md", ".sv"]);
});

Deno.test("sv does not duplicate .sv", () => {
  const config = sv({
    extensions: [".svelte", ".sv"],
  });

  assertEquals(config.extensions, [".svelte", ".sv"]);
});

Deno.test("sv preserves fields without mutating the input config", () => {
  const kit = { appDir: "app" };
  const vitePlugin = { inspector: true };
  const config = {
    extensions: [".svelte"],
    kit,
    vitePlugin,
    custom: "value",
  };

  const result = sv(config);

  assert(result !== config);
  assert(result.kit !== kit);
  assertEquals(result.kit.appDir, "app");
  assertEquals(result.vitePlugin, vitePlugin);
  assertEquals(result.custom, "value");
  assertEquals(config.extensions, [".svelte"]);
  assertEquals(result.extensions, [".svelte", ".sv"]);
});

Deno.test("sv includes .sv files in SvelteKit's generated tsconfig", () => {
  const config = sv({});
  const configure_typescript = config.kit.typescript?.config;

  assertExists(configure_typescript);

  const tsconfig = configure_typescript({
    include: [
      "../src/**/*.ts",
      "../src/**/*.svelte",
      "../tests/**/*.svelte",
    ],
  });

  assertEquals(tsconfig?.include, [
    "../src/**/*.ts",
    "../src/**/*.svelte",
    "../tests/**/*.svelte",
    "../src/**/*.sv",
    "../tests/**/*.sv",
  ]);
});

Deno.test("sv preserves and composes an existing TypeScript config hook", () => {
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

  assertExists(configure_typescript);

  const tsconfig = configure_typescript({
    include: ["../src/**/*.svelte"],
  });

  assertEquals(tsconfig?.include, [
    "../src/**/*.svelte",
    "../custom/**/*.svelte",
    "../src/**/*.sv",
    "../custom/**/*.sv",
  ]);
});
