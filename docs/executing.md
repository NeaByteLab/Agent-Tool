# Executing Tools

`ToolPlugin.execute(input, signal?, emit?)` runs the wrapped function and returns a `Promise<ToolResult>`. The wrapper handles sync and async execute functions, AbortSignal cancellation, and error translation.

## Signature

```typescript
// Call a tool with optional signal and event callback
const plugin = Tool.define({
  name: 'lookup',
  description: 'Look up a city',
  execute(args) {
    return { success: true, json: { city: args['city'] }, text: 'ok' }
  }
})
const controller = new AbortController()
const result: ToolResult = await plugin.execute(
  { city: 'Jakarta' },
  controller.signal,
  (event) => console.log(event)
)
```

| Parameter | Type                             | Required | Description                                    |
| :-------- | :------------------------------- | :------- | :--------------------------------------------- |
| `input`   | `Record<string, unknown>`        | Yes      | Arguments passed to the execute function       |
| `signal`  | `AbortSignal \| undefined`       | No       | Cancel the execution through this signal       |
| `emit`    | `ToolEventCallback \| undefined` | No       | Receive events emitted by the execute function |

The return type is always `Promise<ToolResult>` even when the underlying execute function is synchronous, so every caller uses the same `await` pattern.

## Result Shape

```typescript
// Success result with structured payload and text summary
const ok: ToolResult = {
  success: true,
  json: { temp: 28, condition: 'sunny' },
  text: 'Sunny, 28C'
}

// Failure result from abort or thrown error
const fail: ToolResult = {
  success: false,
  json: null,
  text: 'reason string or error message'
}
```

| Field     | Type                                                                           | When present                            |
| :-------- | :----------------------------------------------------------------------------- | :-------------------------------------- |
| `success` | `true`                                                                         | The execute function returned a result  |
| `success` | `false`                                                                        | The signal aborted or the execute threw |
| `json`    | The value the execute function returned, or `null` on abort and error          |                                         |
| `text`    | The text the execute function returned, the abort reason, or the error message |                                         |

## Sync Execute

```typescript
// Sync execute returns a ToolResult directly
const plugin = Tool.define({
  name: 'double',
  description: 'Double a number',
  parameters: {
    type: 'object',
    properties: { n: { type: 'number' } },
    required: ['n']
  },
  execute(args) {
    const n = Number(args['n'])
    return { success: true, json: { value: n * 2 }, text: `${n} x 2 = ${n * 2}` }
  }
})

const result = await plugin.execute({ n: 21 })
console.log(result)
// { success: true, json: { value: 42 }, text: '21 x 2 = 42' }
```

## Async Execute

```typescript
// Async execute returns a Promise that the wrapper awaits
const plugin = Tool.define({
  name: 'fetch_user',
  description: 'Fetch a user record',
  parameters: {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id']
  },
  async execute(args, signal) {
    const response = await fetch(`/users/${args['id']}`, { signal })
    const json = await response.json()
    return { success: true, json, text: `Fetched user ${args['id']}` }
  }
})
```

## Event Callback

```typescript
// Receive progress events from inside the execute function
const plugin = Tool.define({
  name: 'process',
  description: 'Process a list of items',
  parameters: {
    type: 'object',
    properties: { items: { type: 'array' } },
    required: ['items']
  },
  execute(args, _signal, emit) {
    const items = Array.isArray(args['items']) ? args['items'] : []
    for (let i = 0; i < items.length; i++) {
      emit?.({ stage: 'progress', index: i, total: items.length })
    }
    return { success: true, json: { processed: items.length }, text: 'Done' }
  }
})

await plugin.execute({ items: ['a', 'b', 'c'] }, undefined, (event) => {
  console.log(event.stage, event.index, event.total)
})
```

The wrapper passes the callback straight through. The callback signature is `(event: unknown) => void` and the execute function chooses the shape of the event payload.

## AbortSignal

```typescript
// Pass an AbortSignal and abort from outside
const plugin = Tool.define({
  name: 'fetch',
  description: 'Fetch a record',
  async execute(args, signal) {
    return new Promise((resolve) => {
      const t = setTimeout(
        () => resolve({ success: true, json: { id: args['id'] }, text: 'ok' }),
        1000
      )
      signal?.addEventListener('abort', () => clearTimeout(t))
    })
  }
})
const controller = new AbortController()

const promise = plugin.execute({ id: '42' }, controller.signal)

setTimeout(() => controller.abort('User cancelled'), 100)

const result = await promise
console.log(result)
// { success: false, json: null, text: 'User cancelled' }
```

### Pre-Aborted Signal

When `signal.aborted` is already true on entry, the wrapper returns immediately with the aborted result and never calls the execute function.

```typescript
// Pre-aborted signal returns the aborted shape without running execute
const plugin = Tool.define({
  name: 'lookup',
  description: 'Look up a city',
  execute() {
    return { success: true, json: {}, text: 'ok' }
  }
})
const controller = new AbortController()
controller.abort('Pre-aborted signal')

const result = await plugin.execute({}, controller.signal)
console.log(result.text) // 'Pre-aborted signal'
```

### Mid-Flight Abort

When the execute function is async and the signal is provided, the wrapper races the execute promise against a listener that rejects with a `DOMException` named `AbortError`. The message of the `DOMException` is the same `signal.reason` text or `'Aborted'` when the reason is missing.

```typescript
// Long running execute that respects an AbortSignal
const plugin = Tool.define({
  name: 'long_task',
  description: 'A task that takes a while',
  async execute(_args, signal) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve({ success: true, json: {}, text: 'Done' }), 5000)
      signal?.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(new DOMException('Cancelled', 'AbortError'))
      })
    })
  }
})
const controller = new AbortController()
await plugin.execute({}, controller.signal)
```

If the execute function ignores the signal, the wrapper still cancels the result through the race. The wrapper reads `signal.aborted` again after the race settles, so a tool that resolves normally right before an abort still gets the aborted result.

### Post-Resolve Abort

When the signal aborts after the execute promise resolves but before the wrapper returns, the wrapper reads `signal.aborted` once more and returns the aborted shape instead of the resolved value.

### Sync Execute Without Signal

When the execute function returns synchronously and the caller omits `signal`, the wrapper skips the race and just passes the value through. When a sync execute function throws, the wrapper catches the error and translates it to the failure shape.

## Error Handling

```typescript
// Execute that throws becomes a failure result
const plugin = Tool.define({
  name: 'failing',
  description: 'Always fails',
  execute() {
    throw new Error('Something went wrong')
  }
})

const result = await plugin.execute({})
console.log(result)
// { success: false, json: null, text: 'Something went wrong' }
```

| Cause                                | Result `text` field     |
| :----------------------------------- | :---------------------- |
| Error instance with a message        | `error.message`         |
| Error instance with an empty message | `''` (empty string)     |
| Non error value thrown               | `String(value)`         |
| Aborted with a reason                | `String(signal.reason)` |
| Aborted without a reason             | `'Aborted'`             |
