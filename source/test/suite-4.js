import Path from 'path';
import Sqlite3 from 'sqlite3';
import Filesystem from 'fs-extra';

import * as Uvu from 'uvu';
import * as assert from 'uvu/assert';
import * as Database from 'sqlite';

import query from '../index.js';

let databasePath = Path.resolve('source', 'test', 'suite3.sqlite');

let db;
let suite = Uvu.suite('GraphSql');

suite.before.each(async () => {
	await Filesystem.remove(databasePath);
	await Filesystem.ensureFile(databasePath);

	db = await Database.open({ filename: databasePath, driver: Sqlite3.Database });
	db.query = query;
});

suite.after.each(async () => {
	await Filesystem.remove(databasePath);

	db = undefined;
});

suite('test value interpolation', async () => {
	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);
		INSERT INTO "users"("id", "name") VALUES ('1', 'Bruno');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Lies');
	`);

	let result = await db.query`users WHERE name = ${'Lies'} {
		id
	}`;

	assert.is(result.length, 1);
	assert.is(result[0].id, '2');
});

suite('test array interpolation ', async () => {
	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);
		INSERT INTO "users"("id", "name") VALUES ('1', 'Bruno');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Lies');
		INSERT INTO "users"("id", "name") VALUES ('3', 'Ward');
	`);

	let result = await db.query`users WHERE id IN (${['1', '2']}) {
		id
	}`;

	assert.is(result.length, 2);
	assert.is(result[0].id, '1');
	assert.is(result[1].id, '2');
});

suite.run();
