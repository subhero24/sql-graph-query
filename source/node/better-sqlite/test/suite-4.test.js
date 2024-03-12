import Database from 'better-sqlite3';

import test from 'node:test';
import assert from 'node:assert';

import query from '../index.js';

let db;

test.beforeEach(async () => {
	db = new Database();
	db.query = query;
});

test.afterEach(async () => {
	db.close();
});

test('value interpolation', () => {
	db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);
		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
	`);

	let result = db.query`users WHERE name = ${'Peter'} {
		id
	}`;

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].id, '2');
});

test('array interpolation', () => {
	db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);
		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
		INSERT INTO "users"("id", "name") VALUES ('3', 'Ward');
	`);

	let result = db.query`users WHERE id IN (${['1', '2']}) {
		id
	}`;

	assert.strictEqual(result.length, 2);
	assert.strictEqual(result[0].id, '1');
	assert.strictEqual(result[1].id, '2');
});

test('double interpolation', () => {
	db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);
		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
	`);

	let result = db.query`users WHERE id = ${'1'} AND name = ${'John'} {
		id
	}`;

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].id, '1');
});

test('double array interpolation', () => {
	db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);
		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
	`);

	let result = db.query`users WHERE id IN (${['1', '2', '3', '4']}) AND name IN (${['John', 'Peter']}) {
		id
	}`;

	assert.strictEqual(result.length, 2);
	assert.strictEqual(result[0].id, '1');
	assert.strictEqual(result[1].id, '2');
});
