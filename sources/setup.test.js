/* @flow */

import test from "ava";
import { FileSystem, State, Output } from "eff";
import stream from "stream";

import { run } from "./index.js";

test.cb("Setup - Prints help information", t => {
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
		options: {
			one: { description: 'The description for "one"' },
			two: { description: 'The description for "two"' },
			three: { description: "The third description" },
		},
		process: {
			env: {},
			argv: ["node", "configuration", "setup", "--help"],
		},
		effectInterpreters: {
			state: State.interpretState,
			output: Output.interpretOutput(new VariableStream()),
			fileSystem: FileSystem.interpretMockFileSystem({
				workingDirectory: "/",
				startingFileSystem: {},
			}),
		},
		callback: () => {
			t.is(
				outputString,
				`Configuration – Testing the help output.

Setup

Usage: configuration setup [setup options] [setup arguments]

Options:
  --help, -h    Prints this help message

Arguments:
  one      The description for "one"
  two      The description for "two"
  three    The third description

To learn more about this utility (beyond the setup command), run: configuration --help
`,
			);
			t.end();
		},
	});
});

test.cb("Setup - Handles no arguments", t => {
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
		options: {
			one: { description: 'The description for "one"' },
			two: { description: 'The description for "two"' },
			three: { description: "The third description" },
		},
		process: {
			env: {},
			argv: ["node", "configuration", "setup"],
		},
		effectInterpreters: {
			state: State.interpretState,
			output: Output.interpretOutput(new VariableStream()),
			fileSystem: FileSystem.interpretMockFileSystem({
				workingDirectory: "/",
				startingFileSystem: {},
			}),
		},
		callback: () => {
			t.is(
				outputString,
				`Error: No arguments specified. See below for correct usage.

Configuration – Testing the help output.

Setup

Usage: configuration setup [setup options] [setup arguments]

Options:
  --help, -h    Prints this help message

Arguments:
  one      The description for "one"
  two      The description for "two"
  three    The third description

To learn more about this utility (beyond the setup command), run: configuration --help
`,
			);
			t.end();
		},
	});
});

test.cb("Setup - Handles invalid arguments", t => {
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
		options: {
			one: { description: 'The description for "one"' },
			two: { description: 'The description for "two"' },
			three: { description: "The third description" },
		},
		process: {
			env: {},
			argv: ["node", "configuration", "setup", "apple"],
		},
		effectInterpreters: {
			state: State.interpretState,
			output: Output.interpretOutput(new VariableStream()),
			fileSystem: FileSystem.interpretMockFileSystem({
				workingDirectory: "/",
				startingFileSystem: {},
			}),
		},
		callback: () => {
			t.is(
				outputString,
				`Error: apple is an invalid argument. See below for correct usage.

Configuration – Testing the help output.

Setup

Usage: configuration setup [setup options] [setup arguments]

Options:
  --help, -h    Prints this help message

Arguments:
  one      The description for "one"
  two      The description for "two"
  three    The third description

To learn more about this utility (beyond the setup command), run: configuration --help
`,
			);
			t.end();
		},
	});
});

test.cb("Setup - Handles valid arguments", t => {
	let outputString = "";
	class VariableStream extends stream.Writable {
		_write(chunk, encoding, next) {
			outputString += chunk.toString();
			next();
		}
	}

	let fileSystem = { "/home/me/this-is-a-second-test.txt": "Original content" };

	run({
		scriptTitle: "Configuration",
		scriptDescription: "Testing the help output.",
		options: {
			one: {
				description: 'The description for "one"',
				configurationFiles: [
					{ path: "./this-is-a-test.txt", content: "Hello, World!" },
					{ path: "./this-is-a-second-test.txt", content: "New content" },
				],
			},
			two: { description: 'The description for "two"' },
			three: { description: "The third description" },
		},
		process: {
			env: {},
			argv: ["node", "configuration", "setup", "apple"],
			cwd: "/home/me",
		},
		effectInterpreters: {
			state: State.interpretState,
			output: Output.interpretOutput(new VariableStream()),
			fileSystem: FileSystem.interpretMockFileSystem({
				workingDirectory: "/",
				startingFileSystem: fileSystem,
				onUpdate: newFileSystem => {
					fileSystem = newFileSystem;
				},
			}),
		},
		callback: () => {
			t.is(fileSystem["/home/me/this-is-a-test.txt"], "Hello, World!");
			t.is(
				fileSystem["/home/me/this-is-a-second-test.txt"],
				"Original content",
			);
			t.end();
		},
	});
});
