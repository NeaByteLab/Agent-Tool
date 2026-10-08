<div align="center">

# Agent Tool

Helper that wraps functions into agent tool plugin instances

[![Deno](https://img.shields.io/badge/deno-compatible-ffcb00?logo=deno&logoColor=000000)](https://deno.com) [![Node](https://img.shields.io/badge/node-%3E%3D24-6DA55F?logo=node.js&logoColor=white)](https://nodejs.org) [![Bun](https://img.shields.io/badge/bun-compatible-f9f1e1?logo=bun&logoColor=000000)](https://bun.sh) [![Browser](https://img.shields.io/badge/browser-compatible-4285F4?logo=googlechrome&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

</div>

## Installation

**Deno:**

```bash
deno add npm:@neabyte/agent-tool
```

**npm:**

```bash
npm install @neabyte/agent-tool
```

**CDN (jsDelivr/esm.sh):**

```html
<script type="module">
  import Tool from 'https://cdn.jsdelivr.net/npm/@neabyte/agent-tool/dist/index.mjs'
</script>
```

Or via [esm.sh](https://esm.sh):

```html
<script type="module">
  import Tool from 'https://esm.sh/@neabyte/agent-tool'
</script>
```

## Quick Start

Import the default export, define a tool with name, description, schema, and handler, then call `execute` with input and an optional signal.

```typescript
import Tool, { type ToolPlugin } from '@neabyte/agent-tool'

// Define a tool that returns the weather for a city
const weather: ToolPlugin = Tool.define({
  name: 'get_weather',
  description: 'Get the current weather for a city',
  parameters: {
    type: 'object',
    properties: {
      city: { type: 'string' }
    },
    required: ['city']
  },
  execute(args) {
    return {
      success: true,
      json: { temp: 28, condition: 'sunny' },
      text: 'Sunny, 28C'
    }
  }
})

// Inspect the JSON Schema that the API consumes
console.log(weather.schema)

// Call the tool with input, optional signal, and optional event callback
const result = await weather.execute({ city: 'Jakarta' })
console.log(result.text)
```

Read [`docs/README.md`](./docs/README.md) for full API reference, schema shapes, abort flows, and type definitions.

## Build and Test

> [!NOTE]
> **Prerequisites:** [Deno](https://deno.com/) for all development tasks.

**Check** - format, lint, and typecheck source:

```bash
deno task check
```

**Unit tests** - run all tests:

```bash
deno task test
```

## Docs

- [Defining Tools](./docs/defining.md) - `Tool.define()` configuration shape and execute function contract
- [Executing Tools](./docs/executing.md) - `ToolPlugin.execute()` flow, abort handling, error translation
- [Schemas](./docs/schemas.md) - `ToolDef` union, OpenAI flat and nested layouts, Anthropic layout

## Reference

- [Anthropic Tool Use](https://docs.anthropic.com/en/docs/tool-use) - Anthropic Messages API tool use reference
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling) - OpenAI tool calling reference for function definitions
- [JSON Schema Specification](https://json-schema.org/specification) - The schema vocabulary used by `ToolSchema`

## License

Code in this repository is licensed under [Apache 2.0](./LICENSE), documentation is licensed under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/).
