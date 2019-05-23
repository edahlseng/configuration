/* @flow */

import test from "ava";
import { State, Output } from "eff";
import stream from "stream";

import { run } from "./index.js";

test.cb("Prints help information", t => {
	let outputString = "";
	class VariableStream extends stream.Writable {
		_write(chunk, encoding, next) {
			outputString += chunk.toString();
			next();
		}
	}

	run({
		scriptTitle: "Configuration",
		scriptDescription: "Testing the help output.",
		options: { one: {}, two: {} },
		process: {
			env: {},
			argv: ["node", "configuration", "--help"],
		},
		effectInterpreters: {
			state: State.interpretState,
			output: Output.interpretOutput(new VariableStream()),
		},
		callback: () => {
			t.is(
				outputString,
				`Invalid arguments.

Configuration – Testing the help output.

Usage: configuration [options] [command] [command arguments]

Options:
  --help, -h    Prints this help message

Commands:
  help    Prints this help message
  setup   Sets up configuration files

To learn more about a given command, run: configuration [command] help
`,
			);
			t.end();
		},
	});
});
