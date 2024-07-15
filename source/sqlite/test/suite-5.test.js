import Sqlite3 from 'sqlite3';
import * as Database from 'sqlite';

import test from 'node:test';
import assert from 'node:assert';

import query from '../index.js';

let db;

test.beforeEach(async () => {
	db = await Database.open({ filename: ':memory:', driver: Sqlite3.Database });
	db.query = query;
});

test.afterEach(async () => {
	db.close();
});

test('insert mutation', async () => {
	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);
	`);

	let result = await db.query`
		INSERT INTO "users"("id", "name") VALUES ('1', 'John') {
			id
			name
		}
	`;

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].id, '1');
	assert.strictEqual(result[0].name, 'John');

	let results = await db.query`
		users {
			id
			name
		}
	`;
	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].id, '1');
	assert.strictEqual(results[0].name, 'John');
});

test('update mutation', async () => {
	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
	`);

	let result = await db.query`
		UPDATE users SET name = 'Peter' WHERE id = '1' {
			id
			name
		}
	`;

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].id, '1');
	assert.strictEqual(result[0].name, 'Peter');

	let results = await db.query`
		users {
			id
			name
		}
	`;

	assert.strictEqual(results.length, 1);
	assert.strictEqual(results[0].id, '1');
	assert.strictEqual(results[0].name, 'Peter');
});

test('update mutations', async () => {
	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
	`);

	let result = await db.query`
		UPDATE users SET name = 'Ward' {
			id
			name
		}
	`;

	assert.strictEqual(result.length, 2);
	assert.strictEqual(result[0].id, '1');
	assert.strictEqual(result[0].name, 'Ward');
	assert.strictEqual(result[1].id, '2');
	assert.strictEqual(result[1].name, 'Ward');

	let results = await db.query`
		users {
			id
			name
		}
	`;

	assert.strictEqual(results.length, 2);
	assert.strictEqual(result[0].id, '1');
	assert.strictEqual(result[0].name, 'Ward');
	assert.strictEqual(result[1].id, '2');
	assert.strictEqual(result[1].name, 'Ward');
});
