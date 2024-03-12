export default function patch(objects, shadowAttributes) {
	for (let object of objects) {
		for (let shadowAttribute of shadowAttributes) {
			Object.defineProperty(object, shadowAttribute, { enumerable: false, value: object[shadowAttribute] });
		}
	}
}
