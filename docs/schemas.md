# Schemas

`Tool.define()` produces a `ToolPlugin.schema` value of type `ToolDef`. `ToolDef` is the union of three schema shapes that cover the JSON Schema layouts used by the major LLM APIs. The wrapper always builds the `ToolOpenAIDef` shape at runtime because every API can read that shape as is, and the consumer converts it to one of the other two shapes when the target API expects them.

## ToolDef Union

```typescript
// The three supported schema shapes
export type ToolDef = ToolOpenAIDef | ToolFlatFunctionDef | ToolAnthropicDef
```

| Shape                 | Layout                                                          | Used by                                                   |
| :-------------------- | :-------------------------------------------------------------- | :-------------------------------------------------------- |
| `ToolOpenAIDef`       | Nested `function` object with name, description, and parameters | OpenAI Chat Completions, OpenAI Responses, most providers |
| `ToolFlatFunctionDef` | Top level `type: 'function'` plus the same function fields      | Endpoints that expect the flat layout                     |
| `ToolAnthropicDef`    | Flat layout with `input_schema` instead of `parameters`         | Anthropic Messages API                                    |

Every shape carries `type: 'function'` literally.

## Shape Examples

The three sections below show the same tool rendered in each of the three shapes, so the diff between layouts is visible at a glance. Each block declares its own `core` so the snippet runs on its own.

```typescript
// Function core shared by every shape
const core = {
  name: 'get_weather',
  description: 'Get current weather for a city',
  parameters: {
    type: 'object',
    properties: { city: { type: 'string', description: 'City name' } },
    required: ['city']
  }
}
```

### ToolOpenAIDef

```typescript
// The default shape produced by Tool.define()
const core = {
  name: 'get_weather',
  description: 'Get current weather for a city',
  parameters: {
    type: 'object',
    properties: { city: { type: 'string', description: 'City name' } },
    required: ['city']
  }
}
const schema: ToolOpenAIDef = {
  type: 'function',
  function: core
}
```

| Field                  | Type               | Description                                                        |
| :--------------------- | :----------------- | :----------------------------------------------------------------- |
| `type`                 | `'function'`       | Always the literal string `'function'`                             |
| `function`             | `ToolFunctionCore` | The function description in nested form                            |
| `function.name`        | `string`           | Tool name from the config                                          |
| `function.description` | `string`           | Tool description from the config                                   |
| `function.parameters`  | `ToolSchema`       | The JSON Schema for arguments, or the fallback empty object schema |

This is the shape that `Tool.define()` returns in `plugin.schema`. When the target API consumes the OpenAI style, pass `plugin.schema` directly.

### ToolFlatFunctionDef

```typescript
// Same fields as ToolOpenAIDef but without the nested wrapper
const core = {
  name: 'get_weather',
  description: 'Get current weather for a city',
  parameters: {
    type: 'object',
    properties: { city: { type: 'string', description: 'City name' } },
    required: ['city']
  }
}
const flat: ToolFlatFunctionDef = {
  type: 'function',
  ...core
}
```

| Field         | Type         | Description                            |
| :------------ | :----------- | :------------------------------------- |
| `type`        | `'function'` | Always the literal string `'function'` |
| `name`        | `string`     | Tool name                              |
| `description` | `string`     | Tool description                       |
| `parameters`  | `ToolSchema` | The JSON Schema for arguments          |

### ToolAnthropicDef

```typescript
// Anthropic style uses input_schema instead of parameters
const core = {
  name: 'get_weather',
  description: 'Get current weather for a city',
  parameters: {
    type: 'object',
    properties: { city: { type: 'string', description: 'City name' } },
    required: ['city']
  }
}
const anthropic: ToolAnthropicDef = {
  name: core.name,
  description: core.description,
  input_schema: core.parameters,
  input_examples: [{ city: 'Jakarta' }, { city: 'Tokyo' }]
}
```

| Field            | Type                                              | Description                   |
| :--------------- | :------------------------------------------------ | :---------------------------- |
| `name`           | `string`                                          | Tool name                     |
| `description`    | `string`                                          | Tool description              |
| `input_schema`   | `ToolSchema`                                      | The JSON Schema for arguments |
| `input_examples` | `readonly Record<string, unknown>[] \| undefined` | Optional example payloads     |

## ToolSchema

`ToolSchema` is the JSON Schema object that describes the arguments. The wrapper accepts any object that matches this shape.

| Field                  | Type                                 | Description                              |
| :--------------------- | :----------------------------------- | :--------------------------------------- |
| `type`                 | `string`                             | Always `'object'` for tool arguments     |
| `properties`           | `Record<string, ToolPropertySchema>` | Map of property name to property schema  |
| `required`             | `readonly string[] \| undefined`     | Names of properties that must be present |
| `additionalProperties` | `boolean \| undefined`               | Whether extra properties are allowed     |

### ToolPropertySchema

Each entry under `properties` is a `ToolPropertySchema` that describes a single argument.

| Field         | Type                             | Description                                       |
| :------------ | :------------------------------- | :------------------------------------------------ |
| `type`        | `string`                         | JSON Schema type such as `'string'` or `'number'` |
| `description` | `string \| undefined`            | Optional human readable description               |
| `enum`        | `readonly string[] \| undefined` | Optional list of allowed string values            |
| `default`     | `string \| undefined`            | Optional default value as a string                |

## ToolFunctionCore

`ToolFunctionCore` is the shared set of fields that appears on every shape that carries a function description.

| Field         | Type         | Description               |
| :------------ | :----------- | :------------------------ |
| `name`        | `string`     | Tool name                 |
| `description` | `string`     | Tool description          |
| `parameters`  | `ToolSchema` | JSON Schema for arguments |

`ToolOpenAIDef` holds one `ToolFunctionCore` under the `function` key. `ToolFlatFunctionDef` extends `ToolFunctionCore` directly. `ToolAnthropicDef` reads `input_schema` instead of `parameters` even though it extends `ToolFunctionCore`. The wrapper never uses the inherited `parameters` for the Anthropic shape.

## Full Example

```typescript
import Tool, {
  type ToolAnthropicDef,
  type ToolFlatFunctionDef,
  type ToolOpenAIDef,
  type ToolPlugin
} from '@neabyte/agent-tool'

// Build the default OpenAI style schema
const plugin: ToolPlugin = Tool.define({
  name: 'lookup',
  description: 'Look up an entity by id',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Entity id' }
    },
    required: ['id']
  },
  execute(args) {
    return { success: true, json: { id: args['id'] }, text: 'ok' }
  }
})

// plugin.schema is ToolOpenAIDef
const openAi: ToolOpenAIDef = plugin.schema as ToolOpenAIDef

// Flat layout for endpoints that expect the unwrapped form
const flat: ToolFlatFunctionDef = {
  type: 'function',
  ...openAi.function
}

// Anthropic layout for the Messages API
const anthropic: ToolAnthropicDef = {
  name: openAi.function.name,
  description: openAi.function.description,
  input_schema: openAi.function.parameters
}
```
