const lineRegex = /\s*(.*\S)/dgmy;
const queryRegex = /((?:INSERT|REPLACE|UPDATE)\s.*)\{\s*$/di;
const relationStartRegex = /^(\S+)(.*)?\{\s*$/d;
const relationFinishRegex = /\}\s*/d;

export default function parse(args, ...vars) {
	let string = typeof args === 'string' ? args : args.join('');
	let matches = [...string.matchAll(lineRegex)];
	let entries = matches.map(match => ({ text: match[1], range: match.indices[1] }));

	let length = 0;
	let interpolations = vars.map((value, index) => [value, (length = length + args[index].length)]);

	let lines = [...entries];
	let match = matchLine(lines[0], queryRegex);
	if (match) {
		lines.shift();

		let [sql] = match.slice(1);
		let [start, finish] = match.indices[1];

		return { ...interpolateSql(sql, start, finish), ...parseAttributes() };
	} else {
		return { relations: parseRelations() };
	}

	function parseRelations() {
		let relations = [];
		while (lines.length) {
			let line = lines[0];
			let match = matchLine(line, relationStartRegex);
			if (match) {
				relations.push(parseRelation(match));
			} else {
				lines.shift();
			}
		}
		return relations;
	}

	function parseRelation(matched) {
		let line = lines.shift();
		let match = matched ?? matchLine(line, relationStartRegex);

		let [type, sql] = match.slice(1);
		let [start, finish] = match.indices[2] ?? [];

		return { type, table: type, ...interpolateSql(sql, start, finish), ...parseAttributes() };
	}

	function parseAttributes() {
		let relations = [];
		let attributes = [];

		do {
			let line = lines[0];
			let match = matchLine(line, relationStartRegex);
			if (match) {
				relations.push(parseRelation(match));
			} else {
				lines.shift();

				let match = matchLine(line, relationFinishRegex);
				if (match) {
					return { relations, attributes };
				} else {
					attributes.push(line.text);
				}
			}
		} while (lines.length);

		throw new Error(`Error parsing attributes`);
	}

	function matchLine(line, regex) {
		let match = line.text.match(regex);
		if (match) {
			for (let indices of match.indices) {
				indices[0] = indices[0] + line.range[0];
				indices[1] = indices[1] + line.range[0];
			}
		}
		return match;
	}

	function interpolateSql(sql, start, finish) {
		let commas = 0;
		let variables = [];
		while (interpolations.length) {
			let index = interpolations[0][1];
			if (index <= finish) {
				let [value] = interpolations.shift();

				let pre = sql.slice(0, index - start + variables.length + commas);
				let post = sql.slice(index - start + variables.length + commas);

				if (value instanceof Array) {
					sql = pre + value.map(() => '?').join(',') + post;
					commas = commas + (value.length > 1 ? value.length - 1 : 0);
					variables.push(...value);
				} else {
					sql = pre + '?' + post;
					variables.push(value);
				}
			} else {
				break;
			}
		}

		return { sql, variables };
	}
}
