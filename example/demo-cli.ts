/**
 * Demo CLI application showcasing Zodest features.
 *
 * Examples:
 * - Basic command: bun demo-cli.ts serve src --port=3000
 * - Using aliases: bun demo-cli.ts s src --port=3000
 * - Nested commands: bun demo-cli.ts user add john --age=30
 * - Global options: bun demo-cli.ts --debug user remove john --force
 */

import { getCommands, processConfig } from '../src/index.ts';
import config from './demo-config.ts';

/**
 * Process command line arguments using the demo configuration.
 * Demonstrates how to handle the configuration result and execute commands.
 */
const cfg = processConfig(config, process.argv.slice(2));

// Log the matched command for demonstration
console.log('matched command:', cfg._kind);

// Execute the command's action with validated options and arguments
cfg.command.action(cfg.options, cfg.args);

// Display available commands (useful for help text)
console.log(getCommands(config));

/**
 * Example usages (commented out):
 *
 * // Nested commands with global options
 * processConfig(cfg, ["--debug", "user", "add", "john", "--age=30"]);
 * processConfig(cfg, ["--debug", "user", "remove", "john", "--force"]);
 *
 * // Regular commands with options
 * processConfig(cfg, ["--verbose", "serve", "src", "--port=3000"]);
 *
 * // Commands with aliases
 * processConfig(cfg, ["--debug", "s", "src", "--port=3000"]);
 *
 * // Type-safe access to command results:
 * if (cfg._kind === 'serve') {
 *   cfg.args;  // string[]
 *   cfg.options.port;  // number
 *   cfg.options.foobar;  // boolean
 *   cfg.command.action(cfg.options, ...cfg.args);
 * }
 */
