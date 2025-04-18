import type { z } from 'zod';

import type {
  CommandDefinition,
  CommandsFactory,
  DefineConfig,
  OptionsDefinition,
  TypedCommandMap,
} from './types.ts';

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

export function defineCommand<
  TOptions extends z.ZodObject<z.ZodRawShape>,
  TArgs extends z.ZodType | undefined = undefined,
>(cfg: CommandDefinition<TOptions, TArgs>): CommandDefinition<TOptions, TArgs> {
  return cfg;
}

export function defineConfig<
  TGlobalOptions extends z.ZodObject<z.ZodRawShape>,
  TCommands extends TypedCommandMap,
>(config: DefineConfig<TGlobalOptions, TCommands>): DefineConfig<TGlobalOptions, TCommands> {
  return config;
}

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
