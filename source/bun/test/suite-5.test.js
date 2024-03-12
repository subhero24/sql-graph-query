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

test('insert mutation', () => {
	db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);
	`);

	let result = db.graph`
		INSERT INTO "users"("id", "name") VALUES ('1', 'John') {
			id
			name
		}
	`;

	expect(result.length).toStrictEqual(1);
	expect(result[0].id).toStrictEqual('1');
	expect(result[0].name).toStrictEqual('John');

	let results = db.graph`
		users {
			id
			name
		}
	`;
	expect(results.length).toStrictEqual(1);
	expect(results[0].id).toStrictEqual('1');
	expect(results[0].name).toStrictEqual('John');
});

test('update mutation', () => {
	db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
	`);

	let result = db.graph`
		UPDATE users SET name = 'Peter' WHERE id = '1' {
			id
			name
		}
	`;

	expect(result.length).toStrictEqual(1);
	expect(result[0].id).toStrictEqual('1');
	expect(result[0].name).toStrictEqual('Peter');

	let results = db.graph`
		users {
			id
			name
		}
	`;

	expect(results.length).toStrictEqual(1);
	expect(results[0].id).toStrictEqual('1');
	expect(results[0].name).toStrictEqual('Peter');
});

test('update mutations', () => {
	db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
	`);

	let result = db.graph`
		UPDATE users SET name = 'Ward' {
			id
			name
		}
	`;

	expect(result.length).toStrictEqual(2);
	expect(result[0].id).toStrictEqual('1');
	expect(result[0].name).toStrictEqual('Ward');
	expect(result[1].id).toStrictEqual('2');
	expect(result[1].name).toStrictEqual('Ward');

	let results = db.graph`
		users {
			id
			name
		}
	`;

	expect(results.length).toStrictEqual(2);
	expect(result[0].id).toStrictEqual('1');
	expect(result[0].name).toStrictEqual('Ward');
	expect(result[1].id).toStrictEqual('2');
	expect(result[1].name).toStrictEqual('Ward');
});
