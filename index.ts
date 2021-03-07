/**
 * Command parameter type.
 */
export type CommandParameter = number | string | boolean;

/**
 * A list of parameters that can be passed to a command handling function.
 *
 * The consumer application should extend this interface to define command parameters.
 *
 * If a command parameter has a nullable type, it means that it can be made an optional parameter provided that there is
 * `defaultValue` property set to `null` in the parameter configuration.
 */
export interface CommandParameters {
	[name: string]: CommandParameter | null;
}

/**
 * Command handling function that takes a list of typed parameters and returns any result.
 *
 * The consumer application should implement command handling functions that can be assigned to this type.
 */
export type CommandFunction<T extends CommandParameters> = <U extends T>(parameters: U) => unknown;

/**
 * Abstract parameter configuration interface with no type restrictions.
 *
 * Normally shouldn't be used outside of this library.
 */
export interface AbstractParameter {
	/**
	 * Parameter type that will be used for value type conversion.
	 */
	type: "number" | "string" | "boolean";

	/**
	 * _Optional_. Default parameter value.
	 *
	 * If set, the corresponding command line argument can be omitted. If set to `null`, it means that the parameter
	 * is optional (the corresponding command parameter type should be nullable as well).
	 */
	defaultValue?: CommandParameter | null;

	/**
	 * _Optional_. Parameter command line alias.
	 *
	 * Usually a one letter string. Users can use parameter aliases prefixed with one dash instead of a full parameter
	 * name with two dashes.
	 */
	shorthand?: string;

	/**
	 * _Optional_. Parameter description.
	 *
	 * If set, the parameter will be listed in Usage Notes.
	 */
	description?: string;
}

/**
 * Parameter configuration interface with type constraints.
 */
export interface Parameter<T extends CommandParameter | null> extends AbstractParameter {
	type: T extends number ? "number" : T extends string ? "string" : T extends boolean ? "boolean" : never;
	defaultValue?: T extends null ? T | null : T;
}

/**
 * Parameters configuration that corresponds the command handler function parameters list.
 */
export type Parameters<T extends CommandParameters> = {
	[K in keyof T]: Parameter<T[K]>;
};

/**
 * Abstract command configuration interface with no type restrictions.
 *
 * Normally shouldn't be used outside of this library.
 */
export interface AbstractCommandConfig {
	/**
	 * Parameters configuration.
	 */
	parameters: Parameters<CommandParameters>;

	/**
	 * Command handling function.
	 */
	command: CommandFunction<CommandParameters>;

	/**
	 * _Optional_. Command description.
	 *
	 * If set, it will be displayed in Usage Notes.
	 */
	description?: string;
}

/**
 * Command configuration interface with parameter types constraints.
 */
export interface CommandConfig<T extends CommandParameters> extends AbstractCommandConfig {
	parameters: Parameters<T>;
	command: CommandFunction<T>;
}

/**
 * Commands configuration interface.
 * Shouldn't be used directly outside of this library because it has no type constraints.
 */
export interface CommandConfigs {
	[name: string]: AbstractCommandConfig;
}

/**
 * Argument value interface.
 */
export interface Arg {
	/**
	 * Raw argument value taken from command line input.
	 */
	rawValue: string;

	/**
	 * Typed argument value.
	 */
	value?: CommandParameter;
}

/**
 * Arguments list.
 */
export interface Args {
	[name: string]: Arg;
}

/**
 * Command handling function with applied command parameters.
 */
export type CommandExecutable = () => unknown;

/**
 * Command session.
 */
export class Command {
	/**
	 * Constructor.
	 *
	 * @param commandConfigs - Command configurations consisting of command executables and their parameter requirements.
	 */
	constructor(
		private readonly commandConfigs: CommandConfigs,
	) {}

	/**
	 * Gets command name from the command line input. Returns "default" if there is no command name provided.
	 *
	 * @param argv - Command line input normally taken from `process.argv`.
	 */
	private getCommandName(argv: Array<string>): string {
		// Assuming there is always an explicit command name provided, for now.
		// TODO: Add support for "default" command when there is no explicit command name.
		// TODO: Throw an error when the provided command has incorrect name (i.e. dashed string or has spaces).
		return argv[2];
	}

	/**
	 * Gets raw arguments from the command line input.
	 *
	 * @param argv - Command line input normally taken from `process.argv`.
	 */
	private getRawArgs(argv: Array<string>): Array<string> {
		const commandName = this.getCommandName(argv);

		if (commandName === "default") {
			return argv.slice(2);
		}

		return argv.slice(3);
	}

	/**
	 * Gets specific command configuration using provided command name.
	 *
	 * @param commandName - Command name.
	 */
	private getCommandConfig(commandName: string): CommandConfig<CommandParameters> {
		const commandConfig = this.commandConfigs[commandName];

		if (commandConfig === undefined) {
			throw new Error(`Unknown command: ${commandName}`);
		}

		return commandConfig;
	}

	/**
	 * Parses raw arguments into an arguments list consisting of raw string values only.
	 *
	 * Arguments can only be present in a `--name` or `--name=value` form.
	 *
	 * @param rawArgs - Raw arguments.
	 */
	private getArgs(rawArgs: Array<string>): Args {
		const args = rawArgs.reduce<Args>((result, arg) => {
			const matches = arg.match(/^--([a-zA-Z0-9]+)(?:=(.+))?/);

			if (matches === null) {
				throw new Error(`Unknown argument: ${arg}`);
			}

			result[matches[1]] = {
				rawValue: matches[2],
			};

			return result;
		}, {});

		return args;
	}

	/**
	 * Populates arguments list with typed values using provided parameters configuration containing types information
	 * and default values.
	 *
	 * Throws an error if not every argument provided or there are unknown arguments.
	 *
	 * @param commandConfigParameters - Parameters configuration taken from a command configuration.
	 * @param args - Arguments list with raw values.
	 */
	private getCommandParameters(commandConfigParameters: Parameters<CommandParameters>, args: Args): CommandParameters {
		const missingArgs = Object.entries(commandConfigParameters).filter(([parameterName, parameter]) => {
			if (args[parameterName] === undefined) {
				args[parameterName] = {};
			}

			if (parameter.defaultValue !== undefined) {
				args[parameterName].value = parameter.defaultValue;
			}

			if (args[parameterName].rawValue !== undefined) {
				args[parameterName].value = args[parameterName].rawValue; // TODO: Convert to a specific type.
			}

			return args[parameterName].value === undefined;
		});

		const unknownArgs = Object.entries(args).filter(([argName, arg]) => {
			return arg.value === undefined;
		});

		if (missingArgs.length > 0) {
			throw new Error(`Missing arguments: ${missingArgs.map(([parameterName]) => parameterName).join(", ")}`);
		}

		if (unknownArgs.length > 0) {
			throw new Error(`Unknown arguments: ${unknownArgs.map(([argName]) => argName).join(", ")}`);
		}

		const commandParameters = Object.entries(args).reduce<CommandParameters>((result, [argName, arg]) => {
			result[argName] = arg.value!;

			return result;
		}, {});

		return commandParameters;
	}

	/**
	 * Generates a usage information based on provided command configurations.
	 */
	public getUsageNotes(): string {
		return "";
	}

	/**
	 * Combines provided command configurations and command line input to make a command function ready to be called.
	 *
	 * @param argv - Command line input normally taken from `process.argv`.
	 */
	public getCommandExecutable(argv: Array<string>): CommandExecutable {
		const commandName = this.getCommandName(argv);
		const rawArgs = this.getRawArgs(argv);

		const commandConfig = this.getCommandConfig(commandName);
		const args = this.getArgs(rawArgs);

		const commandParameters = this.getCommandParameters(commandConfig.parameters, args);

		return commandConfig.command.bind(null, commandParameters);
	}
}

/**
 * Runs a command using predefined command configurations and data taken from the command line input.
 *
 * @param commandConfigs - Command configurations consisting of command executables and their parameter requirements.
 * @param argv - Command line input normally taken from `process.argv`.
 */
export function run(commandConfigs: CommandConfigs): unknown {
	const command = new Command(commandConfigs);

	let commandExecutable: CommandExecutable;

	try {
		commandExecutable = command.getCommandExecutable(process.argv);
	} catch (e) {
		console.log(e.message);
		console.log(command.getUsageNotes());

		process.exit(1);
	}

	try {
		return commandExecutable();
	} catch (e) {
		console.log(e);

		process.exit(1);
	}
}
