/* @flow */

import pathUtils from "path";
import {
	always,
	cond,
	equals,
	flip,
	keys,
	nth,
	path,
	pipeWith,
	T,
} from "ramda";
import { Eff, Output, run as runEff, State } from "eff";

import setup from "./setup.js";

const getPath = pathToGet => State.get().map(path(pathToGet));

const map = (x, f: Function) => Eff.chain(x, y => Eff.pure(f(y)));
const mapWith = flip(map);

const chain = (a, b) => Eff.chain(b, a);

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
			`To learn more about a given command, run: ${x} [command] help`,
		),
]);

const invalidArguments = pipeWith(chain)([
	always(Output.putStringLine("Invalid arguments.")),
	always(Output.putStringLine("")),
	printHelpOutput,
]);

const main = pipeWith(chain)([
	always(getPath(["process", "argv"]).map(nth(2))),
	cond([[equals("setup"), setup], [T, invalidArguments]]),
]);

export const run = ({
	scriptTitle,
	scriptDescription,
	options = {},
	defaults = {},
	process,
	effectInterpreters = {
		state: State.interpretState,
		output: Output.interpretOutputStdOut,
	},
	callback,
}: {
	scriptTitle: string,
	scriptDescription: string,
	options?: { [string]: {} },
	defaults?: { [string]: {} },
	process: { env: { [string]: ?string }, argv: Array<string>, ... },
	callback: Function,
	effectInterpreters?: { state: any, output: any },
}) =>
	runEff(
		effectInterpreters.state({
			scriptTitle,
			scriptDescription,
			process,
			options,
			defaults,
		}),
		effectInterpreters.output,
	)(callback)(main());
