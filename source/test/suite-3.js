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

Test('json query with attributes', async () => {
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

	Assert.strictEqual(result[0]?.json?.a, 'x');
	Assert.strictEqual(result[0]?.json?.b, 'y');
});

Test('json being null', async () => {
	await db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES (NULL);
	`);

	let result = await db.query`resources {
		json
	}`;

	Assert.strictEqual(result[0]?.json, null);
});

Test('json query without attributes', async () => {
	await db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"a":"x","b":"y"}');
	`);

	let result = await db.query`resources {
		json
	}`;

	Assert.strictEqual(result[0]?.json, '{"a":"x","b":"y"}');
});

Test('json deeply nested', async () => {
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

	Assert.strictEqual(result[0]?.json?.some?.nested?.property, 'value');
});

Test('json filtered attributes', async () => {
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

	Assert.strictEqual(result[0]?.json?.b, undefined);
});

Test('json wildcard', async () => {
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

	Assert.strictEqual(result[0]?.json?.a, 'x');
	Assert.strictEqual(result[0]?.json?.b, 'y');
});

Test('json arrays', async () => {
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

	Assert.strictEqual(result[0]?.cars?.[0]?.license, 'ABC-123');
	Assert.strictEqual(result[0]?.cars?.[1]?.license, 'XYZ-987');
});

Test('json wildcard as attribute', async () => {
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

	Assert.strictEqual(resources[0]?.json?.['*'], 'x');
});

Test('json wildcard as attribute filtering', async () => {
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

	Assert.strictEqual(resources[0]?.json?.a, undefined);
});

Test('json wildcard as attribute with nested attributes', async () => {
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

	Assert.strictEqual(resources[0]?.json?.['*'].a, 'x');
	Assert.strictEqual(resources[0]?.json?.['*'].b, undefined);
	Assert.strictEqual(resources[0]?.json?.c, undefined);
});
