/* eslint-disable no-use-before-define */
import type z from 'zod';

export type ExtractZodKeys<T> =
  T extends z.ZodObject<infer U> ? keyof z.infer<z.ZodObject<U>> : never;

export type KeysOf<T> = T extends object ? keyof T : never;

export type OptionsDefinition<T extends z.ZodObject<z.ZodRawShape>> = {
  schema: T;
  aliases?: Partial<Record<string, KeysOf<z.infer<T>>>> | undefined;
};

export type FoundCommandResult<TCommands> = {
  command: TCommands[keyof TCommands];
  pathLength: number;
};

export type CommandDefinition<
  TOptions extends z.ZodObject<z.ZodRawShape>,
  TArgs extends z.ZodType | undefined = undefined,
> = {
  name?: string;
  description: string;
  aliases?: string[];
  options?: OptionsDefinition<TOptions>;
  args?: TArgs;
  action: TArgs extends z.ZodType
    ? (_options: z.infer<TOptions>, _args: InferBasicArgs<TArgs>) => any
    : (_options: z.infer<TOptions>, _args: any) => any;
};

export type InferBasicArgs<T> = T extends undefined
  ? []
  : T extends z.ZodTuple<any>
    ? z.infer<T>
    : T extends z.ZodArray<infer A>
      ? A[]
      : T extends z.ZodType
        ? [z.infer<T>]
        : never;

export type CamelToSpaces<S extends string> = S extends `${infer T}${infer U}`
  ? T extends Uppercase<T>
    ? ` ${Lowercase<T>}${CamelToSpaces<U>}`
    : `${T}${CamelToSpaces<U>}`
  : S;

export type TrimLeft<S extends string> = S extends ` ${infer R}` ? TrimLeft<R> : S;

export type NormalizeCommandName<S extends string> = TrimLeft<CamelToSpaces<S>>;

export type ParsedFlag = {
  key: string;
  value: boolean | string;
};

// export type InferCommandOptions<T> = T extends CommandDefinition<
//   infer O,
//   any,
//   any
// >
//   ? O
//   : never;

// export type InferCommandArgs<T> = T extends CommandDefinition<any, infer A, any>
//   ? A
//   : any;

export type RequiredItems<T, N extends number, A extends T[] = []> = A['length'] extends N
  ? A
  : RequiredItems<T, N, [...A, T]>;

export type OptionalItems<T, N extends number, A extends T[] = []> = A['length'] extends N
  ? A
  : [...OptionalItems<T, N, [...A, T]>, ...A];

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

// export type InferActionArgs<T> = T extends CommandDefinition<any, infer A, any>
//   ? A extends z.ZodArray<any>
//     ? InferZodArray<A>
//     : A extends z.ZodTuple<any>
//       ? z.infer<A>
//       : A extends z.ZodType
//         ? [z.infer<A>]
//         : []
//   : [];

export type GlobalOptions = z.ZodObject<z.ZodRawShape>;

export type CommandsFactory<
  TGlobalOptions extends z.ZodObject<z.ZodRawShape>,
  TCommands extends TypedCommandMap,
> = (_globalOptions: z.infer<TGlobalOptions>, _schema?: TGlobalOptions) => TCommands;

// | (CommandDefinition<TOptions, TArgs> & {
//     name?: NormalizeCommandName<K>;
//   })
// | ((globalOptions: z.infer<TGlobalOptions>) => CommandDefinition<
//     TOptions,
//     TArgs
//   > & {
//     name?: NormalizeCommandName<K>;
//   })

export type TypedCommandMap = {
  [K in string]: CommandDefinition<any, any> extends infer TCmd
    ? TCmd extends CommandDefinition<infer TOptions, infer TArgs>
      ? CommandDefinition<TOptions, TArgs> & {
          name?: NormalizeCommandName<K>;
        }
      : never
    : never;
};

export type DefineConfigBase<TCommands extends TypedCommandMap> = {
  name?: string;
  description?: string;
  version?: `${number}.${number}.${number}`;
  allowUnknownFlags?: boolean;
  defaultCommand?: keyof TCommands;
};

export type DefineConfig<
  TGlobalOptions extends z.ZodObject<z.ZodRawShape>,
  TCommands extends TypedCommandMap,
> = DefineConfigBase<TCommands> &
  (
    | {
        globalOptions: OptionsDefinition<TGlobalOptions>;
        commands: CommandsFactory<TGlobalOptions, TCommands>;
      }
    | {
        globalOptions?: undefined;
        commands: TCommands;
      }
  );
// (
//   | {
//       globalOptions: OptionsDefinition<TGlobalOptions>;
//       commands: CommandsFactory<TGlobalOptions, TCommands>;
//     }
//   | {
//       globalOptions: OptionsDefinition<TGlobalOptions>;
//       commands?: undefined;
//       defaultCommand?: undefined;
//     }
//   | {
//       globalOptions?: undefined;
//       commands: TCommands;
//     }
// );
