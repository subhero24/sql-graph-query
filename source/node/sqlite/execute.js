import patch from '../../patch.js';
import filter from '../../filter.js';
import attributes from './attributes.js';

export default async function execute(db, query, parents) {
	let { type, sql, variables, relations } = query;

	if (parents == undefined) {
		if (sql) {
			let [attributeSql] = await attributes(db, query);

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
					parent[type] = filter(JSON.parse(parent[type]), relation);
				}
			}
		} else {
			let scope;
			let column = type + 'Id';
			let singular = parents[0][column] !== undefined;
			let resource = singular ? query.table : type;

			if (query.type == undefined) {
				scope = `WITH temp AS (SELECT * FROM "${resource}")`;
			} else {
				let references = await db.all(`PRAGMA foreign_key_list("${resource}")`);

				let key;
				if (singular) {
					let referenced = references.find(r => r.from === column);
					if (referenced == undefined) {
						throw new Error(`No relations found from ${query.table} to ${type}`);
					}

					key = referenced.to;
					relation.table = referenced.table;
				} else {
					let referenced = references.filter(r => r.table === query.table);
					if (referenced.length === 0) {
						throw new Error(`No relations found from ${type} to ${query.table}`);
					} else if (referenced.length > 1) {
						// TODO? add syntax + warning for selecting foreign key?
						throw new Error(`Mutliple relations from ${type} to ${query.table}`);
					}

					key = referenced[0].from;
				}

				scope = `WITH temp AS (SELECT * FROM "${relation.table}" WHERE "${key}" = ?)`;
			}

			let [attributeSql, shadowAttributes] = await attributes(db, relation);

			let statement = await db.prepare(`${scope} SELECT ${attributeSql} FROM temp ${sql}`);

			try {
				for (let parent of parents) {
					let args = [...variables];
					if (query.type) {
						args.unshift(singular ? parent[column] : parent.id);
					}

					let children = await statement.all(args);
					if (children.length) {
						patch(children, shadowAttributes);
						await execute(db, relation, children);
					}

					parent[type] = singular ? children[0] : children;
				}
			} finally {
				await statement.finalize();
			}
		}
	}

	let isRoot = type == undefined;
	if (isRoot) {
		if (sql) {
			return parents;
		} else if (relations.length === 1) {
			return parents[0][relations[0].type];
		} else {
			return parents[0];
		}
	} else {
		return parents;
	}
}
