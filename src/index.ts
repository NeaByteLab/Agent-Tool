import type * as Types from '@app/types.ts'

/**
 * Tool registry factory.
 * @description Provides define static method for tool registration.
 */
export default class Tool {
  /**
   * Register tool definition.
   * @description Builds schema and wraps handler with abort support.
   * @param config - Tool definition options
   * @returns Plugin exposing schemas and execute function
   */
  static define(config: Types.ToolDefineOptions): Types.ToolPlugin {
    const parameters = config.parameters ?? { type: 'object', properties: {} }
    const toOpenAI = (): Types.ToolOpenAIDef => ({
      type: 'function',
      function: {
        name: config.name,
        ...(config.description !== undefined ? { description: config.description } : {}),
        parameters,
        ...(config.strict !== undefined ? { strict: config.strict } : {})
      }
    })
    const toAnthropic = (): Types.ToolAnthropicDef => ({
      name: config.name,
      ...(config.description !== undefined ? { description: config.description } : {}),
      input_schema: parameters,
      ...(config.input_examples !== undefined ? { input_examples: config.input_examples } : {}),
      ...(config.strict !== undefined ? { strict: config.strict } : {}),
      ...(config.cache_control !== undefined ? { cache_control: config.cache_control } : {})
    })
    const toFlatFunction = (): Types.ToolFlatFunctionDef => ({
      name: config.name,
      ...(config.description !== undefined ? { description: config.description } : {}),
      parameters,
      ...(config.strict !== undefined ? { strict: config.strict } : {})
    })
    const schema = toOpenAI()
    return {
      schema,
      toAnthropic,
      toOpenAI,
      toFlatFunction,
      execute: async (
        input: Record<string, unknown>,
        signal?: AbortSignal,
        emit?: Types.ToolEventCallback
      ): Promise<Types.ToolResult> => {
        const abortText = (): string => (signal?.reason ? String(signal.reason) : 'Aborted')
        const aborted = (): Types.ToolResult => ({
          success: false,
          json: null,
          text: abortText()
        })
        if (signal?.aborted) {
          return aborted()
        }
        try {
          const output = config.execute(input, signal, emit)
          const outcome = output instanceof Promise
            ? signal
              ? await Promise.race([
                output,
                new Promise<never>((_, reject) => {
                  const trigger = () => reject(new DOMException(abortText(), 'AbortError'))
                  if (signal.aborted) {
                    trigger()
                    return
                  }
                  signal.addEventListener('abort', trigger, { once: true })
                })
              ])
              : await output
            : output
          if (signal?.aborted) {
            return aborted()
          }
          return outcome
        } catch (cause: unknown) {
          if (signal?.aborted) {
            return aborted()
          }
          return {
            success: false,
            json: null,
            text: cause instanceof Error ? cause.message : String(cause)
          }
        }
      }
    }
  }
}

/** Re-export all type definitions */
export type * from '@app/types.ts'
