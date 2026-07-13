<h1 align="center">svelte-sv-extension</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/svelte-sv-extension">npm</a>
  •
  <a href="https://docs.barekey.dev/sv-extension">docs</a>
</p>

---

Give Svelte components and routes the shorter `.sv` extension.

```ts
import adapter from "@sveltejs/adapter-auto";
import { sv } from "svelte-sv-extension";

export default sv({
	kit: {
		adapter: adapter(),
	},
});
```

`sv()` preserves your existing SvelteKit config, enables `.svelte` and `.sv` side by side, and mirrors generated TypeScript include patterns from `.svelte` to `.sv`. Components, explicit imports, and route files such as `+page.sv` then use Svelte's normal compiler pipeline.

Visit the **[docs](https://docs.barekey.dev/sv-extension)** for installation, composer setup, editor configuration, route examples, and API reference.
