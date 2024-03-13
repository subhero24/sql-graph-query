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

test('value interpolation', async () => {
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

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].id, '2');
});

test('array interpolation', async () => {
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

	assert.strictEqual(result.length, 2);
	assert.strictEqual(result[0].id, '1');
	assert.strictEqual(result[1].id, '2');
});

test('double interpolation', async () => {
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

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].id, '1');
});

test('double array interpolation', async () => {
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

	assert.strictEqual(result.length, 2);
	assert.strictEqual(result[0].id, '1');
	assert.strictEqual(result[1].id, '2');
});
