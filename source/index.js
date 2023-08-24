const lineRegex = /\s*(.*\S)/dgmy;
const queryRegex = /((?:INSERT|UPDATE)\s.*)\{\s*$/di;
const relationStartRegex = /^(\S+)(.*)?\{\s*$/d;
const relationFinishRegex = /\}\s*/d;

export default async function graphSql(...args) {
	let query = parseQuery(...args);
	let result = await executeQuery(this, query);

	return result;
}

export function parseQuery(args, ...vars) {
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
	let { type, sql, variables, relations } = query;

	if (parents == undefined) {
		if (sql) {
			let [attributeSql] = queryAttributes(db, query);
			let entries = await db.all(`${sql} RETURNING ${attributeSql}`, variables);

			parents = entries;
		} else {
			parents = [{}];
		}
	}

	for (let relation of relations) {
		let { type, sql, variables } = relation;

		let relationIsJson = parents[0][type] !== undefined;
		if (relationIsJson) {
			for (let parent of parents) {
				let json = parent[type];
				if (json) {
					parent[type] = jsonFilter(JSON.parse(parent[type]), relation);
				}
			}
		} else {
			let scope;
			let column = type + 'Id';
			let singular = parents[0][column] !== undefined;
			let resource = singular ? query.type : type;

			if (query.type == undefined) {
				scope = `WITH temp AS (SELECT * FROM "${resource}")`;
			} else {
				let key;

				if (singular) {
					let references = await db.all(`PRAGMA foreign_key_list("${resource}")`);
					let referenced = references.find(r => r.from === column);
					if (referenced == undefined) {
						throw new Error(`No relations found from ${query.type} to ${type}`);
					}

					key = referenced.to;
					relation.type = referenced.table;
				} else {
					let references = await db.all(`PRAGMA foreign_key_list("${resource}")`);
					let referenced = references.filter(r => r.table === query.type);
					if (referenced.length === 0) {
						throw new Error(`No relations found from ${type} to ${query.type}`);
					} else if (referenced.length > 1) {
						// TODO? add syntax + warning for selecting foreign key?
						throw new Error(`Mutliple relations from ${type} to ${query.type}`);
					}

					key = referenced[0].from;
				}

				scope = `WITH temp AS (SELECT * FROM "${relation.type}" WHERE "${key}" = ?)`;
			}

			let [attributeSql, shadowAttributes] = await queryAttributes(db, relation);

			let statement = await db.prepare(`${scope} SELECT ${attributeSql} FROM temp ${sql}`);

			try {
				for (let parent of parents) {
					let args = [...variables];
					if (query.type) {
						args.unshift(singular ? parent[column] : parent.id);
					}

					let children = await statement.all(args);
					if (children.length) {
						patchAttributes(children, shadowAttributes);
						await executeQuery(db, relation, children);
					}

					parent[type] = singular ? children[0] : children;
				}
			} finally {
				await statement.finalize();
			}
		}
	}

	if (type == undefined) {
		if (relations.length === 1) {
			return parents[0][relations[0].type];
		} else {
			return parents[0];
		}
	} else {
		return parents;
	}
}

async function queryAttributes(db, query) {
	let { type, attributes, relations } = query;

	let columns = await db.all(`PRAGMA table_info("${type}")`);
	let columnNames = columns.map(column => column.name);

	let queryAttributes = new Set(attributes);
	let shadowAttributes = new Set();
	let relationAttributes = new Set();
	for (let relation of relations) {
		let relationColumnName;
		let relationIsJson = columns.some(column => column.name === relation.type && column.type === 'TEXT');
		if (relationIsJson) {
			relationColumnName = relation.type;
		} else {
			let key = relation.type + 'Id';
			if (columnNames.includes(key)) {
				relationColumnName = key;
			} else {
				relationColumnName = 'id';
			}

			if (attributes.includes(relationColumnName) === false) {
				shadowAttributes.add(relationColumnName);
			}
		}

		queryAttributes.delete(relationColumnName);
		relationAttributes.add(`"${relationColumnName}"`);
	}

	let sqlQueryAttributes = [...queryAttributes];
	if (sqlQueryAttributes.length) {
		sqlQueryAttributes = sqlQueryAttributes.map(attribute =>
			columnNames.includes(attribute) ? `"${attribute}"` : attribute,
		);
	}

	let sql = [...relationAttributes, ...sqlQueryAttributes].join(',');

	return [sql, [...shadowAttributes]];
}

function patchAttributes(objects, shadowAttributes) {
	for (let object of objects) {
		for (let shadowAttribute of shadowAttributes) {
			Object.defineProperty(object, shadowAttribute, { enumerable: false, value: object[shadowAttribute] });
		}
	}
}

function jsonFilter(object, relation) {
	let { attributes, relations } = relation;

	let result = {};
	for (let key in object) {
		if (attributes.includes(key)) {
			result[key] = object[key];
		} else {
			let relation = relations.find(relation => relation.type === key);
			if (relation) {
				result[key] = jsonFilter(object[key], relation);
			}
		}
	}

	return result;
}
