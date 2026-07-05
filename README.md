# svelte-sv-extension

Use `.sv` files as Svelte components.

`svelte-sv-extension` is a tiny SvelteKit config helper. It keeps normal
`.svelte` files working and also lets the official Svelte compiler pipeline
handle `.sv` files, including route components such as `+page.sv`.

## Install

```sh
npm install -D svelte-sv-extension
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
