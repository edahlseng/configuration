/* @flow */

const addNpmPrefixToState = pipeWith(chain)([
	always(ChildProcess.exec("npm prefix", { cwd: process.env.INIT_CWD })),
	map(trim),
	State.put(""),
]);

export const addConfigurationFiles = ({
	options = {},
	defaults = [],
	process,
}: {
	options?: { [string]: {} },
	defaults?: {
		commit?: {},
		json?: {},
		prettier?: {},
	},
	process: { env: { [string]: ?string }, argv: Array<string> },
}) =>
	addNpmPrefixToState
		.chain(projectRootDirectory =>
			chosenOptions(assocObject(options, defaultOptions))(process.argv)
				.map(concat(values(assocObject(defaults, defaultDefaults))))
				.map(map(assoc("projectRootDirectory")(projectRootDirectory)))
				.map(map(setupOption))
				.map(concatAll),
		)
		.chain(futureSequential);

const setup = pipeWith(chain)([
	// always(getPath(["process", "argv"]).map(nth(3))),
	validatedInput,
	cond([[equals("setup"), setup], [T, invalidArguments]]),
]);
