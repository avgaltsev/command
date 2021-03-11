import { Command, CommandParameters, CommandConfig, CommandConfigs } from ".";

interface DefaultTestCommandParameters extends CommandParameters {
	booleanParam: boolean;
	numberParam: number;
	stringParam: string;
	optionalBooleanParam: boolean | null;
	optionalNumberParam: number | null;
	optionalStringParam: string | null;
}

function defaultTestCommand(parameters: DefaultTestCommandParameters): number {
	console.log(
		parameters.booleanParam,
		parameters.numberParam,
		parameters.stringParam,
		parameters.optionalBooleanParam,
		parameters.optionslNumberParam,
		parameters.optionalStringParam,
	);

	return 1;
}

const defaultTestCommandConfig: CommandConfig<DefaultTestCommandParameters> = {
	parameters: {
		booleanParam: {
			type: "boolean",
		},

		numberParam: {
			type: "number",
		},

		stringParam: {
			type: "string",
		},

		optionalBooleanParam: {
			type: "boolean",
		},

		optionalNumberParam: {
			type: "number",
		},

		optionalStringParam: {
			type: "string",
		},
	},

	command: defaultTestCommand,
};

interface AnotherTestCommandParameters extends CommandParameters {
	booleanParam: boolean;
	numberParam: number;
	stringParam: string;
	optionalBooleanParam: boolean | null;
	optionalNumberParam: number | null;
	optionalStringParam: string | null;
}

function anotherTestCommand(parameters: AnotherTestCommandParameters): number {
	console.log(
		parameters.booleanParam,
		parameters.numberParam,
		parameters.stringParam,
		parameters.optionalBooleanParam,
		parameters.optionslNumberParam,
		parameters.optionalStringParam,
	);

	return 1;
}

const anotherTestCommandConfig: CommandConfig<AnotherTestCommandParameters> = {
	parameters: {
		booleanParam: {
			type: "boolean",
		},

		numberParam: {
			type: "number",
		},

		stringParam: {
			type: "string",
		},

		optionalBooleanParam: {
			type: "boolean",
		},

		optionalNumberParam: {
			type: "number",
		},

		optionalStringParam: {
			type: "string",
		},
	},

	command: anotherTestCommand,
};

const commandConfigs: CommandConfigs = {
	default: defaultTestCommandConfig,
	test: anotherTestCommandConfig,
};

describe("Command", () => {
	it("should instantiate", () => {
		const command = new Command(commandConfigs);

		expect(command).toBeTruthy();
	});
});
