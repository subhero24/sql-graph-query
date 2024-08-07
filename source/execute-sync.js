import patch from './patch.js';
import filter from './filter.js';
import select from './select.js';

export default function executeSync(database, query) {
	let { sql, variables } = query;

	if (sql) {
		let columns = database.all(`PRAGMA table_info("${query.table}")`);
		let attribs = select(query, columns);
		let entries = database.all(`${sql} RETURNING ${attribs[0]}`, variables);

		return execute(query, entries);
	} else {
		return execute(query, [{}]);
	}

	function execute(query, parents) {
		let { type, sql, relations } = query;

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
					scope = `"${resource}"`;
				} else {
					let references = database.all(`PRAGMA foreign_key_list("${resource}")`);

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

					scope = `(SELECT * FROM "${relation.table}" WHERE "${key}" = ?) AS "${relation.table}"`;
				}

				let columns = database.all(`PRAGMA table_info("${relation.table}")`);
				let attribs = select(relation, columns);
				let statement = database.prepare(`SELECT ${attribs[0]} FROM ${scope} ${sql}`);

				try {
					for (let parent of parents) {
						let args = [...variables];
						if (query.type) {
							args.unshift(singular ? parent[column] : parent.id);
						}

						let children = database.run(statement, args);
						if (children.length) {
							patch(children, attribs[1]);
							execute(relation, children);
						}

						parent[type] = singular ? children[0] : children;
					}
				} finally {
					database.finalize(statement);
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
}
