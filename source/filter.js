export default function filter(object, relation) {
	let { attributes, relations } = relation;

	let isArray = object instanceof Array;
	let isWildcard = relations.length === 0 && attributes.length === 1 && attributes[0] === '*';

	let objects = isArray ? object : [object];
	let results = objects.map(object => {
		if (isWildcard && object['*'] == undefined) return object;

		let result = {};
		for (let key in object) {
			if (attributes.includes(key)) {
				result[key] = object[key];
			} else {
				let relation = relations.find(relation => relation.type === key);
				if (relation) {
					result[key] = filter(object[key], relation);
				}
			}
		}

		return result;
	});

	return isArray ? results : results[0];
}
