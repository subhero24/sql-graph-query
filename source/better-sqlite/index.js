import Database from './database.js';

import parse from '../parse.js';
import executeSync from '../execute-sync.js';

export { parse };

export function execute(query) {
	return executeSync(new Database(this), query);
}

export default function (...args) {
	let query = parse(...args);
	let result = execute.bind(this)(query);

	return result;
}
