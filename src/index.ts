/**
 * Command parameter type.
 */
export type CommandParameter = boolean | number | string;

/**
 * A list of parameters that can be passed to a command handling function.
 *
 * The consumer application should extend this interface to define command parameters.
 *
 * If a command parameter has a nullable type, it means that it can be made an optional parameter provided that there is
 * `defaultValue` property set to `null` in the corresponding parameter configuration.
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
 * Command handling function with applied command parameters.
 */
export type CommandExecutable = () => unknown;

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
 * Parameters configuration that corresponds to the command handler function parameters list.
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
 * Raw arguments list.
 */
export interface RawArguments {
	[name: string]: string | null;
}

const COMMAND_NAME_REGEXP = /^[a-zA-Z](?:[a-zA-Z0-9_-]*)?$/;
const COMMAND_ARGUMENT_NAME_REGEXP = /^--([a-zA-Z0-9](?:[a-zA-Z0-9_-]*)?)(?:=(.+))?$/;
const COMMAND_ARGUMENT_SHORTHAND_REGEXP = /^-([a-zA-Z0-9](?:[a-zA-Z0-9_-]*)?)$/;

/**
 * Command session.
 */
export class Command {
	/**
	 * Constructor.
	 *
	 * @param commandConfigs - Command configurations consisting of command executables and their parameter
	 * requirements.
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
		// If the second element exists and matches the command name regexp, take it as a command name.
		if (
			argv[2] !== undefined &&
			argv[2].match(COMMAND_NAME_REGEXP) !== null
		) {
			return argv[2];
		}

		// If it doesn't exist or matches one of valid argument formats, take "default" as a command name.
		if (
			argv[2] === undefined ||
			argv[2].match(COMMAND_ARGUMENT_NAME_REGEXP) !== null ||
			argv[2].match(COMMAND_ARGUMENT_SHORTHAND_REGEXP) !== null
		) {
			return "default";
		}

		throw new Error("No command name provided.");
	}

	/**
	 * Gets arguments list from the command line input.
	 *
	 * @param argv - Command line input normally taken from `process.argv`.
	 */
	private getCommandLineArguments(argv: Array<string>, commandName: string): Array<string> {
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
	 * Parses command line arguments into an arguments list consisting of raw values only. No configuration checks
	 * at this stage, format validity checks only.
	 *
	 * Arguments can only be present in a `--name` or `--name=value` form.
	 *
	 * @param commandLineArguments - Command line arguments.
	 */
	private getRawArguments(commandLineArguments: Array<string>): RawArguments {
		let skipNextArg = false;

		const rawArguments = commandLineArguments.reduce<RawArguments>((result, commandLineArg, index) => {
			// The current element has been taken into account on the previous cycle, skip it.
			if (skipNextArg) {
				skipNextArg = false;

				return result;
			}

			const matches = commandLineArg.match(COMMAND_ARGUMENT_NAME_REGEXP) ?? commandLineArg.match(COMMAND_ARGUMENT_SHORTHAND_REGEXP);

			if (matches === null) {
				throw new Error(`Invalid argument: ${commandLineArg}`);
			}

			// If the current element matches the regexp and there is a value in it, take it.
			if (matches[2] !== undefined) {
				result[matches[1]] = matches[2];

				return result;
			}

			// If the current element matches the regexp and the next element doesn't, take the next element as a value.
			if (
				commandLineArguments[index + 1] !== undefined &&
				commandLineArguments[index + 1].match(COMMAND_ARGUMENT_NAME_REGEXP) === null &&
				commandLineArguments[index + 1].match(COMMAND_ARGUMENT_SHORTHAND_REGEXP) === null
			) {
				result[matches[1]] = commandLineArguments[index + 1];

				skipNextArg = true;

				return result;
			}

			// If the current element matches the regexp but there is no value, leave it with no value. It might be
			// a boolean flag.
			result[matches[1]] = null;

			return result;
		}, {});

		return rawArguments;
	}

	/**
	 * Populates arguments list with typed values using provided parameters configuration containing types information
	 * and default values.
	 *
	 * Throws an error if not every argument provided or there are unknown arguments.
	 *
	 * @param commandParametersConfig - Parameters configuration taken from a command configuration.
	 * @param rawArguments - Arguments list with raw values.
	 */
	private getCommandParameters(commandParametersConfig: Parameters<CommandParameters>, rawArguments: RawArguments): CommandParameters {
		const commandParameters: CommandParameters = {};

		// Getting through the parameters configuration trying to figure out if we have all the data.
		const missingArguments = Object.entries(commandParametersConfig).filter(([parameterName, parameter]) => {
			const rawArgument = rawArguments[parameterName];

			// All boolean parameters are false by default.
			if (parameter.type === "boolean") {
				commandParameters[parameterName] = false;
			}

			// Apply default value if it exists.
			if (parameter.defaultValue !== undefined) {
				commandParameters[parameterName] = parameter.defaultValue;
			}

			// Apply command line input value if it exists.
			if (rawArgument !== undefined && rawArgument !== null) {
				switch (parameter.type) {
					case "boolean": {
						if (["true", "yes", "y", "on", "1"].includes(rawArgument.toLowerCase())) {
							commandParameters[parameterName] = true;

							break;
						}

						if (["false", "no", "n", "off", "0"].includes(rawArgument.toLowerCase())) {
							commandParameters[parameterName] = false;

							break;
						}

						throw new Error(`Invalid boolean value provided for parameter ${parameterName}: ${rawArgument}`);
					}

					case "number": {
						const numberValue = Number(rawArgument);

						if (Number.isNaN(numberValue)) {
							throw new Error(`Invalid numeric value provided for parameter ${parameterName}: ${rawArgument}`);
						}

						commandParameters[parameterName] = numberValue;

						break;
					}

					case "string": {
						commandParameters[parameterName] = rawArgument;

						break;
					}
				}
			}

			// Handling a special case for boolean flags with no value.
			if (rawArgument === null && parameter.type === "boolean") {
				commandParameters[parameterName] === true;
			}

			return commandParameters[parameterName] === undefined;
		});

		const unknownArguments = Object.keys(rawArguments).filter((argName) => {
			return !Object.keys(commandParametersConfig).includes(argName);
		});

		if (missingArguments.length > 0) {
			throw new Error(`Missing arguments: ${missingArguments.map(([parameterName]) => parameterName).join(", ")}`);
		}

		if (unknownArguments.length > 0) {
			throw new Error(`Unknown arguments: ${unknownArguments.map((argName) => argName).join(", ")}`);
		}

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
		const commandLineArguments = this.getCommandLineArguments(argv, commandName);

		const commandConfig = this.getCommandConfig(commandName);
		const rawArguments = this.getRawArguments(commandLineArguments);

		const commandParameters = this.getCommandParameters(commandConfig.parameters, rawArguments);

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
