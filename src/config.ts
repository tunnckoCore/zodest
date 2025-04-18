import type { z } from 'zod';

import type {
  CommandDefinition,
  CommandsFactory,
  DefineConfig,
  OptionsDefinition,
  TypedCommandMap,
} from './types.ts';

/**
 * Creates a type-safe options definition for CLI options.
 * Validates that all aliases map to existing schema keys.
 *
 * @param schema - Zod schema defining the options structure and validation
 * @param aliases - Optional map of short aliases to full option names
 * @returns Options definition object with the passed schema and aliases
 * @throws {Error} If an alias maps to a non-existent schema key
 * @example
 * ```ts
 * const options = defineOptions(
 *   z.object({
 *     port: z.number().min(1024).default(3000),
 *     verbose: z.boolean().default(false)
 *   }),
 *   { p: 'port', v: 'verbose' }
 * );
 * ```
 */
export function defineOptions<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  aliases?: OptionsDefinition<T>['aliases'],
): OptionsDefinition<T> {
  if (aliases) {
    const schemaKeys = new Set(Object.keys(schema.shape));
    for (const [alias, target] of Object.entries(aliases)) {
      if (!schemaKeys.has(target as string)) {
        throw new Error(
          `Invalid alias mapping: "${alias}" -> "${target}". "${target}" is not defined in the schema.`,
        );
      }
    }
  }
  return { schema, aliases };
}

/**
 * Defines a new CLI command with type-safe options, arguments, and action handler.
 *
 * @param cfg - Command configuration object
 * @returns Command definition object
 * @example
 * ```ts
 * const command = defineCommand({
 *   description: 'Start development server',
 *   options: defineOptions(z.object({
 *     port: z.number().min(1024)
 *   })),
 *   args: z.array(z.string()),
 *   action(options, args) {
 *     // Fully typed options and args
 *   }
 * });
 * ```
 */
export function defineCommand<
  TOptions extends z.ZodObject<z.ZodRawShape>,
  TArgs extends z.ZodType | undefined = undefined,
>(cfg: CommandDefinition<TOptions, TArgs>): CommandDefinition<TOptions, TArgs> {
  return cfg;
}

/**
 * Creates a type-safe CLI configuration object.
 * Supports both direct command objects and factory functions.
 *
 * @param config - CLI configuration object
 * @returns Configuration object with normalized commands
 * @example
 * ```ts
 * const config = defineConfig({
 *   globalOptions: defineOptions(...),
 *   commands: {
 *     serve: defineCommand(...),
 *     build: defineCommand(...)
 *   }
 * });
 * ```
 */
export function defineConfig<
  TGlobalOptions extends z.ZodObject<z.ZodRawShape>,
  TCommands extends TypedCommandMap,
>(config: DefineConfig<TGlobalOptions, TCommands>): DefineConfig<TGlobalOptions, TCommands> {
  return config;
}

/**
 * Creates a command factory with access to global options.
 * Useful for creating reusable command presets that need access to global state.
 *
 * @param globalOptions - Global options definition
 * @param commands - Factory function that creates commands with access to global options
 * @returns Command factory function
 * @example
 * ```ts
 * const userCommands = withGlobalOptions(globalOptions, (gopts) => ({
 *   add: defineCommand({
 *     action(options, args) {
 *       if (gopts.verbose) console.log('Adding user...');
 *     }
 *   })
 * }));
 * ```
 */
export function withGlobalOptions<
  TGlobalOptions extends z.ZodObject<z.ZodRawShape>,
  TCommands extends TypedCommandMap,
>(
  globalOptions: OptionsDefinition<TGlobalOptions>,
  commands: CommandsFactory<TGlobalOptions, TCommands>,
): (
  _gopts: z.infer<typeof globalOptions.schema>,
  _schema?: typeof globalOptions.schema,
) => TCommands {
  return (
    gopts: z.infer<typeof globalOptions.schema>,
    schema?: typeof globalOptions.schema,
  ): TCommands =>
    commands(
      gopts as z.infer<typeof globalOptions.schema>,
      schema || globalOptions.schema,
    ) as TCommands;
}
