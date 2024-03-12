import parseQuery from '../parse.js';
import executeQuery from './execute.js';

export function parse(...args) {
	return parseQuery(...args);
}

export function execute(query) {
	return executeQuery(this, query);
}

export default function (...args) {
	let query = parseQuery(...args);
	let result = executeQuery(this, query);

	return result;
}
