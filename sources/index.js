/* @flow */

import pathUtils from "path";
import { always, cond, equals, nth, path, pipeWith, T } from "ramda";
import {
	chain as chainEff,
	FileSystem,
	Output,
	run as runEff,
	State,
} from "eff";

import setup from "./setup.js";

const getPath = pathToGet => State.get().map(path(pathToGet));

const chain = (a, b) => chainEff(a)(b);

const printHelpOutput = pipeWith(chain)([
	always(getPath(["scriptTitle"])),
	Output.putString,
	always(Output.putString(" – ")),
	always(getPath(["scriptDescription"])),
	Output.putString,
	always(Output.putString("\n\n")),
	always(Output.putString("Usage: ")),
	always(
		getPath(["process", "argv"])
			.map(nth(1))
			.map(pathUtils.basename),
	),
	Output.putString,
	always(Output.putStringLine(" [options] [command] [command arguments]")),
	always(Output.putStringLine("")),
	always(Output.putStringLine("Options:")),
	always(Output.putStringLine("  --help, -h    Prints this help message")),
	always(Output.putStringLine("")),
	always(Output.putStringLine("Commands:")),
	always(Output.putStringLine("  help    Prints this help message")),
	always(Output.putStringLine("  setup   Sets up configuration files")),
	always(Output.putStringLine("")),
	always(
		getPath(["process", "argv"])
			.map(nth(1))
			.map(pathUtils.basename),
	),
	x =>
		Output.putStringLine(
			`To learn more about a given command, run: ${x} [command] --help`,
		),
]);

const invalidArguments = pipeWith(chain)([
	always(Output.putStringLine("Invalid arguments.")),
	always(Output.putStringLine("")),
	printHelpOutput,
]);

const main = pipeWith(chain)([
	always(getPath(["process", "argv"])),
	always(getPath(["process", "argv"]).map(nth(2))),
	cond([[equals("setup"), setup], [T, invalidArguments]]),
]);

export const run = ({
	scriptTitle,
	scriptDescription,
	options,
	defaults = {},
	process,
	effectInterpreters = {
		state: State.interpretState,
		output: Output.interpretOutputStdOut,
		fileSystem: FileSystem.interpretLocalFileSystem(""),
	},
	callback,
}: {
	scriptTitle: string,
	scriptDescription: string,
	options?: {
		[string]: {
			alternateNames?: [],
			description: string,
			configurationFiles?: Array<{ path: string, content: string }>,
			jsonData: Array<| {
						filePath: string,
						dataPath: Array<string>,
						content: string,
				  }
				| {
						filePath: string,
						dataPath: Array<string>,
						modify: string => string,
				  },>,
		},
	},
	defaults?: { [string]: {} },
	process: {
		env: { [string]: ?string },
		argv: Array<string>,
		cwd: string,
		...
	},
	callback: Function,
	effectInterpreters?: { state: any, output: any, fileSystem: any },
}) =>
	runEff([
		effectInterpreters.state({
			scriptTitle,
			scriptDescription,
			process,
			options,
			defaults,
		}),
		effectInterpreters.output,
		effectInterpreters.fileSystem,
	])(callback)(main());
