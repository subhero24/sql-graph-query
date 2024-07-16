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

test('single row with id', () => {
	db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
	`);

	let result = db.query`users {
		id
	}`;

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].id, '1');
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

	let result = db.query`users {
		id
	}`;

	assert.strictEqual(result.length, 2);
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

	let result = db.query`users {
		id
		name
	}`;

	assert.strictEqual(result.length, 2);
	assert.strictEqual(result[0].id, '1');
	assert.strictEqual(result[1].id, '2');
	assert.strictEqual(result[0].name, 'John');
	assert.strictEqual(result[1].name, 'Peter');
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

	let result = db.query`users {
		name
	}`;

	assert.strictEqual(result.length, 2);
	assert.strictEqual(result[0].id, undefined);
	assert.strictEqual(result[1].id, undefined);
	assert.strictEqual(result[0].name, 'John');
	assert.strictEqual(result[1].name, 'Peter');
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

	let result = db.query`users WHERE name = 'Peter' {
		id
	}`;

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].id, '2');
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

	let result = db.query`
		users {	
			name	
		}`;

	assert.strictEqual(result?.[0]?.name, 'John');
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

	let result = db.query`users {
		id
		name
		cars {
			id
			brand
		}
	}`;

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].cars?.length, 1);
	assert.strictEqual(result[0].id, '1');
	assert.strictEqual(result[0].name, 'John');
	assert.strictEqual(result[0].cars[0].id, '1');
	assert.strictEqual(result[0].cars[0].brand, 'Chevrolet');
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

	let result = db.query`users {
		name
		cars {
			brand
		}
	}`;

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].cars?.length, 1);
	assert.strictEqual(result[0].name, 'John');
	assert.strictEqual(result[0].cars[0].brand, 'Chevrolet');
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

	let result = db.query`users {
		cars {
			brand
		}
	}`;

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].cars?.length, 1);
	assert.strictEqual(result[0].cars[0].brand, 'Chevrolet');
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

	let result = db.query`users {
		cars {
			brand
		}
	}`;

	assert.strictEqual(result.length, 2);
	assert.strictEqual(result[0].cars?.length, 1);
	assert.strictEqual(result[1].cars?.length, 0);
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

	let result = db.query`users {
		cars {
			brand
		}
	}`;

	assert.strictEqual(result.length, 2);
	assert.strictEqual(result[0].cars?.length, 1);
	assert.strictEqual(result[1].cars?.length, 1);
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

	let result = db.query`users {
		car {
			brand
		}
	}`;

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].car?.brand, 'Chevrolet');
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

	let result = db.query`users {
		cars {
			id
		}
	}`;

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].cars?.length, 1);
	assert.strictEqual(result[0].cars[0].id, '1');
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

	let result = db.query`
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

	assert.strictEqual(result[0]?.car?.brand?.name, 'Chevrolet');
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

	let result = db.query`
		users {
			name
		}

		cars {
			brand
		}
	}`;

	assert.strictEqual(result?.users?.[0]?.name, 'John');
	assert.strictEqual(result?.cars?.[0]?.brand, 'Chevrolet');
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

	let result = db.query`
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

	assert.strictEqual(result?.[0]?.user?.cars?.length, 2);
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

	let result = db.query`users {
		COUNT(*) AS length
	}`;

	assert.strictEqual(result[0].length, 2);
});

test('attributes with 1 character', () => {
	db.exec(`
		CREATE TABLE "resources" (
			"a" TEXT
		);

		INSERT INTO "resources"("a") VALUES ('1');
	`);

	let result = db.query`resources {
		a
	}`;

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].a, '1');
});

test('attributes with SQL keywords', () => {
	db.exec(`
		CREATE TABLE "resources" (
			"from" TEXT
		);

		INSERT INTO "resources"("from") VALUES ('1');
	`);

	let result = db.query`resources {
		from
	}`;

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].from, '1');
});

test('relation names with SQL keywords', () => {
	db.exec(`
		CREATE TABLE "values" (
			"attribute" TEXT
		);

		INSERT INTO "values"("attribute") VALUES ('1');
	`);

	let result = db.query`values {
		attribute
	}`;

	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].attribute, '1');
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

	let result = db.query`users {
		car {
			license
		}
		cars {
			license
		}
	}`;

	assert.strictEqual(result[0]?.car?.license, 'ABC-123');
	assert.strictEqual(result[0]?.cars?.[0]?.license, 'ABC-123');
	assert.strictEqual(result[0]?.cars?.[1]?.license, 'XYZ-987');
});

test('joins', async () => {
	await db.exec(`
		CREATE TABLE "cars" (
			"id" TEXT PRIMARY KEY,
			"license" TEXT
		);

		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"carId" TEXT REFERENCES "cars"("id"),
			"name" TEXT
		);

		INSERT INTO "cars"("id", "license") VALUES ('1', 'ABC-123');
		INSERT INTO "users"("id", "carId", "name") VALUES ('1', '1', 'John');
	`);

	let result = await db.query`
		users JOIN cars ON users.carId = cars.id ORDER BY license {
			id
			name
		}`;

	assert.strictEqual(result[0]?.name, 'John');
});
