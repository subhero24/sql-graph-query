import { test, expect, beforeEach, afterEach } from 'bun:test';

import { Database } from 'bun:sqlite';

import query from '../index.js';

let db;

beforeEach(() => {
	db = new Database();
	db.graph = query;
});

afterEach(() => {
	db.close();
});

test('json query with attributes', () => {
	db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"a":"x","b":"y"}');
	`);

	let result = db.graph`resources {
		json {
			a
			b
		}
	}`;

	expect(result[0]?.json?.a).toStrictEqual('x');
	expect(result[0]?.json?.b).toStrictEqual('y');
});

test('json being null', () => {
	db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES (NULL);
	`);

	let result = db.graph`resources {
		json
	}`;

	expect(result[0]?.json).toStrictEqual(null);
});

test('json query without attributes', () => {
	db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"a":"x","b":"y"}');
	`);

	let result = db.graph`resources {
		json
	}`;

	expect(result[0]?.json, '{"a":"x").toStrictEqual("b":"y"}');
});

test('json deeply nested', () => {
	db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"some":{"nested":{"property":"value"}}}');
	`);

	let result = db.graph`resources {
		json {
			some {
				nested {
					property
				}
			}
		}
	}`;

	expect(result[0]?.json?.some?.nested?.property).toStrictEqual('value');
});

test('json filtered attributes', () => {
	db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"a":"x","b":"y"}');
	`);

	let result = db.graph`resources {
		json {
			a
		}
	}`;

	expect(result[0]?.json?.b).toStrictEqual(undefined);
});

test('json wildcard', () => {
	db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"a":"x","b":"y"}');
	`);

	let result = db.graph`resources {
		json {
			*
		}
	}`;

	expect(result[0]?.json?.a).toStrictEqual('x');
	expect(result[0]?.json?.b).toStrictEqual('y');
});

test('json arrays', () => {
	db.exec(`
		CREATE TABLE "users" (
			"cars" TEXT
		);

		INSERT INTO "users"("cars") VALUES ('[{"license":"ABC-123"},{"license":"XYZ-987"}]');
	`);

	let result = db.graph`
		users {
			cars {
				license
			}
		}
	`;

	expect(result[0]?.cars?.[0]?.license).toStrictEqual('ABC-123');
	expect(result[0]?.cars?.[1]?.license).toStrictEqual('XYZ-987');
});

test('json wildcard as attribute', () => {
	db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"*":"x"}');
	`);

	let resources = db.graph`
		resources {
			json {
				*
			}
		}
	`;

	expect(resources[0]?.json?.['*']).toStrictEqual('x');
});

test('json wildcard as attribute filtering', () => {
	db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"*":"x","a":"b"}');
	`);

	let resources = db.graph`
		resources {
			json {
				*
			}
		}
	`;

	expect(resources[0]?.json?.a).toStrictEqual(undefined);
});

test('json wildcard as attribute with nested attributes', () => {
	db.exec(`
		CREATE TABLE "resources" (
			"json" TEXT
		);

		INSERT INTO "resources"("json") VALUES ('{"*":{"a":"x","b":"y"},"c":"z"}');
	`);

	let resources = db.graph`
		resources {
			json {
				* {
					a
				}
			}
		}
	`;

	expect(resources[0]?.json?.['*'].a).toStrictEqual('x');
	expect(resources[0]?.json?.['*'].b).toStrictEqual(undefined);
	expect(resources[0]?.json?.c).toStrictEqual(undefined);
});
