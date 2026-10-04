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
| `ToolFlatFunctionDef` | Flat object with name, description, and parameters              | OpenAI legacy `functions` parameter, local LLMs/gateways  |
| `ToolAnthropicDef`    | Flat layout with `input_schema` instead of `parameters`         | Anthropic Messages API                                    |

The `ToolOpenAIDef` format wraps function fields inside a nested object with `type: 'function'`. `ToolFlatFunctionDef` provides a direct function description, and `ToolAnthropicDef` exposes fields required by Anthropic's Messages API.

## Shape Examples

The three sections below show the same tool rendered in each of the three shapes, so the diff between layouts is visible at a glance. Each block declares its own `core` so the snippet runs on its own.

```typescript
// Function core shared by every shape
const core = {
  name: 'get_weather',
  description: 'Get current weather for a city',
  parameters: {
    type: 'object' as const,
    properties: { city: { type: 'string' as const, description: 'City name' } },
    required: ['city']
  }
}
```

### ToolOpenAIDef

```typescript
// The default shape produced by Tool.define() or plugin.toOpenAI()
const core = {
  name: 'get_weather',
  description: 'Get current weather for a city',
  parameters: {
    type: 'object' as const,
    properties: { city: { type: 'string' as const, description: 'City name' } },
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
| `function.strict`      | `boolean`          | Optional flag to enforce structured output compliance              |

This is the shape that `Tool.define()` returns in `plugin.schema` and `plugin.toOpenAI()`. When the target API consumes the OpenAI style, pass this schema.

### ToolFlatFunctionDef

```typescript
// Unwrapped function layout, produced by plugin.toFlatFunction()
const core = {
  name: 'get_weather',
  description: 'Get current weather for a city',
  parameters: {
    type: 'object' as const,
    properties: { city: { type: 'string' as const, description: 'City name' } },
    required: ['city']
  }
}
const flat: ToolFlatFunctionDef = {
  ...core
}
```

| Field         | Type         | Description                                           |
| :------------ | :----------- | :---------------------------------------------------- |
| `name`        | `string`     | Tool name                                             |
| `description` | `string`     | Tool description                                      |
| `parameters`  | `ToolSchema` | The JSON Schema for arguments                         |
| `strict`      | `boolean`    | Optional flag to enforce structured output compliance |

### ToolAnthropicDef

```typescript
// Anthropic style uses input_schema, produced by plugin.toAnthropic()
const core = {
  name: 'get_weather',
  description: 'Get current weather for a city',
  parameters: {
    type: 'object' as const,
    properties: { city: { type: 'string' as const, description: 'City name' } },
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

| Field            | Type                                              | Description                                           |
| :--------------- | :------------------------------------------------ | :---------------------------------------------------- |
| `name`           | `string`                                          | Tool name                                             |
| `description`    | `string`                                          | Tool description                                      |
| `input_schema`   | `ToolSchema`                                      | The JSON Schema for arguments                         |
| `input_examples` | `readonly Record<string, unknown>[] \| undefined` | Optional example payloads                             |
| `strict`         | `boolean \| undefined`                            | Optional flag to enforce structured output compliance |
| `cache_control`  | `ToolAnthropicCacheControl \| undefined`          | Optional ephemeral prompt caching configuration       |

## ToolSchema

`ToolSchema` is the JSON Schema object that describes the arguments. The wrapper accepts any object that matches this shape.

| Field                  | Type                                 | Description                              |
| :--------------------- | :----------------------------------- | :--------------------------------------- |
| `type`                 | `'object'`                           | Always `'object'` for tool arguments     |
| `properties`           | `Record<string, ToolPropertySchema>` | Map of property name to property schema  |
| `required`             | `readonly string[] \| undefined`     | Names of properties that must be present |
| `additionalProperties` | `boolean \| undefined`               | Whether extra properties are allowed     |

### ToolPropertySchema

Each entry under `properties` is a `ToolPropertySchema` that describes a single argument.

| Field                  | Type                                               | Description                                        |
| :--------------------- | :------------------------------------------------- | :------------------------------------------------- |
| `type`                 | `ToolPropertyType \| undefined`                    | JSON Schema type such as `'string'` or `'number'`  |
| `description`          | `string \| undefined`                              | Optional human readable description                |
| `enum`                 | `readonly (string \| number \| boolean \| null)[]` | Optional list of allowed enum values               |
| `default`              | `unknown`                                          | Optional default value                             |
| `items`                | `ToolPropertySchema \| Record<string, unknown>`    | Schema definition for array elements               |
| `properties`           | `Record<string, ToolPropertySchema> \| undefined`  | Schema definition for nested object properties     |
| `required`             | `readonly string[] \| undefined`                   | Required nested property names                     |
| `additionalProperties` | `boolean \| ToolPropertySchema \| undefined`       | Additional property constraints for nested objects |
| `anyOf`                | `readonly ToolPropertySchema[] \| undefined`       | Match any schema in array                          |
| `oneOf`                | `readonly ToolPropertySchema[] \| undefined`       | Match exactly one schema in array                  |
| `allOf`                | `readonly ToolPropertySchema[] \| undefined`       | Match all schemas in array                         |
| `minimum`              | `number \| undefined`                              | Minimum numeric limit                              |
| `maximum`              | `number \| undefined`                              | Maximum numeric limit                              |
| `pattern`              | `string \| undefined`                              | Regex constraint string                            |
| `nullable`             | `boolean \| undefined`                             | Whether field can accept null                      |

## ToolFunctionCore

`ToolFunctionCore` is the shared set of fields that appears on every shape that carries a function description.

| Field         | Type                   | Description                                           |
| :------------ | :--------------------- | :---------------------------------------------------- |
| `name`        | `string`               | Tool name                                             |
| `description` | `string \| undefined`  | Tool description                                      |
| `parameters`  | `ToolSchema`           | JSON Schema for arguments                             |
| `strict`      | `boolean \| undefined` | Optional flag to enforce structured output compliance |

`ToolOpenAIDef` holds one `ToolFunctionCore` under the `function` key. `ToolFlatFunctionDef` extends `ToolFunctionCore` directly.

## Full Example

```typescript
import Tool, {
  type ToolAnthropicDef,
  type ToolFlatFunctionDef,
  type ToolOpenAIDef,
  type ToolPlugin
} from '@neabyte/agent-tool'

// Build the plugin instance
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
  strict: true,
  execute(args) {
    return { success: true, json: { id: args['id'] }, text: 'ok' }
  }
})

// plugin.schema is ToolOpenAIDef
const openAi: ToolOpenAIDef = plugin.toOpenAI()

// Flat layout for legacy / compatible endpoints
const flat: ToolFlatFunctionDef = plugin.toFlatFunction()

// Anthropic layout for the Messages API
const anthropic: ToolAnthropicDef = plugin.toAnthropic()
```
