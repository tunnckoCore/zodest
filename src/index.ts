import { z } from 'zod';

import type { DefineConfig, FoundCommandResult, ParsedFlag, TypedCommandMap } from './types.ts';

export function getCommands<
  TGlobalOptions extends z.ZodObject<z.ZodRawShape>,
  TCommands extends TypedCommandMap,
>(config: DefineConfig<TGlobalOptions, TCommands>): TCommands {
  const normalizeNames = (commands: TCommands) =>
    Object.fromEntries(
      Object.entries(commands).map(([name, command]) => [
        command.name || name,
        { ...command, name: command.name || name },
      ]),
    );

  if (typeof config.commands === 'function') {
    return normalizeNames(config.commands({})) as TCommands;
  }

  return normalizeNames(config.commands) as TCommands;
}

// _kind: command.name as keyof TCommands,
// command: cmd,
// globalOptions,
// options: commandOptions,
// args: validatedArgs,
// type ProcessConfigResult<TGlobalOptions, TCommands> = {
//   _kind: string;
//   command: typeof TCommands;
//   globalOptions: TGlobalOptions;
//   options: any,
// };

// Main export function
export function processConfig<
  TGlobalOptions extends z.ZodObject<z.ZodRawShape>,
  TCommands extends TypedCommandMap,
>(config: DefineConfig<TGlobalOptions, TCommands>, argv: string[]) {
  const issues: z.ZodIssue[] = [];

  const globalOptionsEnd = findGlobalOptionsEnd(argv, config);
  const globalOptionsPart = argv.slice(0, globalOptionsEnd);
  const remaining = argv.slice(globalOptionsEnd);

  const commandOptionsStart = remaining.findIndex((arg) => arg.startsWith('-'));
  const commandParts = remaining.slice(
    0,
    commandOptionsStart === -1 ? remaining.length : commandOptionsStart,
  );
  const commandOptionsPart = remaining.slice(
    commandOptionsStart === -1 ? remaining.length : commandOptionsStart,
  );

  const globalOptions = processGlobalOptions(globalOptionsPart, config);

  const commands =
    typeof config.commands === 'function'
      ? config.commands(globalOptions, config.globalOptions?.schema)
      : config.commands;

  const normalizedCommands =
    commands && typeof commands === 'object'
      ? (Object.fromEntries(
          Object.entries(commands).map(([name, cmd]) => [name, { ...cmd, name: cmd.name || name }]),
        ) as TCommands)
      : ({} as TCommands);

  const bestMatch = findBestMatchingCommand(
    commandParts,
    normalizedCommands,
    config.defaultCommand,
  );

  if (!bestMatch) {
    // Handle error case for unknown command
    const availableCommands = Object.values(normalizedCommands).map(
      (cmd) => `${[cmd.name, ...(cmd.aliases || [])].join(', ')} - ${cmd.description}`,
    );

    const cmdPath = commandParts.join(' ');
    issues.push({
      code: z.ZodIssueCode.unrecognized_keys,
      message: `${cmdPath ? `Unknown command "${cmdPath}". ` : ''}Available commands: ${availableCommands.join(',')}`,
      keys: Object.values(normalizedCommands).map((cmd) => cmd.name as string),
      path: [cmdPath],
    });
    throw new z.ZodError(issues);
  }

  const { command, pathLength } = bestMatch;
  const cmdArgs = commandParts.slice(pathLength);

  const [commandOptions, validatedArgs] = processCommandOptions(
    commandOptionsPart,
    command,
    cmdArgs,
    config,
  );

  const cmd = command;
  const res = {
    _kind: command.name as keyof TCommands,
    command: cmd,
    globalOptions,
    options: commandOptions,
    args: validatedArgs,
  };

  return res;
}

export function findGlobalOptionsEnd(argv: string[], config: DefineConfig<any, any>): number {
  for (const [i, element] of argv.entries()) {
    const arg = element || '';
    if (arg.startsWith('-')) {
      const flags = parseArgIntoFlags(arg);
      const isGlobal = flags.every(({ key }) =>
        isGlobalFlag(resolveAlias(key, config.globalOptions?.aliases), config.globalOptions),
      );
      if (!isGlobal) {
        break;
      }
      continue;
    }
    return i;
  }
  return argv.length;
}

export function parseArgIntoFlags(arg: string): ParsedFlag[] {
  if (arg.startsWith('--')) {
    const flag = arg.slice(2);
    if (flag.startsWith('no-')) {
      return [{ key: flag.slice(3), value: false }];
    }
    const [key = '', value] = flag.split('=', 2);
    if (!key) {
      throw new Error('unknown error because "key" is undefined');
    }
    return [{ key, value: value === undefined ? true : value }];
  }
  if (arg.startsWith('-')) {
    const flag = arg.slice(1);
    const [chars = '', value] = flag.split('=', 2);
    return chars.split('').map((char) => ({
      key: char,
      value: value === undefined ? true : value,
    }));
  }
  return [];
}

export function processGlobalOptions<T extends z.ZodObject<z.ZodRawShape>>(
  globalOptionsPart: string[],
  config: DefineConfig<T, any>,
): z.infer<T> {
  const issues: z.ZodIssue[] = [];
  const globalFlags = new Map<string, boolean | string>();

  for (const arg of globalOptionsPart) {
    const parsedFlags = parseArgIntoFlags(arg);
    for (const { key, value } of parsedFlags) {
      const resolvedKey = resolveAlias(key, config.globalOptions?.aliases);
      if (isGlobalFlag(resolvedKey, config.globalOptions)) {
        globalFlags.set(resolvedKey, value);
      }
    }
  }

  if (!config.defaultCommand) {
    issues.push(
      ...validateFlags(
        globalFlags,
        config.globalOptions?.schema?.shape || {},
        'global',
        !!config.allowUnknownFlags,
      ),
    );
    if (issues.length > 0) {
      throw new z.ZodError(issues);
    }
  }

  const globalOptions = config.globalOptions?.schema
    ? config.globalOptions.schema.parse(Object.fromEntries(globalFlags))
    : ({} as Record<string, never>);

  return globalOptions;
}

// string[], TCommands[keyof TCommands], string[], DefineConfig<TGlobalOptions, TCommands>
export function processCommandOptions<
  TGlobalOptions extends z.ZodObject<z.ZodRawShape>,
  TCommands extends TypedCommandMap,
>(
  commandOptionsPart: string[],
  command: TCommands[keyof TCommands],
  cmdArgs: string[],
  config: DefineConfig<TGlobalOptions, TCommands>,
): any {
  const issues: z.ZodIssue[] = [];
  const commandInputFlags = new Map<string, boolean | string>();

  for (const arg of commandOptionsPart) {
    const parsedFlags = parseArgIntoFlags(arg);
    for (const { key, value } of parsedFlags) {
      const resolvedKey = resolveAlias(key, command.options?.aliases);
      commandInputFlags.set(resolvedKey, value);
    }
  }

  issues.push(
    ...validateFlags(
      commandInputFlags,
      command.options?.schema.shape || {},
      'command',
      !!config.allowUnknownFlags,
    ),
  );
  if (issues.length > 0) {
    throw new z.ZodError(issues);
  }

  const validatedArgs = validateArgs(command.args, cmdArgs);
  const commandOptions = command.options
    ? command.options.schema.parse(Object.fromEntries(commandInputFlags))
    : {};

  return [commandOptions, validatedArgs];
}

export function validateArgs(schemaArgs: any, cmdArgs: string[]): any {
  const isZodTuple = /ZodTuple/.test((schemaArgs as z.ZodTuple<any>)?._def?.typeName || '');
  const isZodArray = /ZodArray/.test((schemaArgs as z.ZodArray<any>)?._def?.typeName || '');
  const isPlainArray = Array.isArray(schemaArgs);

  if (isZodArray) {
    return cmdArgs.map((x) => schemaArgs._def.type.parse(x));
  }
  if (isZodTuple) {
    return schemaArgs._def.items.map((x: any, idx: number) => x.parse(cmdArgs[idx]));
  }
  if (isPlainArray) {
    return schemaArgs.map((x, idx) => x.parse(cmdArgs[idx]));
  }
  return schemaArgs ? [schemaArgs.parse(cmdArgs[0])] : [];
}

function validateFlags(
  flags: Map<string, any>,
  schema: z.ZodRawShape,
  context: string,
  allowUnknownFlags: boolean,
): z.ZodIssue[] {
  const issues: z.ZodIssue[] = [];
  if (!allowUnknownFlags) {
    const unknownFlags = Array.from(flags.keys()).filter(
      (key) => !(key in schema) && !(camelCase(key) in schema),
    );
    if (unknownFlags.length > 0) {
      issues.push({
        code: z.ZodIssueCode.unrecognized_keys,
        message: `Unknown ${context} flags: ${unknownFlags.join(', ')}`,
        keys: unknownFlags,
        path: [context],
      });
    }
  }
  return issues;
}

function isGlobalFlag(
  key: string,
  globalOptions: DefineConfig<any, any>['globalOptions'],
): boolean {
  const globalSchema = globalOptions?.schema?.shape || {};
  const globalAliases = globalOptions?.aliases || {};
  return key in globalSchema || key in globalAliases;
}

function resolveAlias(key: string, aliases: Record<string, any> = {}): string {
  return aliases[key] || camelCase(key);
}

export function findBestMatchingCommand<TCommands extends TypedCommandMap>(
  commandParts: string[],
  commands: TCommands,
  defaultCommand?: keyof TCommands,
): FoundCommandResult<TCommands> | null {
  let bestMatch: FoundCommandResult<TCommands> | null = null;
  let remainingParts = [...commandParts];

  if (Object.keys(commands).length > 0) {
    while (remainingParts.length > 0) {
      const cmdPath = remainingParts.join(' ');
      for (const [_, cmd] of Object.entries(commands)) {
        const isCmd = cmdPath === cmd.name || camelCase(cmdPath) === cmd.name;
        if (isCmd || cmd.aliases?.includes(cmdPath)) {
          bestMatch = {
            command: cmd as TCommands[keyof TCommands],
            pathLength: cmdPath.split(' ').length,
          };
          break;
        }
      }
      if (bestMatch) {
        break;
      }
      remainingParts = remainingParts.slice(0, -1);
    }
  }

  if (!bestMatch && defaultCommand) {
    bestMatch = {
      command: commands[defaultCommand] as TCommands[keyof TCommands],
      pathLength: 0,
    };
  }

  return bestMatch;
}

function camelCase(str: string) {
  return str
    .split(/[ -]+/)
    .reduce(
      (acc, curr, i) => (i === 0 ? curr : `${acc}${curr?.[0]?.toUpperCase()}${curr.slice(1)}`),
      '',
    );
}
