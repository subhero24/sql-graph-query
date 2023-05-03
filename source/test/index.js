import Path from 'path';
import Sqlite3 from 'sqlite3';
import Filesystem from 'fs-extra';

import * as Uvu from 'uvu';
import * as assert from 'uvu/assert';
import * as Database from 'sqlite';

import graphSql from '../index.js';

let databasePath = Path.resolve('source', 'test', 'test.sqlite');

let db;
let suite = Uvu.suite('GraphSql');

suite.before.each(async () => {
	await Filesystem.remove(databasePath);
	await Filesystem.ensureFile(databasePath);

	db = await Database.open({ filename: databasePath, driver: Sqlite3.Database });
	db.query = graphSql;
});

suite.after.each(async () => {
	await Filesystem.remove(databasePath);

	db = undefined;
});

suite('test 1', async () => {
	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);
	`);

	let result = await db.query`users {
		id
	}`;

	result = await graphSql(db)`users {
		id
	}`;

	assert.is(result.length, 0);
});

suite('test 2', async () => {
	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'Bruno');
	`);

	let result = await db.query`users {
		id
	}`;

	assert.is(result.length, 1);
	assert.is(result[0].id, '1');
});

suite('test 3', async () => {
	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'Bruno');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Lies');
	`);

	let result = await db.query`users {
		id
	}`;

	assert.is(result.length, 2);
});

suite('test 4', async () => {
	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'Bruno');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Lies');
	`);

	let result = await db.query`users {
		id
		name
	}`;

	assert.is(result.length, 2);
	assert.is(result[0].id, '1');
	assert.is(result[1].id, '2');
	assert.is(result[0].name, 'Bruno');
	assert.is(result[1].name, 'Lies');
});

suite('test 5', async () => {
	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'Bruno');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Lies');
	`);

	let result = await db.query`users {
		name
	}`;

	assert.is(result.length, 2);
	assert.is(result[0].id, undefined);
	assert.is(result[1].id, undefined);
	assert.is(result[0].name, 'Bruno');
	assert.is(result[1].name, 'Lies');
});

suite('test 6', async () => {
	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'Bruno');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Lies');
	`);

	let result = await db.query`users WHERE name = 'Lies' {
		id
	}`;

	assert.is(result.length, 1);
	assert.is(result[0].id, '2');
});

suite('test 7', async () => {
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

suite('test 8', async () => {
	await db.exec(`
		PRAGMA foreign_keys = ON;

		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		CREATE TABLE "cars" (
			"id" TEXT PRIMARY KEY,
			"userId" TEXT REFERENCES "users"("id"),
			"brand" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'Bruno');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('1', '1', 'Chevrolet');
	`);

	let result = await db.query`users {
		id
		name
		cars {
			id
			brand
		}
	}`;

	assert.is(result.length, 1);
	assert.is(result[0].cars.length, 1);
	assert.is(result[0].id, '1');
	assert.is(result[0].name, 'Bruno');
	assert.is(result[0].cars[0].id, '1');
	assert.is(result[0].cars[0].brand, 'Chevrolet');
});

suite('test 9', async () => {
	await db.exec(`
		PRAGMA foreign_keys = ON;

		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		CREATE TABLE "cars" (
			"id" TEXT PRIMARY KEY,
			"userId" TEXT REFERENCES "users"("id"),
			"brand" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'Bruno');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('1', '1', 'Chevrolet');
	`);

	let result = await db.query`users {
		name
		cars {
			brand
		}
	}`;

	assert.is(result.length, 1);
	assert.is(result[0].cars.length, 1);
	assert.is(result[0].name, 'Bruno');
	assert.is(result[0].cars[0].brand, 'Chevrolet');
});

suite('test 10', async () => {
	await db.exec(`
		PRAGMA foreign_keys = ON;

		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		CREATE TABLE "cars" (
			"id" TEXT PRIMARY KEY,
			"userId" TEXT REFERENCES "users"("id"),
			"brand" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'Bruno');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('1', '1', 'Chevrolet');
	`);

	let result = await db.query`users {
		cars {
			brand
		}
	}`;

	assert.is(result.length, 1);
	assert.is(result[0].cars.length, 1);
	assert.is(result[0].cars[0].brand, 'Chevrolet');
});

suite('test 11', async () => {
	await db.exec(`
		PRAGMA foreign_keys = ON;

		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		CREATE TABLE "cars" (
			"id" TEXT PRIMARY KEY,
			"userId" TEXT REFERENCES "users"("id"),
			"brand" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'Bruno');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Lies');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('1', '1', 'Chevrolet');
	`);

	let result = await db.query`users {
		cars {
			brand
		}
	}`;

	assert.is(result.length, 2);
	assert.is(result[0].cars.length, 1);
	assert.is(result[1].cars.length, 0);
});

suite('test 12', async () => {
	await db.exec(`
		PRAGMA foreign_keys = ON;

		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		CREATE TABLE "cars" (
			"id" TEXT PRIMARY KEY,
			"userId" TEXT REFERENCES "users"("id"),
			"brand" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'Bruno');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Lies');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('1', '1', 'Chevrolet');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('2', '2', 'Kia');
	`);

	let result = await db.query`users {
		cars {
			brand
		}
	}`;

	assert.is(result.length, 2);
	assert.is(result[0].cars.length, 1);
	assert.is(result[1].cars.length, 1);
});

suite('test 13', async () => {
	await db.exec(`
		PRAGMA foreign_keys = ON;

		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT,
			"carId" TEXT REFERENCES "cars"("id")
		);

		CREATE TABLE "cars" (
			"id" TEXT PRIMARY KEY,
			"brand" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'Bruno');
		INSERT INTO "cars"("id", "brand") VALUES ('1', 'Chevrolet');
	`);

	let result = await db.query`users {
		car {
			brand
		}
	}`;

	assert.is(result.length, 1);
	assert.is(result[0].car.brand, 'Chevrolet');
});

suite.run();
