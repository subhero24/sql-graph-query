import Database from 'better-sqlite3';

import test from 'node:test';
import assert from 'node:assert';

import query from '../index.js';

let db;

test.beforeEach(() => {
	db = new Database();
	db.query = query;

	db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
	`);
});

test.afterEach(() => {
	db.close();
});

test('using bind', () => {
	let result = query.bind(db)`users {
		id
	}`;

	assert.strictEqual(result.length, 1);
});

test('using call', () => {
	let result = query.call(
		db,
		`users {
			id
		}`,
	);

	assert.strictEqual(result.length, 1);
});

test('query as string', () => {
	let result = db.query(
		`users {
			id
		}`,
	);

	assert.strictEqual(result.length, 1);
});

test('query as template literal', () => {
	let result = db.query`
		users {
			id
		}
	`;

	assert.strictEqual(result.length, 1);
});
