import type * as Types from '@app/types.ts'

/**
 * Tool registry factory.
 * @description Provides define static method for tool registration.
 */
export default class Tool {
  /**
   * Register tool and return executable plugin.
   * @description Builds schema and wraps handler with abort support.
   * @param config - Tool definition options
   * @returns Plugin exposing schema and execute function
   */
  static define(config: Types.ToolDefineOptions): Types.ToolPlugin {
    const schema: Types.ToolDef = {
      type: 'function',
      function: {
        name: config.name,
        description: config.description,
        parameters: config.parameters ?? { type: 'object', properties: {} }
      }
    }
    return {
      schema,
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
