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
test('json query with attributes', async () => {
	await db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"a":"x","b":"y"}');
	`);

	let result = await db.query`resources {
		json {
			a
			b
		}
	}`;

	assert.strictEqual(result[0]?.json?.a, 'x');
	assert.strictEqual(result[0]?.json?.b, 'y');
});

test('json being null', async () => {
	await db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES (NULL);
	`);

	let result = await db.query`resources {
		json
	}`;

	assert.strictEqual(result[0]?.json, null);
});

test('json query without attributes', async () => {
	await db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"a":"x","b":"y"}');
	`);

	let result = await db.query`resources {
		json
	}`;

	assert.strictEqual(result[0]?.json, '{"a":"x","b":"y"}');
});

test('json deeply nested', async () => {
	await db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"some":{"nested":{"property":"value"}}}');
	`);

	let result = await db.query`resources {
		json {
			some {
				nested {
					property
				}
			}
		}
	}`;

	assert.strictEqual(result[0]?.json?.some?.nested?.property, 'value');
});

test('json filtered attributes', async () => {
	await db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"a":"x","b":"y"}');
	`);

	let result = await db.query`resources {
		json {
			a
		}
	}`;

	assert.strictEqual(result[0]?.json?.b, undefined);
});

test('json wildcard', async () => {
	await db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"a":"x","b":"y"}');
	`);

	let result = await db.query`resources {
		json {
			*
		}
	}`;

	assert.strictEqual(result[0]?.json?.a, 'x');
	assert.strictEqual(result[0]?.json?.b, 'y');
});

test('json arrays', async () => {
	await db.exec(`
		CREATE TABLE "users" (
			"cars" TEXT
		);

		INSERT INTO "users"("cars") VALUES ('[{"license":"ABC-123"},{"license":"XYZ-987"}]');
	`);

	let result = await db.query`
		users {
			cars {
				license
			}
		}
	`;

	assert.strictEqual(result[0]?.cars?.[0]?.license, 'ABC-123');
	assert.strictEqual(result[0]?.cars?.[1]?.license, 'XYZ-987');
});

test('json wildcard as attribute', async () => {
	await db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"*":"x"}');
	`);

	let resources = await db.query`
		resources {
			json {
				*
			}
		}
	`;

	assert.strictEqual(resources[0]?.json?.['*'], 'x');
});

test('json wildcard as attribute filtering', async () => {
	await db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"*":"x","a":"b"}');
	`);

	let resources = await db.query`
		resources {
			json {
				*
			}
		}
	`;

	assert.strictEqual(resources[0]?.json?.a, undefined);
});

test('json wildcard as attribute with nested attributes', async () => {
	await db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"*":{"a":"x","b":"y"},"c":"z"}');
	`);

	let resources = await db.query`
		resources {
			json {
				* {
					a
				}
			}
		}
	`;

	assert.strictEqual(resources[0]?.json?.['*'].a, 'x');
	assert.strictEqual(resources[0]?.json?.['*'].b, undefined);
	assert.strictEqual(resources[0]?.json?.c, undefined);
});
