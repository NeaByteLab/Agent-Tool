# Agent Tool

Small helper that wraps a function so the function can be called as a tool with an `AbortSignal` and an event callback. The helper exposes a JSON Schema description that any chat completion or response API can consume.

## Quick Start

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

## Public Surface

The package exports a default class `Tool` and re-exports every interface and type from `src/types.ts`.

| Export                | Kind   | Description                                      |
| :-------------------- | :----- | :----------------------------------------------- |
| `Tool`                | class  | Default export with the single static method     |
| `Tool.define()`       | method | Build a `ToolPlugin` from a config object        |
| `ToolPlugin`          | type   | Return type of `Tool.define()`                   |
| `ToolDefineOptions`   | type   | Argument shape of `Tool.define()`                |
| `ToolExecuteFn`       | type   | Signature for the user supplied execute function |
| `ToolResult`          | type   | Output shape returned by `ToolPlugin.execute()`  |
| `ToolDef`             | type   | Union of all supported JSON Schema shapes        |
| `ToolOpenAIDef`       | type   | Schema with the nested `function` object         |
| `ToolFlatFunctionDef` | type   | Schema with a flat function layout               |
| `ToolAnthropicDef`    | type   | Schema that uses `input_schema` instead          |
| `ToolFunctionCore`    | type   | Common function fields shared across shapes      |
| `ToolSchema`          | type   | JSON Schema object for parameters                |
| `ToolPropertySchema`  | type   | A single property inside `ToolSchema`            |
| `ToolEventCallback`   | type   | Callback signature for emitting events           |

## Public Methods

| Method          | Returns      | Description                                      |
| :-------------- | :----------- | :----------------------------------------------- |
| `Tool.define()` | `ToolPlugin` | Build a tool from name, description, and execute |

## ToolPlugin Shape

| Property  | Type                                             | Description                                               |
| :-------- | :----------------------------------------------- | :-------------------------------------------------------- |
| `schema`  | `ToolDef`                                        | JSON Schema description of the tool                       |
| `execute` | `(input, signal?, emit?) => Promise<ToolResult>` | Call the tool with input and optional signal and callback |

The `schema` value is always the `ToolOpenAIDef` shape at runtime even though the static type is the wider `ToolDef` union. The wrapper always emits the nested `function` form because every API can read it as is, and the consumer can convert to the `ToolFlatFunctionDef` or `ToolAnthropicDef` form when needed.

## ToolResult Shape

| Field     | Type                              | Description                                   |
| :-------- | :-------------------------------- | :-------------------------------------------- |
| `success` | `boolean`                         | Whether the execute function finished cleanly |
| `json`    | `Record<string, unknown> \| null` | Structured payload for machine consumption    |
| `text`    | `string \| null`                  | Human readable summary or error message       |

When the execute function returns a value, the wrapper passes the value through as the resolved `ToolResult`. When the execute function throws or the signal aborts, the wrapper builds the result itself with `success` set to false.

## Abort Behavior

| Trigger                                  | Result                                                                                                                                         |
| :--------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| `signal` is already aborted on entry     | `{ success: false, json: null, text: signal.reason ?? 'Aborted' }`                                                                             |
| `signal` aborts while async execute runs | The async execute gets raced against an abort listener, the wrapper returns `{ success: false, json: null, text: signal.reason ?? 'Aborted' }` |
| `signal` aborts after execute resolves   | The wrapper detects the flag and returns the same aborted shape                                                                                |
| User execute throws a non abort error    | The wrapper returns `{ success: false, json: null, text: error.message }`                                                                      |
| User execute throws while aborted        | The wrapper returns the aborted shape and ignores the thrown error                                                                             |

The race listener creates a `DOMException` with the message equal to `signal.reason ?? 'Aborted'` and the name `AbortError`, so callers that catch by name still see the right error.
