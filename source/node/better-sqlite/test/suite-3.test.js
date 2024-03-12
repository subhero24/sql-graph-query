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

test('json query with attributes', () => {
	db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"a":"x","b":"y"}');
	`);

	let result = db.query`resources {
		json {
			a
			b
		}
	}`;

	assert.strictEqual(result[0]?.json?.a, 'x');
	assert.strictEqual(result[0]?.json?.b, 'y');
});

test('json being null', () => {
	db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES (NULL);
	`);

	let result = db.query`resources {
		json
	}`;

	assert.strictEqual(result[0]?.json, null);
});

test('json query without attributes', () => {
	db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"a":"x","b":"y"}');
	`);

	let result = db.query`resources {
		json
	}`;

	assert.strictEqual(result[0]?.json, '{"a":"x","b":"y"}');
});

test('json deeply nested', () => {
	db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"some":{"nested":{"property":"value"}}}');
	`);

	let result = db.query`resources {
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

test('json filtered attributes', () => {
	db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"a":"x","b":"y"}');
	`);

	let result = db.query`resources {
		json {
			a
		}
	}`;

	assert.strictEqual(result[0]?.json?.b, undefined);
});

test('json wildcard', () => {
	db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"a":"x","b":"y"}');
	`);

	let result = db.query`resources {
		json {
			*
		}
	}`;

	assert.strictEqual(result[0]?.json?.a, 'x');
	assert.strictEqual(result[0]?.json?.b, 'y');
});

test('json arrays', () => {
	db.exec(`
		CREATE TABLE "users" (
			"cars" TEXT
		);

		INSERT INTO "users"("cars") VALUES ('[{"license":"ABC-123"},{"license":"XYZ-987"}]');
	`);

	let result = db.query`
		users {
			cars {
				license
			}
		}
	`;

	assert.strictEqual(result[0]?.cars?.[0]?.license, 'ABC-123');
	assert.strictEqual(result[0]?.cars?.[1]?.license, 'XYZ-987');
});

test('json wildcard as attribute', () => {
	db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"*":"x"}');
	`);

	let resources = db.query`
		resources {
			json {
				*
			}
		}
	`;

	assert.strictEqual(resources[0]?.json?.['*'], 'x');
});

test('json wildcard as attribute filtering', () => {
	db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"*":"x","a":"b"}');
	`);

	let resources = db.query`
		resources {
			json {
				*
			}
		}
	`;

	assert.strictEqual(resources[0]?.json?.a, undefined);
});

test('json wildcard as attribute with nested attributes', () => {
	db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"*":{"a":"x","b":"y"},"c":"z"}');
	`);

	let resources = db.query`
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
