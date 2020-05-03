export type CommandParameter = number | string | boolean;

export interface CommandParameters {
	[name: string]: CommandParameter;
}

export type CommandFunction = (parameters: any) => any;

export interface AbstractParameter {
	type: "number" | "string" | "boolean";
	defaultValue?: CommandParameter;
	description?: string;
}

export interface GenericParameter<T extends CommandParameter> extends AbstractParameter {
	type: T extends number ? "number" : T extends string ? "string" : T extends boolean ? "boolean" : never;
	defaultValue?: T;
}

export type Parameters<T extends CommandParameters> = {
	[K in keyof T]: GenericParameter<T[K]>;
};

export interface AbstractCommandConfig {
	parameters: Parameters<any>;
	command: CommandFunction;
}

export interface GenericCommandConfig<P extends CommandParameters, C extends CommandFunction> extends AbstractCommandConfig {
	parameters: Parameters<P>;
	command: C;
}

export type CommandConfig<C extends CommandFunction> = C extends (parameters: infer P) => any ? P extends CommandParameters ? GenericCommandConfig<P, C> : never : never;

export interface CommandConfigs {
	[name: string]: GenericCommandConfig<CommandParameters, CommandFunction>;
}

export interface Arg {
	rawValue?: string;
	value?: CommandParameter;
}

export interface Args {
	[name: string]: Arg;
}

function getCommandConfig(commandConfigs: CommandConfigs): GenericCommandConfig<any, any> {
	const commandName = process.argv[2];

	if (commandName === undefined) {
		throw new Error("No command provided");
	}

	const commandConfig = commandConfigs[commandName];

	if (commandConfig === undefined) {
		throw new Error(`Unknown command: ${commandName}`);
	}

	return commandConfig;
}

function getArgs(): Args {
	const args = process.argv.slice(3).reduce<Args>((result, arg) => {
		const matches = arg.match(/^--([a-zA-Z0-9]+)(?:=(.+))?/);

		if (matches !== null) {
			result[matches[1]] = {
				rawValue: matches[2],
			};
		}

		return result;
	}, {});

	return args;
}

function getCommandParameters(commandConfig: GenericCommandConfig<any, any>, args: Args): CommandParameters {
	const missingArgs = Object.entries(commandConfig.parameters).filter(([parameterName, parameter]) => {
		if (args[parameterName] === undefined) {
			args[parameterName] = {};
		}

		if (parameter.defaultValue !== undefined) {
			args[parameterName].value = parameter.defaultValue;
		}

		if (args[parameterName].rawValue !== undefined) {
			args[parameterName].value = args[parameterName].rawValue; // TODO: convert
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

export async function run(commandConfigs: CommandConfigs): Promise<any> {
	const commandConfig = getCommandConfig(commandConfigs);
	const args = getArgs();

	const commandParameters = getCommandParameters(commandConfig, args);

	const commandResult = commandConfig.command(commandParameters);

	return Promise.resolve(commandResult);
}
