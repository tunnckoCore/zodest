# zodest [![npm version][npmv-img]][npmv-url] [![cicd build][linuxbuild-img]][linuxbuild-url] [![Libera Manifesto][libera-manifesto-img]][libera-manifesto-url]

[npmv-url]: https://npmjs.com/packages/zodest
[npmv-img]: https://badgen.net/npm/v/zodest?icon=npm
[linuxbuild-url]: https://github.com/tunnckocore/zodest/actions
[linuxbuild-img]: https://badgen.net/github/checks/tunnckoCore/zodest/master?icon=github
[libera-manifesto-url]: https://liberamanifesto.com
[libera-manifesto-img]: https://badgen.net/badge/libera/manifesto/grey

Modern Zod-based CLI builder, fully type-safe, super lightweight and flexible.

## Highlights

- 🎯 Full TypeScript support with robust type inference
- 🛡️ Runtime validation using [Zod](https://github.com/colinhacks/zod)
- 🔄 Supports command aliases and nested commands
- 🌟 Global and command-specific options
- 📦 Shareable command presets
- 🎨 Flexible configuration API
- 🪶 Lightweight with zero runtime dependencies (except Zod)

## Installation

```bash
npm install zodest zod
# or
yarn add zodest zod
# or
pnpm add zodest zod
# or
bun add zodest zod
```

## Quick Example

```typescript
import { z } from 'zod';
import { defineCommand, defineConfig, defineOptions } from 'zodest/config';
import { processConfig } from 'zodest';

const config = defineConfig({
  globalOptions: defineOptions(
    z.object({
      verbose: z.boolean().default(false),
    }),
  ),
  commands: {
    serve: defineCommand({
      description: 'Start development server',
      options: defineOptions(
        z.object({
          port: z.coerce.number().min(1024).default(3000),
        }),
        { p: 'port' }, // aliases
      ),
      args: z.array(z.string()),
      action(options, args) {
        console.log('Server starting on port', options.port);
      },
    }),
  },
});

// Process CLI arguments, returns the matching command
const result = processConfig(config, process.argv.slice(2));

console.log('result:', result._kind, result);

// call the command
result.command.action(result.options, result.args);
```

## Core Concepts

### Commands

Commands are the basic building blocks. Each command can have:

- Description
- Options (with Zod validation)
- Arguments (with Zod validation)
- Aliases
- Action function

```typescript
const myCommand = defineCommand({
  description: 'My command description',
  options: defineOptions(
    z.object({
      force: z.boolean().default(false),
    }),
  ),
  args: z.string().min(3),
  aliases: ['mc', 'mycmd'],
  action(options, args) {
    // Fully typed options and args
  },
});
```

### Global Options

Shared options across all commands:

```typescript
const globalOptions = defineOptions(
  z.object({
    debug: z.boolean().default(false),
    config: z.string().optional(),
  }),
  {
    d: 'debug', // aliases
    c: 'config',
  },
);
```

### Nested Commands

Support for namespaced commands:

```typescript
const config = defineConfig({
  commands: {
    'user add': defineCommand({...}),
    'user remove': defineCommand({...}),
    'user list': defineCommand({...}),
  }
});
```

### Shareable Command Presets

Create reusable command sets:

```typescript
import { withGlobalOptions } from 'zodest/config';

const userCommands = withGlobalOptions(globalOptions, (gopts) => ({
  userAdd: defineCommand({...}),
  userRemove: defineCommand({...}),
}));

// Use in any CLI
const config = defineConfig({
  globalOptions,
  commands: (gopts) => ({
    ...userCommands(gopts),
    // Add more commands
  })
});
```

## API Reference

### defineConfig(config)

Creates a type-safe CLI configuration.

### defineCommand(command)

Defines a new command with options, arguments, and an action.

### defineOptions(schema, aliases?)

Creates a type-safe options definition with optional aliases.

### processConfig(config, argv)

Processes command line arguments against the configuration.

### withGlobalOptions(globalOptions, commands)

Creates a command preset with access to global options.

### getCommands(config)

Returns all available commands from the configuration.

## Advanced Examples

### Command with Complex Arguments

```typescript
const command = defineCommand({
  description: 'Complex command',
  options: defineOptions(
    z.object({
      mode: z.enum(['development', 'production']),
      port: z.coerce.number().min(1024),
    }),
  ),
  args: z.tuple([z.string(), z.coerce.number()]),
  action(options, [path, num]) {
    // path is string, num is number
  },
});
```

### Default Commands

**NOTE:** mixing grouped commands with non-grouped ones breaks the `defaultCommand` inference of the
grouped commands, so you must use `as any` to mute TypeScript, or use a command from non-grouped
commands

```typescript
const config = defineConfig({
  defaultCommand: 'serve',
  commands: {
    serve: defineCommand({...})
    dev: defineCommand({...})
  }
});
```

### Command Groups

```typescript
const devCommands = withGlobalOptions(globalOptions, (gopts) => ({
  serve: defineCommand({...}),
  build: defineCommand({...}),
}));

const dbCommands = withGlobalOptions(globalOptions, (gopts) => ({
  'db migrate': defineCommand({...}),
  'db seed': defineCommand({...}),
}));

const config = defineConfig({
  globalOptions,
  commands: (gopts) => ({
    ...devCommands(gopts),
    ...dbCommands(gopts),
  })
});
```

## License

Apache-2.0
