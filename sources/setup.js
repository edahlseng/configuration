/* @flow */

import {
	always,
	applySpec,
	complement,
	concat,
	cond,
	either,
	filter,
	flip,
	has,
	includes,
	isEmpty,
	keys,
	map,
	max,
	nth,
	path,
	pipe,
	pipeWith,
	prop,
	propEq,
	propSatisfies,
	reduce,
	reject,
	slice,
	T,
	toPairs,
} from "ramda";
import pathUtils from "path";
import {
	chain as chainEff,
	FileSystem,
	map as mapEff,
	pure,
	Output,
	State,
} from "eff";

const isIn = flip(has);
const from = flip(prop);

const chain = (a, b) => chainEff(a)(b);
const apply = mf => ma => mf.chain(f => ma.map(f));
const lift = f => x => y => apply(mapEff(f)(x))(y);

const getPath = pathToGet => State.get().map(path(pathToGet));
const isNotEmpty = complement(isEmpty);

// TODO: this is a hacky implementation. We could just take the first element and make that the start of the eff chain rather than lazily choosing pure(null)
// TODO: this should really probably be named join? mmm, not quite, as join would imply joining the contents of it
const combine = effs =>
	reduce((effChain, nextEff) =>
		effChain.chain(previousResults =>
			nextEff.chain(nextResult => pure(previousResults.concat([nextResult]))),
		),
	)(pure([]))(effs);

// const addNpmPrefixToState = pipeWith(chain)([
// 	always(ChildProcess.exec("npm prefix", { cwd: process.env.INIT_CWD })),
// 	map(trim),
// 	State.put(""),
// ]);

const setUpConfigurationFile = ({ path, content, modify }) =>
	getPath(["npmPrefix"]);
modify
	? FileSystem.readFile(path)
			.map(modify)
			.chain(FileSystem.writeFile(path))
	: FileSystem.writeFile(path)(content);

const setupOption = ({ configurationFiles = [], jsonData = [] }) =>
	// concatAll([
	configurationFiles.map(setUpConfigurationFile);
// jsonData.map(setupJsonData),
// ]);

export const setupOptions = ({
	validOptionNames,
}: {
	validOptionNames: Array<string>,
}) =>
	pipe(
		always(getPath(["options"])),
		mapEff(options => map(from(options))(validOptionNames)),
		lift(concat)(getPath(["defaults"]).map(keys)),
		mapEff(map(setupOption)),
		chain(combine),
	)();
// addNpmPrefixToState
// 	.chain(projectRootDirectory =>
// 		chosenOptions(assocObject(options, defaultOptions))(process.argv)
// 			.map(concat(values(assocObject(defaults, defaultDefaults))))
// 			.map(map(assoc("projectRootDirectory")(projectRootDirectory)))
// 			.map(map(setupOption))
// 			.map(concatAll),
// 	)
// 	.chain(futureSequential);

const optionNameMapperFromOptions = pipe(
	toPairs,
	reduce((optionsMap, [optionName, option]) => ({
		...optionsMap,
		[optionName]: optionName,
		...(option.alternateNames || []).reduce(
			(mapper, alternateName) => ({
				...mapper,
				[alternateName]: optionName,
			}),
			{},
		),
	}))({}),
);

const validatedInput = pipe(
	always(
		combine([
			getPath(["process", "argv"]).map(slice(3)(Infinity)),
			getPath(["options"]).map(optionNameMapperFromOptions),
		]),
	),
	mapEff(
		applySpec({
			help: pipe(
				nth(0),
				either(includes("--help"), includes("-h")),
			),
			validOptionNames: ([args, mapper]) =>
				pipe(
					filter(isIn(mapper)),
					map(from(mapper)),
				)(args),
			invalidOptionNames: ([args, mapper]) => reject(isIn(mapper))(args),
		}),
	),
);

const print = x => always(Output.putString(x));
const printLine = x => always(Output.putStringLine(x));

const printScriptTitleAndDescriptionLine = pipeWith(chain)([
	always(getPath(["scriptTitle"])),
	Output.putString,
	print(" – "),
	always(getPath(["scriptDescription"])),
	Output.putString,
	print("\n"),
]);

const printUsageLine = pipeWith(chain)([
	print("Usage: "),
	always(
		getPath(["process", "argv"])
			.map(nth(1))
			.map(pathUtils.basename),
	),
	Output.putString,
	print(" setup [setup options] [setup arguments]\n"),
]);

const transform = f => x => pure(f(x));

const printArgumentAndDescriptionLines = pipeWith(chain)([
	always(getPath(["options"])),
	transform(toPairs),
	transform(optionPairs => {
		const longestOptionNameLength = reduce((longestNameLength, pair) =>
			max(longestNameLength)(pair[0].length),
		)(0)(optionPairs);
		return map(pair =>
			pair.concat([" ".repeat(longestOptionNameLength - pair[0].length)]),
		)(optionPairs);
	}),
	transform(
		map(([option, details, namePadding]) =>
			Output.putStringLine(
				`  ${option}${namePadding}    ${details.description}`,
			),
		),
	),
	combine,
]);

const printHelpOutput = pipeWith(chain)([
	printScriptTitleAndDescriptionLine,
	printLine(""),
	printLine("Setup"),
	printLine(""),
	printUsageLine,
	printLine(""),
	printLine("Options:"),
	printLine("  --help, -h    Prints this help message"),
	printLine(""),
	printLine("Arguments:"),
	printArgumentAndDescriptionLines,
	printLine(""),
	printLine(
		"To learn more about this utility (beyond the setup command), run: configuration --help",
	),
]);

const noArgumentsSpecified = pipeWith(chain)([
	printLine("Error: No arguments specified. See below for correct usage."),
	printLine(""),
	printHelpOutput,
]);

const invalidArguments = pipeWith(chain)([
	({ invalidOptionNames }) =>
		Output.putStringLine(
			`Error: ${invalidOptionNames.join(", ")} ${
				invalidOptionNames.length === 1 ? "is an" : "are"
			} invalid argument${
				invalidOptionNames.length === 1 ? "" : "s"
			}. See below for correct usage.`,
		),
	printLine(""),
	printHelpOutput,
]);

const setup = pipeWith(chain)([
	always(getPath(["process", "argv"])),
	validatedInput,
	cond([
		[propEq("help")(true), printHelpOutput],
		[propSatisfies(isNotEmpty)("invalidOptionNames"), invalidArguments],
		[propSatisfies(isEmpty)("validOptionNames"), noArgumentsSpecified],
		[T, setupOptions],
	]),
]);

export default setup;
