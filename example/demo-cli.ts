import { getCommands, processConfig } from '../src/index.ts';
import config from './demo-config.ts';

const cfg = processConfig(config, process.argv.slice(2));

// ✅ Nested commands work
// processConfig(cfg, ["--debug", "user", "add", "john", "--age=30"]);
// processConfig(cfg, ["--debug", "user", "remove", "john", "--force"]);

// // ✅ Regular commands work
// processConfig(cfg, ["--verbose", "serve", "src", "--port=3000"]);

// // ✅ Commands with aliases work
// processConfig(cfg, ["--debug", "s", "src", "--port=3000"]);

console.log('matched command:', cfg._kind);

// console.log(cfg.globalOptions);
cfg.command.action(cfg.options, cfg.args);

console.log(getCommands(config));

// if (cfg._kind === 'serve') {
//   cfg.args; //  NOTE: must have between 1 and 3 items - all strings
//   cfg.options.port;
//   cfg.options.foobar;
//   // cfg.globalOptions.debug;
//   console.log('typeof cfg.args', typeof cfg.args);
//   cfg.command.action(cfg.options, ...cfg.args);
// } else if (cfg._kind === 'build') {
//   cfg.args; //  NOTE: must NOT have any args but be empty array!
//   // FIXME: ^ cfg.args is NOT properly typed based on the args schema!
//   cfg.options.watch;
//   cfg.options.minify;
//   cfg.command.action(cfg.options, ...cfg.args);
// } else if (cfg._kind === 'port') {
//   cfg.args; // NOTE: must be array with a single item, of type `number`
//   cfg.options; // NOTE: must NOT have any options but be empty object!
//   cfg.command.args?._def.typeName;
//   cfg.command.action(cfg.options, ...cfg.args);
// } else if (cfg._kind === 'tupled') {
//   cfg.args; // NOTE: must have exactly 2 items - first string, second number
//   cfg.options.quxie;
//   cfg.command.action(cfg.options, ...cfg.args);
// } else if (cfg._kind === 'userAdd') {
//   cfg.args; // NOTE: must be string and have at least 3 characters
//   cfg.options.role; // NOTE: must be either 'admin' or 'user'
//   cfg.options.age; // NOTE: must be a positive integer
//   cfg.options.active; // NOTE: must be a boolean
//   cfg.options.createdAt; // NOTE: must be a date
//   cfg.command.action(cfg.options, ...cfg.args);
// }
