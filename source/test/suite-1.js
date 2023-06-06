import Path from 'path';
import Sqlite3 from 'sqlite3';
import Filesystem from 'fs-extra';

import * as Uvu from 'uvu';
import * as assert from 'uvu/assert';
import * as Database from 'sqlite';

import query from '../index.js';

let databasePath = Path.resolve('source', 'test', 'test.sqlite');

let db;
let suite = Uvu.suite('GraphSql');

suite.before.each(async () => {
	await Filesystem.remove(databasePath);
	await Filesystem.ensureFile(databasePath);

	db = await Database.open({ filename: databasePath, driver: Sqlite3.Database });
	db.query = query;

	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'Bruno');
	`);
});

suite.after.each(async () => {
	await Filesystem.remove(databasePath);

	db = undefined;
});

suite('test 1', async () => {
	let result = await query.bind(db)`users {
		id
	}`;

	assert.is(result.length, 1);
});

suite('test 2', async () => {
	let result = await query.call(
		db,
		`users {
			id
		}`,
	);

	assert.is(result.length, 1);
});

suite('test 3', async () => {
	let result = await db.query(
		`users {
			id
		}`,
	);

	assert.is(result.length, 1);
});

suite('test 4', async () => {
	let result = await db.query`
		users {
			id
		}
	`;

	assert.is(result.length, 1);
});

suite.run();
