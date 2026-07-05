import { assertEquals, assertStringIncludes } from "@std/assert";
import { ensureDir } from "@std/fs";
import { dirname, fromFileUrl, join } from "@std/path";

const repo_root = dirname(fromFileUrl(import.meta.url));
const package_root = dirname(repo_root);

Deno.test("SvelteKit builds .sv routes and cross-extension component imports", async () => {
  const fixture_dir = await Deno.makeTempDir({
    prefix: "svelte-sv-extension-",
  });

  try {
    await write_fixture(fixture_dir);

    const sync_result = await run_deno(fixture_dir, [
      "run",
      "-A",
      "npm:@sveltejs/kit@^2.0.0",
      "sync",
    ]);

    assertEquals(sync_result.code, 0, sync_result.output);

    const generated_layout = await Deno.readTextFile(
      join(fixture_dir, ".svelte-kit", "generated", "client", "nodes", "0.js"),
    );
    const generated_error = await Deno.readTextFile(
      join(fixture_dir, ".svelte-kit", "generated", "client", "nodes", "1.js"),
    );
    const generated_sv_route = await Deno.readTextFile(
      join(fixture_dir, ".svelte-kit", "generated", "client", "nodes", "2.js"),
    );
    const generated_svelte_route = await Deno.readTextFile(
      join(fixture_dir, ".svelte-kit", "generated", "client", "nodes", "3.js"),
    );
    const generated_tsconfig = await Deno.readTextFile(
      join(fixture_dir, ".svelte-kit", "tsconfig.json"),
    );

    assertStringIncludes(generated_layout, "+layout.sv");
    assertStringIncludes(generated_error, "+error.sv");
    assertStringIncludes(generated_sv_route, "+page.sv");
    assertStringIncludes(generated_svelte_route, "+page.svelte");
    assertStringIncludes(generated_tsconfig, "../src/**/*.sv");

    const build_result = await run_deno(fixture_dir, [
      "run",
      "-A",
      "npm:vite@^8.0.0",
      "build",
    ]);

    assertEquals(build_result.code, 0, build_result.output);
    assertStringIncludes(build_result.output, "built");

    const root_html = await Deno.readTextFile(
      join(fixture_dir, "build", "index.html"),
    );
    const svelte_route_html = await Deno.readTextFile(
      join(fixture_dir, "build", "svelte-route.html"),
    );

    assertStringIncludes(root_html, "SV route");
    assertStringIncludes(root_html, "from .svelte");
    assertStringIncludes(root_html, "from .sv");
    assertStringIncludes(svelte_route_html, "Svelte route");
    assertStringIncludes(svelte_route_html, "from .sv");
  } finally {
    await Deno.remove(fixture_dir, { recursive: true });
  }
});

async function write_fixture(fixture_dir: string): Promise<void> {
  const root_import = to_file_import(join(package_root, "src", "mod.js"));

  await write_text(
    fixture_dir,
    "package.json",
    JSON.stringify(
      {
        type: "module",
        private: true,
        dependencies: {
          "@sveltejs/adapter-static": "^3.0.0",
          "@sveltejs/kit": "^2.0.0",
          "svelte": "^5.0.0",
          "vite": "^8.0.0",
        },
        devDependencies: {},
      },
      null,
      2,
    ) + "\n",
  );

  await write_text(
    fixture_dir,
    "deno.json",
    JSON.stringify(
      {
        nodeModulesDir: "auto",
      },
      null,
      2,
    ) + "\n",
  );

  await write_text(
    fixture_dir,
    "svelte.config.js",
    [
      'import adapter from "@sveltejs/adapter-static";',
      `import { sv } from "${root_import}";`,
      "",
      "export default sv({",
      "  kit: {",
      "    adapter: adapter(),",
      "  },",
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
      "  plugins: [sveltekit()],",
      "});",
      "",
    ].join("\n"),
  );

  await write_text(
    fixture_dir,
    "tsconfig.json",
    JSON.stringify(
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
      2,
    ) + "\n",
  );

  await write_text(
    fixture_dir,
    "src/app.html",
    [
      "<!doctype html>",
      '<html lang="en">',
      "  <head>",
      '    <meta charset="utf-8" />',
      '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
      "    %sveltekit.head%",
      "  </head>",
      "  <body>",
      "    <div>%sveltekit.body%</div>",
      "  </body>",
      "</html>",
      "",
    ].join("\n"),
  );

  await write_text(
    fixture_dir,
    "src/routes/+layout.sv",
    [
      '<script lang="ts">',
      "  let { children } = $props();",
      "</script>",
      "",
      "{@render children()}",
      "",
    ].join("\n"),
  );

  await write_text(
    fixture_dir,
    "src/routes/+layout.ts",
    "export const prerender = true;\n",
  );

  await write_text(
    fixture_dir,
    "src/routes/+error.sv",
    [
      '<script lang="ts">',
      '  import { page } from "$app/state";',
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
      '  import FromSvelte from "$lib/from-svelte.svelte";',
      '  import FromSv from "$lib/from-sv.sv";',
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
      '  import FromSv from "$lib/from-sv.sv";',
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
      '  import NestedSv from "./nested-sv.sv";',
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
      '  import NestedSvelte from "./nested-svelte.svelte";',
      "</script>",
      "",
      "<p>from .sv</p>",
      "<NestedSvelte />",
      "",
    ].join("\n"),
  );

  await write_text(
    fixture_dir,
    "src/lib/nested-sv.sv",
    "<span>nested sv</span>\n",
  );

  await write_text(
    fixture_dir,
    "src/lib/nested-svelte.svelte",
    "<span>nested svelte</span>\n",
  );
}

async function write_text(
  root: string,
  path: string,
  content: string,
): Promise<void> {
  const file_path = join(root, path);

  await ensureDir(dirname(file_path));
  await Deno.writeTextFile(file_path, content);
}

async function run_deno(
  cwd: string,
  args: string[],
): Promise<{ code: number; output: string }> {
  const command = new Deno.Command(Deno.execPath(), {
    args,
    cwd,
    stdout: "piped",
    stderr: "piped",
  });

  const output = await command.output();
  const stdout = new TextDecoder().decode(output.stdout);
  const stderr = new TextDecoder().decode(output.stderr);

  return {
    code: output.code,
    output: `${stdout}${stderr}`,
  };
}

function to_file_import(path: string): string {
  return `file:///${path.replace(/\\/g, "/").replace(/^([A-Za-z]):/, "$1:")}`;
}
