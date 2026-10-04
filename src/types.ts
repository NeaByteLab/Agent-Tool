/**
 * Anthropic cache control descriptor.
 * @description Configures ephemeral prompt caching headers.
 */
export interface ToolAnthropicCacheControl {
  /** Type of cache control */
  readonly type: 'ephemeral'
}

/**
 * Anthropic tool definition shape.
 * @description Maps function name to input schema.
 */
export interface ToolAnthropicDef {
  /** Optional cache control configuration */
  readonly cache_control?: ToolAnthropicCacheControl
  /** Human-readable purpose description */
  readonly description?: string
  /** Sample payloads demonstrating valid input */
  readonly input_examples?: readonly Record<string, unknown>[]
  /** JSON schema describing accepted arguments */
  readonly input_schema: ToolSchema
  /** Unique tool identifier */
  readonly name: string
  /** Whether strict schema compliance enforced */
  readonly strict?: boolean
}

/**
 * Tool definition options.
 * @description Holds metadata and execution handler.
 */
export interface ToolDefineOptions {
  /** Optional Anthropic cache control */
  readonly cache_control?: ToolAnthropicCacheControl
  /** Human-readable purpose description */
  readonly description?: string
  /** Sync or async execute handler */
  readonly execute: ToolExecuteFn
  /** Optional Anthropic input examples */
  readonly input_examples?: readonly Record<string, unknown>[]
  /** Unique tool identifier */
  readonly name: string
  /** JSON schema for arguments */
  readonly parameters?: ToolSchema
  /** Whether strict adherence is enforced */
  readonly strict?: boolean
}

/**
 * Flat OpenAI function definition.
 * @description Legacy function shape without wrapper.
 */
export interface ToolFlatFunctionDef extends ToolFunctionCore {}

/**
 * Core tool function fields.
 * @description Shared descriptor fields for functions.
 */
export interface ToolFunctionCore {
  /** Human-readable purpose description */
  readonly description?: string
  /** Unique tool identifier */
  readonly name: string
  /** JSON schema for arguments */
  readonly parameters: ToolSchema
  /** Whether strict compliance is required */
  readonly strict?: boolean
}

/**
 * Nested OpenAI tool definition.
 * @description Wraps function fields inside object.
 */
export interface ToolOpenAIDef {
  /** Nested function descriptor */
  readonly function: ToolFunctionCore
  /** Fixed discriminator marking function tool */
  readonly type: 'function'
}

/**
 * Registered tool instance.
 * @description Exposes schema formats and executor.
 */
export interface ToolPlugin {
  /**
   * Invoke handler with input.
   * @description Executes registered tool handler with payload.
   * @param input - Input arguments map
   * @param signal - Optional abort signal
   * @param emit - Optional event callback
   * @returns Promise resolving execution result
   */
  readonly execute: (
    input: Record<string, unknown>,
    signal?: AbortSignal,
    emit?: ToolEventCallback
  ) => Promise<ToolResult>
  /** OpenAI schema representation */
  readonly schema: ToolOpenAIDef
  /** Convert to Anthropic format */
  readonly toAnthropic: () => ToolAnthropicDef
  /** Convert to flat format */
  readonly toFlatFunction: () => ToolFlatFunctionDef
  /** Convert to OpenAI format */
  readonly toOpenAI: () => ToolOpenAIDef
}

/**
 * Property descriptor in schema.
 * @description Defines type constraints and descriptors.
 */
export interface ToolPropertySchema {
  /** Additional properties restriction */
  readonly additionalProperties?: boolean | ToolPropertySchema
  /** All matching schema requirements */
  readonly allOf?: readonly ToolPropertySchema[]
  /** Any matching schema options */
  readonly anyOf?: readonly ToolPropertySchema[]
  /** Default value when omitted */
  readonly default?: unknown
  /** Human-readable field description */
  readonly description?: string
  /** Allowed enum values */
  readonly enum?: readonly (string | number | boolean | null)[]
  /** Schema for array items */
  readonly items?: ToolPropertySchema | Record<string, unknown>
  /** Maximum numeric value */
  readonly maximum?: number
  /** Minimum numeric value */
  readonly minimum?: number
  /** Whether property permits null */
  readonly nullable?: boolean
  /** Exactly one matching schema */
  readonly oneOf?: readonly ToolPropertySchema[]
  /** String pattern regex */
  readonly pattern?: string
  /** Nested properties for objects */
  readonly properties?: Record<string, ToolPropertySchema>
  /** Required fields for objects */
  readonly required?: readonly string[]
  /** JSON schema type name */
  readonly type?: ToolPropertyType
}

/**
 * Tool execution result payload.
 * @description Standard outcome from tool execution.
 */
export interface ToolResult {
  /** Structured payload on success */
  json: Record<string, unknown> | null
  /** True when handler succeeded */
  success: boolean
  /** Human-readable output text */
  text: string | null
}

/**
 * JSON schema for arguments.
 * @description Object schema declaring properties constraints.
 */
export interface ToolSchema {
  /** Extra properties allowed flag */
  readonly additionalProperties?: boolean
  /** Map of property descriptors */
  readonly properties: Record<string, ToolPropertySchema>
  /** Required property names list */
  readonly required?: readonly string[]
  /** Schema object type discriminator */
  readonly type: 'object'
}

/** Supported tool definition variants. */
export type ToolDef = ToolAnthropicDef | ToolFlatFunctionDef | ToolOpenAIDef

/**
 * Streaming event callback handler.
 * @description Receives event payload during execution.
 * @param event - Arbitrary event payload
 */
export type ToolEventCallback = (event: unknown) => void

/**
 * Tool handler execution function.
 * @description Synchronous or asynchronous tool handler.
 * @param input - Input arguments map
 * @param signal - Optional abort signal
 * @param emit - Optional event callback
 * @returns Execution result outcome
 */
export type ToolExecuteFn = (
  input: Record<string, unknown>,
  signal?: AbortSignal,
  emit?: ToolEventCallback
) => ToolResult | Promise<ToolResult>

/** Primitive JSON schema types. */
export type ToolPropertyType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'array'
  | 'object'
  | 'null'
