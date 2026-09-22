# Defining Tools

`Tool.define(config)` builds a `ToolPlugin` from a config object. The config holds the name, the description, the JSON Schema for parameters, and the execute function.

## Signature

```typescript
// Build a ToolPlugin from a config
const plugin: ToolPlugin = Tool.define({
  name: 'tool_name',
  description: 'What the tool does',
  parameters: {
    type: 'object',
    properties: {/* argument fields */},
    required: []
  },
  execute(args, signal?, emit?) {
    return { success: true, json: {/* structured output */}, text: 'Summary' }
  }
})
```

| Property      | Type            | Required | Description                                                                        |
| :------------ | :-------------- | :------- | :--------------------------------------------------------------------------------- |
| `name`        | `string`        | Yes      | Function name that the model will call                                             |
| `description` | `string`        | Yes      | Plain text explanation that the model reads                                        |
| `parameters`  | `ToolSchema`    | No       | JSON Schema object for arguments, defaults to `{ type: 'object', properties: {} }` |
| `execute`     | `ToolExecuteFn` | Yes      | The function that runs when the tool is called                                     |

When `parameters` is omitted, the wrapper fills in `{ type: 'object', properties: {} }` so the resulting schema is always a valid JSON Schema object.

## Execute Function

```typescript
// Sync execute that returns a result directly
Tool.define({
  name: 'sync_tool',
  description: 'Returns immediately',
  execute(args) {
    return { success: true, json: { ok: true }, text: 'Done' }
  }
})

// Async execute that returns a Promise
Tool.define({
  name: 'async_tool',
  description: 'Awaits a Promise',
  async execute(args, signal, emit) {
    const value = await fetchSomething(args, signal)
    return { success: true, json: { value }, text: 'Fetched' }
  }
})
```

| Parameter | Type                             | Description                                              |
| :-------- | :------------------------------- | :------------------------------------------------------- |
| `args`    | `Record<string, unknown>`        | Arguments from the model, validated against `parameters` |
| `signal`  | `AbortSignal \| undefined`       | Optional signal to cancel long running work              |
| `emit`    | `ToolEventCallback \| undefined` | Optional callback that the execute function may invoke   |

The execute function may return a `ToolResult` directly or a `Promise<ToolResult>`. Both forms are accepted and behave the same way once the wrapper resolves the promise.

The emit callback receives `unknown` so the execute function decides the shape of the event payload. The wrapper passes the callback through as is.

## Minimal Tool

```typescript
// Define a tool without parameters and without arguments
const ping: ToolPlugin = Tool.define({
  name: 'ping',
  description: 'Reply pong',
  execute() {
    return { success: true, json: { pong: true }, text: 'pong' }
  }
})

console.log(ping.schema)
// {
//   type: 'function',
//   function: {
//     name: 'ping',
//     description: 'Reply pong',
//     parameters: { type: 'object', properties: {} }
//   }
// }
```

## Multiple Tools

```typescript
// Build an array of plugins for an API call
const plugins: ToolPlugin[] = [
  Tool.define({
    name: 'add',
    description: 'Add two numbers',
    parameters: {
      type: 'object',
      properties: {
        a: { type: 'number' },
        b: { type: 'number' }
      },
      required: ['a', 'b']
    },
    execute(args) {
      const a = Number(args['a'])
      const b = Number(args['b'])
      return { success: true, json: { sum: a + b }, text: `${a} + ${b} = ${a + b}` }
    }
  }),
  Tool.define({
    name: 'subtract',
    description: 'Subtract two numbers',
    parameters: {
      type: 'object',
      properties: {
        a: { type: 'number' },
        b: { type: 'number' }
      },
      required: ['a', 'b']
    },
    execute(args) {
      const a = Number(args['a'])
      const b = Number(args['b'])
      return { success: true, json: { diff: a - b }, text: `${a} - ${b} = ${a - b}` }
    }
  })
]
```

## Validation

Validation against `parameters` is the responsibility of the execute function. The most common pattern is to read fields with bracket notation and to fall back to safe defaults when a field is missing.

```typescript
// Read fields safely from args
Tool.define({
  name: 'safe_read',
  description: 'Reads fields with fallback',
  execute(args) {
    const city = String(args['city'] ?? 'Jakarta')
    return { success: true, json: { city }, text: city }
  }
})
```
