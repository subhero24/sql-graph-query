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

test('value interpolation', () => {
	db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);
		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
	`);

	let result = db.graph`users WHERE name = ${'Peter'} {
		id
	}`;

	expect(result.length).toStrictEqual(1);
	expect(result[0].id).toStrictEqual('2');
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

	let result = db.graph`users WHERE id IN (${['1', '2']}) {
		id
	}`;

	expect(result.length).toStrictEqual(2);
	expect(result[0].id).toStrictEqual('1');
	expect(result[1].id).toStrictEqual('2');
});

test('double interpolation', () => {
	db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);
		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
	`);

	let result = db.graph`users WHERE id = ${'1'} AND name = ${'John'} {
		id
	}`;

	expect(result.length).toStrictEqual(1);
	expect(result[0].id).toStrictEqual('1');
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

	let result = db.graph`users WHERE id IN (${['1', '2', '3', '4']}) AND name IN (${['John', 'Peter']}) {
		id
	}`;

	expect(result.length).toStrictEqual(2);
	expect(result[0].id).toStrictEqual('1');
	expect(result[1].id).toStrictEqual('2');
});
