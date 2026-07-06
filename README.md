# svelte-sv-extension

Use `.sv` files as Svelte components.

`svelte-sv-extension` is a tiny SvelteKit config helper. It keeps normal
`.svelte` files working and also lets the official Svelte compiler pipeline
handle `.sv` files, including route components such as `+page.sv`.

## Install

```sh
pnpm add -D svelte-sv-extension
```

## Setup

Wrap your Svelte config:

```ts
import adapter from "@sveltejs/adapter-auto";
import { sv } from "svelte-sv-extension";

export default sv({
	kit: {
		adapter: adapter(),
	},
});
```

That is it. `.svelte` and `.sv` can now live side by side:

```svelte
<script>
  import Button from "$lib/button.sv";
  import Card from "$lib/card.svelte";
</script>
```

### With `svelte-plugin-composer`

When your project uses `svelte-plugin-composer`, put `sv()` in the composed
plugin list and keep `kit(...)` as the final SvelteKit handoff:

```ts
import adapter from "@sveltejs/adapter-auto";
import { sv } from "svelte-sv-extension";
import { compose, kit } from "svelte-plugin-composer";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: compose([sv(), kit({ adapter: adapter() })]),
});
```

The composer merges the extension list into the config passed to SvelteKit.

## Editor Setup

Build tooling and editor language modes are separate. This package makes
SvelteKit and Vite compile `.sv` files, but VS Code and Cursor still need to
know that `*.sv` should use the Svelte language mode.

Run the init command:

```sh
pnpm exec svelte-sv-extension init
```

That writes `.vscode/settings.json` for the current project. To apply the same
setting globally, pass `--global` and choose the editor:

```sh
pnpm exec svelte-sv-extension init --global --editor cursor
```

Supported editors are `vscode`, `vscode-insiders`, `cursor`, `vscodium`, and
`windsurf` on macOS, Windows, and Linux.

The command writes this workspace setting by default:

```json
{
	"files.associations": {
		"*.sv": "svelte"
	}
}
```

After that, reopen the file or restart the Svelte language server.

## Routes

SvelteKit route components can use either extension:

```txt
src/routes/+page.sv
src/routes/settings/+layout.sv
src/routes/+error.sv
src/routes/about/+page.svelte
```

If both `+page.svelte` and `+page.sv` exist in the same route folder, SvelteKit
will report the same duplicate route component error it reports for other
duplicate route files.

## Why A Config Helper?

Svelte and SvelteKit already know how to compile custom component extensions
through the official `extensions` config option. This package only adds:

```ts
extensions: [".svelte", ".sv"];
```

while preserving the rest of your config.

Explicit imports like `./Button.sv` are recommended. The package does not add
`.sv` to Vite's extensionless resolver.
