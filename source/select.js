export default function select(query, columns) {
	let { attributes, relations } = query;

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
		relationAttributes.add(`"${query.table}"."${relationColumnName}"`);
	}

	let sqlQueryAttributes = [...queryAttributes];
	if (sqlQueryAttributes.length) {
		sqlQueryAttributes = sqlQueryAttributes.map(attribute =>
			columnNames.includes(attribute) ? `"${query.table}"."${attribute}"` : attribute,
		);
	}

	let allSqlAttributes = [...relationAttributes, ...sqlQueryAttributes].join(',');

	return [allSqlAttributes, [...shadowAttributes]];
}
