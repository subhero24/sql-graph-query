import { test, expect, beforeEach, afterEach } from 'bun:test';

import { Database } from 'bun:sqlite';

import query from '../index.js';

let db;

beforeEach(() => {
	db = new Database();
	db.graph = query;

	db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
	`);
});

afterEach(() => {
	db.close();
});

test('using bind', () => {
	let result = query.bind(db)`users {
		id
	}`;

	expect(result.length).toStrictEqual(1);
});

test('using call', () => {
	let result = query.call(
		db,
		`users {
			id
		}`,
	);

	expect(result.length).toStrictEqual(1);
});

test('query as string', () => {
	let result = db.graph(
		`users {
			id
		}`,
	);

	expect(result.length).toStrictEqual(1);
});

test('query as template literal', () => {
	let result = db.graph`
		users {
			id
		}
	`;

	expect(result.length).toStrictEqual(1);
});
