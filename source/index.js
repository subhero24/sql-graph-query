const lineRegex = /\s*(.+)/dgmy;
const queryRegex = /((?:INSERT|UPDATE)\s.*)\{\s*$/di;
const relationStartRegex = /^(\S+)(.*)?\{\s*$/d;
const relationFinishRegex = /\}\s*/d;

export default async function graphSql(...args) {
	let query = parseQuery(...args);
	let result = await executeQuery(this, query);

	return result;
}

export function parseQuery(args, ...vars) {
	let string = args.join('');
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

		return { type, ...interpolateSql(sql, start, finish), ...parseAttributes() };
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

		throw new Error(`Could not parse attributes`);
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
		let variables = [];
		while (interpolations.length) {
			let index = interpolations[0][1];
			if (index <= finish) {
				let [value] = interpolations.shift();

				let pre = sql.slice(0, index - start + variables.length);
				let post = sql.slice(index - start + variables.length);

				sql = pre + '?' + post;

				variables.push(value);
			} else {
				break;
			}
		}

		return { sql, variables };
	}
}

export async function executeQuery(db, query, parents) {
	let { type, sql, variables, properties, relations } = query;

	if (type == undefined && sql) {
		let props = properties.join(', ');
		let entries = await db.all(`${sql} RETURNING ${props}`, variables);

		parents = entries;
	}

	let root = parents ?? {};

	let columns = await db.all(`SELECT name FROM pragma_table_info('${type}')`);
	let columnNames = columns.map(column => column.name);

	for (let relation of relations) {
		let { type, sql, variables, attributes: baseAttributes, relations: subrelations } = relation;

		let extraAttributes = new Set();
		for (let subrelation of subrelations) {
			let columnName = subrelation.type + 'Id';
			if (columnNames.includes(columnName) === false) {
				columnName = 'id';
			}

			if (baseAttributes.includes(columnName) === false) {
				extraAttributes.add(columnName);
			}
		}

		let attributes = [...extraAttributes, ...baseAttributes];
		let properties = attributes.join(',');

		if (parents == undefined) {
			let results;

			if (properties) {
				results = await db.all(`SELECT ${properties} FROM ${type} ${sql}`, variables);

				for (let result of results) {
					for (let extraAttribute of extraAttributes) {
						Object.defineProperty(result, extraAttribute, {
							value: result[extraAttribute],
							enumerable: false,
						});
					}
				}
			} else {
				results = await db.get(`SELECT COUNT(*) AS length FROM ${type} ${sql}`, variables);
				results = Array.from(results).map(() => ({}));
			}

			await executeQuery(db, relation, results);

			if (relations.length === 1) {
				return results;
			} else {
				root[type] = results;
			}
		} else {
			let columnName = type + 'Id';
			if (columnNames.includes(columnName)) {
				let references = await db.all(`PRAGMA foreign_key_list("${query.type}")`);
				let referenced = references.find(r => r.from === columnName);

				if (properties) {
					let statement = await db.prepare(
						`WITH temp AS (SELECT * FROM "${referenced.table}" WHERE "${referenced.to}" = ?) SELECT ${properties} FROM ${referenced.table} ${sql}`,
					);
					for (let parent of parents) {
						let id = parent[referenced.from];
						let child = await statement.get([id, ...variables]);
						if (child) {
							await executeQuery(db, relation, [child]);
						}
						parent[type] = child;
					}
					await statement.finalize();
				} else {
					let statement = await db.prepare(
						`WITH temp AS (SELECT * FROM "${referenced.table}" WHERE "${referenced.to}" = ?) SELECT COUNT(*) AS length FROM ${referenced.table} ${sql}`,
					);

					for (let parent of parents) {
						let id = parent[referenced.from];
						let result = await statement.get([id, ...variables]);
						let children = result ? [{}] : [];
						if (children.length) {
							await executeQuery(db, relation, children);
						}

						parent[type] = children;
					}
				}
			} else {
				let references = await db.all(`PRAGMA foreign_key_list("${type}")`);
				let referenced = references.filter(r => r.table === query.type);
				if (referenced.length === 0) {
					console.warn(`No relations found from ${type} to ${query.type}`);
				} else if (referenced.length > 1) {
					console.warn(`Mutliple relations from ${type} to ${query.type}`);
				}

				let reference = referenced[0];

				if (properties) {
					let statement = await db.prepare(
						`WITH temp AS (SELECT * FROM "${type}" WHERE "${reference.from}" = ?) SELECT ${properties} FROM temp ${sql}`,
					);

					for (let parent of parents) {
						let id = parent[reference.to];
						let children = await statement.all([id, ...variables]);
						if (children.length) {
							await executeQuery(db, relation, children);
						}

						parent[type] = children;
					}

					await statement.finalize();
				} else {
					let statement = await db.prepare(
						`WITH temp AS (SELECT * FROM "${type}" WHERE "${reference.from}" = ?) SELECT COUNT(*) AS length FROM temp ${sql}`,
					);

					for (let parent of parents) {
						let id = parent[reference.to];
						let result = await statement.get([id, ...variables]);
						let children = Array.from(result).map(() => ({}));
						if (children.length) {
							await executeQuery(db, relation, children);
						}

						parent[type] = children;
					}

					await statement.finalize();
				}
			}
		}
	}

	return root;
}
