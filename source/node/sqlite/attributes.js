export default async function attributes(db, query) {
	let { table, attributes, relations } = query;

	let columns = await db.all(`PRAGMA table_info("${table}")`);
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

	let allSqlAttributes = [...relationAttributes, ...sqlQueryAttributes].join(',');

	return [allSqlAttributes, [...shadowAttributes]];
}
