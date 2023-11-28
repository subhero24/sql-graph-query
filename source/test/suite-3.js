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

suite('test 1', async () => {
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

	assert.is(result[0]?.json?.a, 'x');
	assert.is(result[0]?.json?.b, 'y');
});

suite('test 2', async () => {
	await db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES (NULL);
	`);

	let result = await db.query`resources {
		json
	}`;

	assert.is(result[0]?.json, null);
});

suite('test 3', async () => {
	await db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"a":"x","b":"y"}');
	`);

	let result = await db.query`resources {
		json
	}`;

	assert.is(result[0]?.json, '{"a":"x","b":"y"}');
});

suite('test 4', async () => {
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

	assert.is(result[0]?.json?.some?.nested?.property, 'value');
});

suite('test 5', async () => {
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

	assert.is(result[0]?.json?.b, undefined);
});

suite('test 6', async () => {
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

	assert.is(result[0]?.json?.a, 'x');
	assert.is(result[0]?.json?.b, 'y');
});

suite('test 6', async () => {
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

	assert.is(result[0]?.cars?.[0]?.license, 'ABC-123');
	assert.is(result[0]?.cars?.[1]?.license, 'XYZ-987');
});

suite('Json containing wildcard attribute', async () => {
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

	assert.is(resources[0]?.json?.['*'], 'x');
});

suite.only('Json containing wildcard attribute', async () => {
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

	assert.is(resources[0]?.json?.a, undefined);
});

suite.only('Json containing wildcard attribute', async () => {
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

	assert.is(resources[0]?.json?.['*'].a, 'x');
	assert.is(resources[0]?.json?.['*'].b, undefined);
	assert.is(resources[0]?.json?.c, undefined);
});

suite.run();
