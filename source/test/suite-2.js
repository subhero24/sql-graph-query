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

Test('single row with id', async () => {
	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
	`);

	let result = await db.query`users {
		id
	}`;

	Assert.strictEqual(result.length, 1);
	Assert.strictEqual(result[0].id, '1');
});

Test('multiple rows with id', async () => {
	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
	`);

	let result = await db.query`users {
		id
	}`;

	Assert.strictEqual(result.length, 2);
});
// });

Test('rows with multiple attributes', async () => {
	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
	`);

	let result = await db.query`users {
		id
		name
	}`;

	Assert.strictEqual(result.length, 2);
	Assert.strictEqual(result[0].id, '1');
	Assert.strictEqual(result[1].id, '2');
	Assert.strictEqual(result[0].name, 'John');
	Assert.strictEqual(result[1].name, 'Peter');
});

Test('multiple rows without id', async () => {
	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
	`);

	let result = await db.query`users {
		name
	}`;

	Assert.strictEqual(result.length, 2);
	Assert.strictEqual(result[0].id, undefined);
	Assert.strictEqual(result[1].id, undefined);
	Assert.strictEqual(result[0].name, 'John');
	Assert.strictEqual(result[1].name, 'Peter');
});

Test('rows with where condition', async () => {
	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
	`);

	let result = await db.query`users WHERE name = 'Peter' {
		id
	}`;

	Assert.strictEqual(result.length, 1);
	Assert.strictEqual(result[0].id, '2');
});

Test('single row without id', async () => {
	await db.exec(`
		PRAGMA foreign_keys = ON;

		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
	`);

	let result = await db.query`
		users {	
			name	
		}`;

	Assert.strictEqual(result?.[0]?.name, 'John');
});

Test('nested relation with ids', async () => {
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

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
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

	Assert.strictEqual(result.length, 1);
	Assert.strictEqual(result[0].cars?.length, 1);
	Assert.strictEqual(result[0].id, '1');
	Assert.strictEqual(result[0].name, 'John');
	Assert.strictEqual(result[0].cars[0].id, '1');
	Assert.strictEqual(result[0].cars[0].brand, 'Chevrolet');
});

Test('nested relation without ids', async () => {
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

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('1', '1', 'Chevrolet');
	`);

	let result = await db.query`users {
		name
		cars {
			brand
		}
	}`;

	Assert.strictEqual(result.length, 1);
	Assert.strictEqual(result[0].cars?.length, 1);
	Assert.strictEqual(result[0].name, 'John');
	Assert.strictEqual(result[0].cars[0].brand, 'Chevrolet');
});

Test('deeply nested relations', async () => {
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

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('1', '1', 'Chevrolet');
	`);

	let result = await db.query`users {
		cars {
			brand
		}
	}`;

	Assert.strictEqual(result.length, 1);
	Assert.strictEqual(result[0].cars?.length, 1);
	Assert.strictEqual(result[0].cars[0].brand, 'Chevrolet');
});

Test('deeply nested relations for multiple rows', async () => {
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

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('1', '1', 'Chevrolet');
	`);

	let result = await db.query`users {
		cars {
			brand
		}
	}`;

	Assert.strictEqual(result.length, 2);
	Assert.strictEqual(result[0].cars?.length, 1);
	Assert.strictEqual(result[1].cars?.length, 0);
});

Test('deeple nested relations for multiple relations', async () => {
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

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('1', '1', 'Chevrolet');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('2', '2', 'Kia');
	`);

	let result = await db.query`users {
		cars {
			brand
		}
	}`;

	Assert.strictEqual(result.length, 2);
	Assert.strictEqual(result[0].cars?.length, 1);
	Assert.strictEqual(result[1].cars?.length, 1);
});

Test('nested relation without id', async () => {
	await db.exec(`
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

	let result = await db.query`users {
		car {
			brand
		}
	}`;

	Assert.strictEqual(result.length, 1);
	Assert.strictEqual(result[0].car?.brand, 'Chevrolet');
});

Test('nested relation with id', async () => {
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

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('1', '1', 'Chevrolet');
	`);

	let result = await db.query`users {
		cars {
			id
		}
	}`;

	Assert.strictEqual(result.length, 1);
	Assert.strictEqual(result[0].cars?.length, 1);
	Assert.strictEqual(result[0].cars[0].id, '1');
});

Test('deeple nested relations with attributes', async () => {
	await db.exec(`
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

	let result = await db.query`
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

	Assert.strictEqual(result[0]?.car?.brand?.name, 'Chevrolet');
});

Test('multiple queries', async () => {
	await db.exec(`
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

	let result = await db.query`
		users {
			name
		}

		cars {
			brand
		}
	}`;

	Assert.strictEqual(result?.users?.[0]?.name, 'John');
	Assert.strictEqual(result?.cars?.[0]?.brand, 'Chevrolet');
});

Test('deeply nested relations with multiple rows', async () => {
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


		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('1', '1', 'Chevrolet');
		INSERT INTO "cars"("id", "userId", "brand") VALUES ('2', '1', 'Volkswagen');
	`);

	let result = await db.query`
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

	Assert.strictEqual(result?.[0]?.user?.cars?.length, 2);
});

Test('attributes with SQL expressions', async () => {
	await db.exec(`
		CREATE TABLE "users" (
			"id" TEXT PRIMARY KEY,
			"name" TEXT
		);

		INSERT INTO "users"("id", "name") VALUES ('1', 'John');
		INSERT INTO "users"("id", "name") VALUES ('2', 'Peter');
	`);

	let result = await db.query`users {
		COUNT(*) AS length
	}`;

	Assert.strictEqual(result[0].length, 2);
});

Test('attributes with 1 character', async () => {
	await db.exec(`
		CREATE TABLE "resources" (
			"a" TEXT
		);

		INSERT INTO "resources"("a") VALUES ('1');
	`);

	let result = await db.query`resources {
		a
	}`;

	Assert.strictEqual(result.length, 1);
	Assert.strictEqual(result[0].a, '1');
});

Test('attributes with SQL keywords', async () => {
	await db.exec(`
		CREATE TABLE "resources" (
			"from" TEXT
		);

		INSERT INTO "resources"("from") VALUES ('1');
	`);

	let result = await db.query`resources {
		from
	}`;

	Assert.strictEqual(result.length, 1);
	Assert.strictEqual(result[0].from, '1');
});

Test('relation names with SQL keywords', async () => {
	await db.exec(`
		CREATE TABLE "values" (
			"attribute" TEXT
		);

		INSERT INTO "values"("attribute") VALUES ('1');
	`);

	let result = await db.query`values {
		attribute
	}`;

	Assert.strictEqual(result.length, 1);
	Assert.strictEqual(result[0].attribute, '1');
});

Test('multiple relations to the same table', async () => {
	await db.exec(`
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

	let result = await db.query`users {
		car {
			license
		}
		cars {
			license
		}
	}`;

	Assert.strictEqual(result[0]?.car?.license, 'ABC-123');
	Assert.strictEqual(result[0]?.cars?.[0]?.license, 'ABC-123');
	Assert.strictEqual(result[0]?.cars?.[1]?.license, 'XYZ-987');
});
