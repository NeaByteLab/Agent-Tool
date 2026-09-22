/**
 * Anthropic tool definition shape.
 * @description Maps function name to input schema with optional examples.
 */
export interface ToolAnthropicDef extends ToolFunctionCore {
  /** JSON schema describing accepted arguments */
  readonly input_schema: ToolSchema
  /** Sample payloads demonstrating valid input */
  readonly input_examples?: readonly Record<string, unknown>[]
}

/**
 * Tool definition options for registration.
 * @description Holds name, description, schema, and execute handler.
 */
export interface ToolDefineOptions {
  /** Unique tool identifier */
  readonly name: string
  /** Human-readable purpose description */
  readonly description: string
  /** JSON schema for arguments */
  readonly parameters?: ToolSchema
  /** Sync or async handler invoked on call */
  readonly execute: ToolExecuteFn
}

/**
 * Flat OpenAI tool definition shape.
 * @description Places function fields at top level for legacy format.
 */
export interface ToolFlatFunctionDef extends ToolFunctionCore {
  /** Fixed discriminator marking function tool */
  readonly type: 'function'
}

/**
 * Core tool function fields.
 * @description Shared name, description, and parameter schema.
 */
export interface ToolFunctionCore {
  /** Unique tool identifier */
  readonly name: string
  /** Human-readable purpose description */
  readonly description: string
  /** JSON schema for arguments */
  readonly parameters: ToolSchema
}

/**
 * Nested OpenAI tool definition shape.
 * @description Wraps function fields inside function property.
 */
export interface ToolOpenAIDef {
  /** Fixed discriminator marking function tool */
  readonly type: 'function'
  /** Nested function descriptor */
  readonly function: ToolFunctionCore
}

/**
 * Registered tool instance returned from define.
 * @description Exposes schema for model binding and execute for invocation.
 */
export interface ToolPlugin {
  /** Schema representation in supported union variants */
  readonly schema: ToolDef
  /** Invoke handler with input and optional signal */
  readonly execute: (
    input: Record<string, unknown>,
    signal?: AbortSignal,
    emit?: ToolEventCallback
  ) => Promise<ToolResult>
}

/**
 * Single property descriptor inside tool schema.
 * @description Holds type, description, enum, and default value.
 */
export interface ToolPropertySchema {
  /** JSON schema type name */
  readonly type: string
  /** Human-readable field description */
  readonly description?: string
  /** Allowed string values when applicable */
  readonly enum?: readonly string[]
  /** Default value when omitted */
  readonly default?: string
}

/**
 * Standardized tool execution result.
 * @description Carries success flag, payload, and human-readable text.
 */
export interface ToolResult {
  /** True when handler succeeded */
  success: boolean
  /** Structured payload or null on failure */
  json: Record<string, unknown> | null
  /** Human-readable output or null on failure */
  text: string | null
}

/**
 * JSON schema describing tool arguments.
 * @description Object schema with typed properties and optional constraints.
 */
export interface ToolSchema {
  /** Schema type, always object here */
  readonly type: string
  /** Map of property name to descriptor */
  readonly properties: Record<string, ToolPropertySchema>
  /** Required property names */
  readonly required?: readonly string[]
  /** Whether extra properties are allowed */
  readonly additionalProperties?: boolean
}

/**
 * Union of supported tool definition variants.
 * @description Discriminates OpenAI nested, OpenAI flat, and Anthropic shapes.
 */
export type ToolDef = ToolOpenAIDef | ToolFlatFunctionDef | ToolAnthropicDef

/**
 * Streaming event emitter callback type.
 * @description Receives arbitrary payloads during async execution.
 */
export type ToolEventCallback = (event: unknown) => void

/**
 * Tool handler signature.
 * @description Accepts input and optional signal plus emitter.
 */
export type ToolExecuteFn = (
  input: Record<string, unknown>,
  signal?: AbortSignal,
  emit?: ToolEventCallback
) => ToolResult | Promise<ToolResult>
