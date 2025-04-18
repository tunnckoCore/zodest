/* eslint-disable no-use-before-define */
import type z from 'zod';

/**
 * Extracts Zod object keys from a Zod schema.
 *
 * @typeParam T - Zod object schema
 */
export type ExtractZodKeys<T> =
  T extends z.ZodObject<infer U> ? keyof z.infer<z.ZodObject<U>> : never;

/**
 * Extracts keys from an object type.
 *
 * @typeParam T - Object type
 */
export type KeysOf<T> = T extends object ? keyof T : never;

/**
 * Defines the structure for CLI options with schema validation and aliases.
 *
 * @typeParam T - Zod object schema defining the options structure
 */
export type OptionsDefinition<T extends z.ZodObject<z.ZodRawShape>> = {
  /** Zod schema for validating options */
  schema: T;
  /** Optional map of short aliases to full option names */
  aliases?: Partial<Record<string, KeysOf<z.infer<T>>>> | undefined;
};

/**
 * Result object when finding a matching command.
 *
 * @typeParam TCommands - Map of command definitions
 */
export type FoundCommandResult<TCommands> = {
  /** The matched command */
  command: TCommands[keyof TCommands];
  /** Length of the matched command path */
  pathLength: number;
};

/**
 * Core command definition structure.
 *
 * @typeParam TOptions - Zod object schema for command options
 * @typeParam TArgs - Zod schema for command arguments
 */
export type CommandDefinition<
  TOptions extends z.ZodObject<z.ZodRawShape>,
  TArgs extends z.ZodType | undefined = undefined,
> = {
  /** Optional override for the command name */
  name?: string;
  /** Command description for help text */
  description: string;
  /** Alternative command names */
  aliases?: string[];
  /** Command-specific options definition */
  options?: OptionsDefinition<TOptions>;
  /** Validation schema for command arguments */
  args?: TArgs;
  /** Action handler for the command */
  action: TArgs extends z.ZodType
    ? (_options: z.infer<TOptions>, _args: InferBasicArgs<TArgs>) => any
    : (_options: z.infer<TOptions>, _args: any) => any;
};

/**
 * Infers the basic argument types from a Zod schema.
 *
 * @typeParam T - Zod schema type
 */
export type InferBasicArgs<T> = T extends undefined
  ? []
  : T extends z.ZodTuple<any>
    ? z.infer<T>
    : T extends z.ZodArray<infer A>
      ? A[]
      : T extends z.ZodType
        ? [z.infer<T>]
        : never;

/**
 * Converts camelCase to space-separated string.
 *
 * @typeParam S - Input string type
 */
export type CamelToSpaces<S extends string> = S extends `${infer T}${infer U}`
  ? T extends Uppercase<T>
    ? ` ${Lowercase<T>}${CamelToSpaces<U>}`
    : `${T}${CamelToSpaces<U>}`
  : S;

/**
 * Trims left whitespace from a string type.
 *
 * @typeParam S - Input string type
 */
export type TrimLeft<S extends string> = S extends ` ${infer R}` ? TrimLeft<R> : S;

/**
 * Normalizes a command name by converting camelCase to space-separated.
 *
 * @typeParam S - Input string type
 */
export type NormalizeCommandName<S extends string> = TrimLeft<CamelToSpaces<S>>;

/**
 * Represents a parsed command-line flag.
 */
export type ParsedFlag = {
  /** Flag name */
  key: string;
  /** Flag value */
  value: boolean | string;
};

/**
 * Helper type for requiring exactly N items of type T.
 *
 * @typeParam T - Item type
 * @typeParam N - Number of required items
 * @typeParam A - Accumulator array
 */
export type RequiredItems<T, N extends number, A extends T[] = []> = A['length'] extends N
  ? A
  : RequiredItems<T, N, [...A, T]>;

/**
 * Helper type for optional items up to N count.
 *
 * @typeParam T - Item type
 * @typeParam N - Maximum number of optional items
 * @typeParam A - Accumulator array
 */
export type OptionalItems<T, N extends number, A extends T[] = []> = A['length'] extends N
  ? A
  : [...OptionalItems<T, N, [...A, T]>, ...A];

/**
 * Calculates numeric type level subtraction.
 *
 * @typeParam A - First number
 * @typeParam B - Second number
 */
export type Subtract<A extends number, B extends number> = [
  ...RequiredItems<unknown, A>,
]['length'] extends infer L
  ? L extends number
    ? [...RequiredItems<unknown, B>]['length'] extends infer R
      ? R extends number
        ? L extends R
          ? 0
          : number
        : never
      : never
    : never
  : never;

/**
 * Infers tuple type from Zod array with min/max length constraints.
 *
 * @typeParam T - Zod array type
 */
export type InferZodArray<T extends z.ZodArray<any>> =
  T extends z.ZodArray<infer E>
    ? T extends {
        _def: {
          minLength: infer Min extends number;
          maxLength: infer Max extends number;
        };
      }
      ? [...RequiredItems<z.infer<E>, Min>, ...OptionalItems<z.infer<E>, Subtract<Max, Min>>]
      : [z.infer<T>]
    : never;

/**
 * Type for global options schema.
 */
export type GlobalOptions = z.ZodObject<z.ZodRawShape>;

/**
 * Factory function type for creating commands with access to global options.
 *
 * @typeParam TGlobalOptions - Global options schema type
 * @typeParam TCommands - Command map type
 */
export type CommandsFactory<
  TGlobalOptions extends z.ZodObject<z.ZodRawShape>,
  TCommands extends TypedCommandMap,
> = (_globalOptions: z.infer<TGlobalOptions>, _schema?: TGlobalOptions) => TCommands;

/**
 * Maps command names to their definitions with proper typing.
 */
export type TypedCommandMap = {
  [K in string]: CommandDefinition<any, any> extends infer TCmd
    ? TCmd extends CommandDefinition<infer TOptions, infer TArgs>
      ? CommandDefinition<TOptions, TArgs> & {
          name?: NormalizeCommandName<K>;
        }
      : never
    : never;
};

/**
 * Base configuration properties for CLI.
 *
 * @typeParam TCommands - Command map type
 */
export type DefineConfigBase<TCommands extends TypedCommandMap> = {
  /** CLI name */
  name?: string;
  /** CLI description */
  description?: string;
  /** CLI version in semver format */
  version?: `${number}.${number}.${number}`;
  /** Whether to allow unknown flags */
  allowUnknownFlags?: boolean;
  /** Default command to run if none specified */
  defaultCommand?: keyof TCommands;
};

/**
 * Complete CLI configuration type.
 *
 * @typeParam TGlobalOptions - Global options schema type
 * @typeParam TCommands - Command map type
 */
export type DefineConfig<
  TGlobalOptions extends z.ZodObject<z.ZodRawShape>,
  TCommands extends TypedCommandMap,
> = DefineConfigBase<TCommands> &
  (
    | {
        /** Global options definition */
        globalOptions: OptionsDefinition<TGlobalOptions>;
        /** Command factory or map */
        commands: CommandsFactory<TGlobalOptions, TCommands>;
      }
    | {
        /** Optional global options */
        globalOptions?: undefined;
        /** Static command map */
        commands: TCommands;
      }
  );
