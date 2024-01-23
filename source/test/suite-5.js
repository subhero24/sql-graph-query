import Os from 'node:os';
import Path from 'path';
import Test from 'node:test';
import Assert from 'node:assert';
import Sqlite3 from 'sqlite3';
import Filesystem from 'fs-extra';

import * as Database from 'sqlite';

import query from '../index.js';

let db;
let dbPath = await Filesystem.mkdtemp(`${Os.tmpdir()}${Path.sep}`);

Test.beforeEach(async () => {
	await Filesystem.remove(dbPath);
	await Filesystem.ensureFile(dbPath);

	db = await Database.open({ filename: dbPath, driver: Sqlite3.Database });
	db.query = query;
});

Test.afterEach(async () => {
	await Filesystem.remove(dbPath);

	db = undefined;
});

Test('insert mutation', async () => {
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

	Assert.strictEqual(result.length, 1);
	Assert.strictEqual(result[0].id, '1');
	Assert.strictEqual(result[0].name, 'John');

	let results = await db.query`
		users {
			id
			name
		}
	`;
	Assert.strictEqual(results.length, 1);
	Assert.strictEqual(results[0].id, '1');
	Assert.strictEqual(results[0].name, 'John');
});

Test('update mutation', async () => {
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

	Assert.strictEqual(result.length, 1);
	Assert.strictEqual(result[0].id, '1');
	Assert.strictEqual(result[0].name, 'Peter');

	let results = await db.query`
		users {
			id
			name
		}
	`;

	Assert.strictEqual(results.length, 1);
	Assert.strictEqual(results[0].id, '1');
	Assert.strictEqual(results[0].name, 'Peter');
});

Test('update mutations', async () => {
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

	Assert.strictEqual(result.length, 2);
	Assert.strictEqual(result[0].id, '1');
	Assert.strictEqual(result[0].name, 'Ward');
	Assert.strictEqual(result[1].id, '2');
	Assert.strictEqual(result[1].name, 'Ward');

	let results = await db.query`
		users {
			id
			name
		}
	`;

	Assert.strictEqual(results.length, 2);
	Assert.strictEqual(result[0].id, '1');
	Assert.strictEqual(result[0].name, 'Ward');
	Assert.strictEqual(result[1].id, '2');
	Assert.strictEqual(result[1].name, 'Ward');
});
