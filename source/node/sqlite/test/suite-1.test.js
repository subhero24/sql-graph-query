import Sqlite3 from 'sqlite3';
import * as Database from 'sqlite';

import test from 'node:test';
import assert from 'node:assert';

import query from '../index.js';

let db;

test.beforeEach(async () => {
	db = await Database.open({ filename: ':memory:', driver: Sqlite3.Database });
	db.query = query;

	await db.exec(`
	CREATE TABLE "users" (
		"id" TEXT PRIMARY KEY,
		"name" TEXT
	);

	INSERT INTO "users"("id", "name") VALUES ('1', 'John');
`);
});

test.afterEach(async () => {
	db.close();
});

test('using bind', async () => {
	let result = await query.bind(db)`users {
		id
	}`;

	assert.strictEqual(result.length, 1);
});

test('using call', async () => {
	let result = await query.call(
		db,
		`users {
			id
		}`,
	);

	assert.strictEqual(result.length, 1);
});

test('query as string', async () => {
	let result = await db.query(
		`users {
			id
		}`,
	);

	assert.strictEqual(result.length, 1);
});

test('query as template literal', async () => {
	let result = await db.query`
		users {
			id
		}
	`;

	assert.strictEqual(result.length, 1);
});
