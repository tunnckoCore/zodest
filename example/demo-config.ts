import { z } from 'zod';

import { defineCommand, defineConfig, defineOptions, withGlobalOptions } from '../src/config.ts';

const globalOptions = defineOptions(
  z.object({
    help: z.boolean().default(false),
    debug: z.boolean().default(false),
    verbose: z.boolean().default(false),
    version: z.boolean().default(false),
  }),
  {
    h: 'help',
    d: 'debug',
    v: 'verbose',
  },
);

const userCommands = withGlobalOptions(globalOptions, (gopts, schema) => ({
  userAdd: defineCommand({
    description: 'Add a new user',
    options: defineOptions(
      z.object({
        role: z.enum(['admin', 'user']).default('user'),
        age: z.coerce.number().int().positive(),
        active: z.boolean().default(true),
        createdAt: z.coerce.number().default(42),
      }),
      { r: 'role', a: 'age', x: 'active' },
    ),
    args: z.string().min(3),
    action(options, arguments_) {
      gopts.help; // Boolean
      schema?._def.typeName; // ZodObjectDef
      // if you pass more than 1 argument to the command line, it won't be in `args`!
      console.log('add user', { gopts, options, args: arguments_ });
    },
  }),
  // Space-separated is also supported, but camelCase is recommended
  'user remove': defineCommand({
    description: 'Remove a user',
    options: defineOptions(
      z.object({
        force: z.boolean().default(false),
      }),
    ),
    args: z.string().min(3),
    action(options, [name]) {
      gopts.debug; // Boolean
      schema?._def.typeName; // ZodObjectDef
      console.log('remove user', { gopts, options, name });
    },
  }),
}));

// // CommandsFactory<TGlobalOptions, TCommands>
// function defineCommandGroup<
//   TGlobalOptions extends z.ZodObject<z.ZodRawShape>,
//   TCommands extends TypedCommandMap<TGlobalOptions>,
// >(
//   group: CommandsFactory<TGlobalOptions, TCommands>,
//   globalOptions: z.infer<TGlobalOptions>,
//   schema: TGlobalOptions
// ): TypedCommandMap<TGlobalOptions> {
//   return group(
//     globalOptions as z.infer<TGlobalOptions>,
//     schema as TGlobalOptions
//   ) as TypedCommandMap<TGlobalOptions>;
// }

export default defineConfig({
  globalOptions,
  //
  // ? NOTE: when using grouped commands (with `defineCommandsGroup`),
  // it cannot properly infer the type of "default command",
  // even tho it exists in the final `commands` object;
  // ? NOTE: so in such cases, you must use `as any` to mute TypeScript
  // defaultCommand: 'userAdd', // use `as any` only when mixing grouped commands and non-grouped ones
  // commands: userCommands,
  //

  // without global options
  // defaultCommand: 'default',
  // commands: {
  //   default: defineCommand({
  //     description: 'Default command',
  //     options: defineOptions(
  //       z.object({
  //         foo: z.string().default('bar'),
  //       })
  //     ),
  //     action: (opts) => {
  //       console.log('default command:', { opts });
  //     },
  //   }),
  // },

  //
  // defaultCommand: 'default',
  // commands: (gopts) => ({
  //   default: defineCommand({
  //     description: 'Default command',
  //     options: defineOptions(
  //       z.object({
  //         foo: z.string().default('bar'),
  //       })
  //     ),
  //     action: (opts) => {
  //       console.log('default command:', { gopts, opts });
  //     },
  //   }),
  // }),
  //
  // ? NOTE: mixing grouped commands with non-grouped ones breaks
  //      the `defaultCommand` inference of the grouped commands,
  //      so you must use `as any` to mute TypeScript, or use one from non-grouped commands
  //
  defaultCommand: 'build', // Or `defaultCommand: 'userAdd' as any,`
  commands: (globalOptions) => ({
    ...userCommands(globalOptions),
    serve: defineCommand({
      // The `name` field has precedence over the key, skip if you want to use the key
      // It's recommended to use object keys as names, and skip the `name` field
      name: 'serveme',
      aliases: ['s', 'dev'],
      description: 'Serve command',
      options: defineOptions(
        z.object({
          port: z.coerce.number().min(1024).default(3000),
          foobar: z.boolean().default(false),
        }),
        { p: 'port', f: 'foobar' },
      ),
      args: z.array(z.string()),
      action(options, params) {
        const [foo, bar = 'barry', qux = 'quxie'] = params;
        // Options is properly typed as { port: number, verbose: boolean }
        // args is properly typed as string[]
        options.port; // Number
        options.foobar; // Boolean
        foo; // String
        console.log('serve command has been called', {
          options,
          args: params,
          foo,
          bar,
          qux,
        });
      },
    }),
    port: defineCommand({
      name: 'port',
      description: 'Port command',
      args: z.number().min(1024).max(49_151).default(3000),
      options: defineOptions(z.object({})),
      action(_, [port]) {
        console.log('port command has been called:', { globalOptions, port });
        port.toExponential(); // Number
      },
    }),
    build: defineCommand({
      // Name: 'build',
      aliases: ['b', 'buid', 'bild', 'buidl'],
      description: 'Build command',
      options: defineOptions(
        z.object({
          watch: z.boolean().default(false),
          minify: z.boolean().default(true),
        }),
        { w: 'watch', m: 'minify', foo: 'minify' },
      ),
      action(options) {
        options.watch; // Boolean
        options.minify; // Boolean
        console.log('build cmd:', { options, globalOptions });
      },
    }),
    tupled: defineCommand({
      // Name: 'tupled',
      description: 'tupled command',
      options: defineOptions(
        z.object({
          quxie: z.boolean().default(false),
        }),
      ),
      args: z.tuple([z.string(), z.coerce.number().default(321)]),
      // .rest(z.coerce.number().default(321)),
      action(options, [path, number_]) {
        path.toUpperCase(); // String
        number_?.toExponential(); // Number
        // options.quxie; // boolean
        console.log('tupled command has been called:', {
          options,
          path,
          num: number_,
          // Port,
        });
        // [path, port]: [string, number]
        // No third parameter available
      },
    }),
  }),
});
