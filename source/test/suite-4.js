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

Test('value interpolation', async () => {
	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);
		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
	`);

	let result = await db.query`users WHERE name = ${'Peter'} {
		id
	}`;

	Assert.strictEqual(result.length, 1);
	Assert.strictEqual(result[0].id, '2');
});

Test('array interpolation', async () => {
	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);
		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
		INSERT INTO "users"("id", "name") VALUES ('3', 'Ward');
	`);

	let result = await db.query`users WHERE id IN (${['1', '2']}) {
		id
	}`;

	Assert.strictEqual(result.length, 2);
	Assert.strictEqual(result[0].id, '1');
	Assert.strictEqual(result[1].id, '2');
});

Test('double interpolation', async () => {
	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);
		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
	`);

	let result = await db.query`users WHERE id = ${'1'} AND name = ${'John'} {
		id
	}`;

	Assert.strictEqual(result.length, 1);
	Assert.strictEqual(result[0].id, '1');
});

Test('double array interpolation', async () => {
	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);
		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
	`);

	let result = await db.query`users WHERE id IN (${['1', '2', '3', '4']}) AND name IN (${['John', 'Peter']}) {
		id
	}`;

	Assert.strictEqual(result.length, 2);
	Assert.strictEqual(result[0].id, '1');
	Assert.strictEqual(result[1].id, '2');
});
