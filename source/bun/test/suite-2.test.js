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

test('single row with id', () => {
	db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
	`);

	let result = db.graph`users {
		id
	}`;

	expect(result.length).toStrictEqual(1);
	expect(result[0].id).toStrictEqual('1');
});

test('multiple rows with id', () => {
	db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
	`);

	let result = db.graph`users {
		id
	}`;

	expect(result.length).toStrictEqual(2);
});
// });

test('rows with multiple attributes', () => {
	db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
	`);

	let result = db.graph`users {
		id
		name
	}`;

	expect(result.length).toStrictEqual(2);
	expect(result[0].id).toStrictEqual('1');
	expect(result[1].id).toStrictEqual('2');
	expect(result[0].name).toStrictEqual('John');
	expect(result[1].name).toStrictEqual('Peter');
});

test('multiple rows without id', () => {
	db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
	`);

	let result = db.graph`users {
		name
	}`;

	expect(result.length).toStrictEqual(2);
	expect(result[0].id).toStrictEqual(undefined);
	expect(result[1].id).toStrictEqual(undefined);
	expect(result[0].name).toStrictEqual('John');
	expect(result[1].name).toStrictEqual('Peter');
});

test('rows with where condition', () => {
	db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
	`);

	let result = db.graph`users WHERE name = 'Peter' {
		id
	}`;

	expect(result.length).toStrictEqual(1);
	expect(result[0].id).toStrictEqual('2');
});

test('single row without id', () => {
	db.exec(`
		PRAGMA foreign_keys = ON;

		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
	`);

	let result = db.graph`
		users {	
			name	
		}`;

	expect(result?.[0]?.name).toStrictEqual('John');
});

test('nested relation with ids', () => {
	db.exec(`
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

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('1', '1', 'Chevrolet');
	`);

	let result = db.graph`users {
		id
		name
		cars {
			id
			brand
		}
	}`;

	expect(result.length).toStrictEqual(1);
	expect(result[0].cars?.length).toStrictEqual(1);
	expect(result[0].id).toStrictEqual('1');
	expect(result[0].name).toStrictEqual('John');
	expect(result[0].cars[0].id).toStrictEqual('1');
	expect(result[0].cars[0].brand).toStrictEqual('Chevrolet');
});

test('nested relation without ids', () => {
	db.exec(`
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

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('1', '1', 'Chevrolet');
	`);

	let result = db.graph`users {
		name
		cars {
			brand
		}
	}`;

	expect(result.length).toStrictEqual(1);
	expect(result[0].cars?.length).toStrictEqual(1);
	expect(result[0].name).toStrictEqual('John');
	expect(result[0].cars[0].brand).toStrictEqual('Chevrolet');
});

test('deeply nested relations', () => {
	db.exec(`
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

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('1', '1', 'Chevrolet');
	`);

	let result = db.graph`users {
		cars {
			brand
		}
	}`;

	expect(result.length).toStrictEqual(1);
	expect(result[0].cars?.length).toStrictEqual(1);
	expect(result[0].cars[0].brand).toStrictEqual('Chevrolet');
});

test('deeply nested relations for multiple rows', () => {
	db.exec(`
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

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('1', '1', 'Chevrolet');
	`);

	let result = db.graph`users {
		cars {
			brand
		}
	}`;

	expect(result.length).toStrictEqual(2);
	expect(result[0].cars?.length).toStrictEqual(1);
	expect(result[1].cars?.length).toStrictEqual(0);
});

test('deeple nested relations for multiple relations', () => {
	db.exec(`
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

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('1', '1', 'Chevrolet');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('2', '2', 'Kia');
	`);

	let result = db.graph`users {
		cars {
			brand
		}
	}`;

	expect(result.length).toStrictEqual(2);
	expect(result[0].cars?.length).toStrictEqual(1);
	expect(result[1].cars?.length).toStrictEqual(1);
});

test('nested relation without id', () => {
	db.exec(`
		PRAGMA foreign_keys = ON;

		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"carId" TEXT REFERENCES "cars"("id"),
			"name" TEXT
		);

		CREATE TABLE "cars" (
			"id" TEXT PRIMARY KEY,
			"brand" TEXT
		);

		INSERT INTO "cars"("id", "brand") VALUES ('1', 'Chevrolet');
		INSERT INTO "users"("id", "carId", "name") VALUES ('1', '1', 'John');
	`);

	let result = db.graph`users {
		car {
			brand
		}
	}`;

	expect(result.length).toStrictEqual(1);
	expect(result[0].car?.brand).toStrictEqual('Chevrolet');
});

test('nested relation with id', () => {
	db.exec(`
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

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('1', '1', 'Chevrolet');
	`);

	let result = db.graph`users {
		cars {
			id
		}
	}`;

	expect(result.length).toStrictEqual(1);
	expect(result[0].cars?.length).toStrictEqual(1);
	expect(result[0].cars[0].id).toStrictEqual('1');
});

test('deeple nested relations with attributes', () => {
	db.exec(`
		PRAGMA foreign_keys = ON;

		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"carId" TEXT REFERENCES "cars"("id"),
			"firstname" TEXT
		);

		CREATE TABLE "cars" (
			"id" TEXT PRIMARY KEY,
			"brandId" TEXT REFERENCES "brands"("id"),
			"license" TEXT
		);

		CREATE TABLE "brands" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "brands"("id", "name") VALUES ('1', 'Chevrolet');
		INSERT INTO "cars"("id", "brandId", "license") VALUES ('1', '1', 'ABC-123');
		INSERT INTO "users"("id", "carId", "firstname") VALUES ('1', '1', 'John');
	`);

	let result = db.graph`
		users {
			firstname
			car {
				license
				brand {
					id
					name
				}
			}
		}
	`;

	expect(result[0]?.car?.brand?.name).toStrictEqual('Chevrolet');
});

test('multiple queries', () => {
	db.exec(`
		PRAGMA foreign_keys = ON;

		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		CREATE TABLE "cars" (
			"id" TEXT PRIMARY KEY,
			"brand" TEXT
		);


		INSERT INTO "cars"("id", "brand") VALUES ('1', 'Chevrolet');
		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
	`);

	let result = db.graph`
		users {
			name
		}

		cars {
			brand
		}
	}`;

	expect(result?.users?.[0]?.name).toStrictEqual('John');
	expect(result?.cars?.[0]?.brand).toStrictEqual('Chevrolet');
});

test('deeply nested relations with multiple rows', () => {
	db.exec(`
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


		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('1', '1', 'Chevrolet');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('2', '1', 'Volkswagen');
	`);

	let result = db.graph`
		cars {
			brand
			user {
				id
				cars {
					id
					brand
				}
			}
		}
	`;

	expect(result?.[0]?.user?.cars?.length).toStrictEqual(2);
});

test('attributes with SQL expressions', () => {
	db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
	`);

	let result = db.graph`users {
		COUNT(*) AS length
	}`;

	expect(result[0].length).toStrictEqual(2);
});

test('attributes with 1 character', () => {
	db.exec(`
		CREATE TABLE "resources" (
			"a" TEXT
		);

		INSERT INTO "resources"("a") VALUES ('1');
	`);

	let result = db.graph`resources {
		a
	}`;

	expect(result.length).toStrictEqual(1);
	expect(result[0].a).toStrictEqual('1');
});

test('attributes with SQL keywords', () => {
	db.exec(`
		CREATE TABLE "resources" (
			"from" TEXT
		);

		INSERT INTO "resources"("from") VALUES ('1');
	`);

	let result = db.graph`resources {
		from
	}`;

	expect(result.length).toStrictEqual(1);
	expect(result[0].from).toStrictEqual('1');
});

test('relation names with SQL keywords', () => {
	db.exec(`
		CREATE TABLE "values" (
			"attribute" TEXT
		);

		INSERT INTO "values"("attribute") VALUES ('1');
	`);

	let result = db.graph`values {
		attribute
	}`;

	expect(result.length).toStrictEqual(1);
	expect(result[0].attribute).toStrictEqual('1');
});

test('multiple relations to the same table', () => {
	db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"carId" TEXT REFERENCES "cars"("id"),
			"name" TEXT
		);

		CREATE TABLE "cars" (
			"id" TEXT PRIMARY KEY,
			"userId" TEXT REFERENCES "users"("id"),
			"license" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "cars"("id", "userId", "license") VALUES ('1', '1', 'ABC-123');
		INSERT INTO "cars"("id", "userId", "license") VALUES ('2', '1', 'XYZ-987');
		UPDATE "users" SET "carId" = '1' WHERE "id" = '1';
	`);

	let result = db.graph`users {
		car {
			license
		}
		cars {
			license
		}
	}`;

	expect(result[0]?.car?.license).toStrictEqual('ABC-123');
	expect(result[0]?.cars?.[0]?.license).toStrictEqual('ABC-123');
	expect(result[0]?.cars?.[1]?.license).toStrictEqual('XYZ-987');
});
