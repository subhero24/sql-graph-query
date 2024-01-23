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

	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
	`);
});

Test.afterEach(async () => {
	await Filesystem.remove(dbPath);

	db = undefined;
});

Test('using bind', async () => {
	let result = await query.bind(db)`users {
		id
	}`;

	Assert.strictEqual(result.length, 1);
});

Test('using call', async () => {
	let result = await query.call(
		db,
		`users {
			id
		}`,
	);

	Assert.strictEqual(result.length, 1);
});

Test('query as string', async () => {
	let result = await db.query(
		`users {
			id
		}`,
	);

	Assert.strictEqual(result.length, 1);
});

Test('query as template literal', async () => {
	let result = await db.query`
		users {
			id
		}
	`;

	Assert.strictEqual(result.length, 1);
});
