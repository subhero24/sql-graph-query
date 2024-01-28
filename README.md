# SQL Graph Query

A really tiny query runner for sqlite with no dependencies.
Retrieve data from your sqlite database with graphql-like queries.

## Installation

```
npm i sql-graph-query
```

## Basic usage

- it expects your database to have tables with a primary key `id`.
- It also expects your database to have foreign keys that end with `Id`.

```javascript
import sqlGraphQuery from 'sql-graph-query';

db.query = sqlGraphQuery;

let result = await db.query`
	users {
		lastname
		firstname
		cars {
			license
		}
	}
`;
```

or bind the function directly to your database

```javascript
import sqlGraphQuery from 'sql-graph-query';

let db = await Database.open({ filename: databasePath, driver: Sqlite3.Database });
let query = sqlGraphQuery.bind(db);
let result = await query`
	users {
		lastname
		firstname
		cars {
			license
		}
	}
`;
```

## Filtering

You can use plain old SQL to filter the rows you want

```javascript
let result = await db.query`
	users WHERE firstname = 'John' {
		id
		lastname
		firstname
		cars WHERE color IN ('red', 'blue') {
			id
			license
		}
	}
`;
```

### Attributes

You can also use plain old SQL to select custom attributes

```javascript
let result = await db.query`
	users WHERE firstname = 'John' {
		id
		lastname AS name
		cars {
			COUNT(*) AS length
		}
		addresses {
			*
		}
	}
`;
```

## Interpolated values

Use template literal interpolations to use variables in your query

```javascript
let result = await db.query`
	users WHERE firstname = ${firstname} {
		id
		lastname
		firstname
		cars WHERE color IN (${colors}) {
			id
			license
		}
	}
`;
```

## JSON

A column containing JSON strings can also be queried and filtered deeply without any special syntax

```javascript
// A table "shapes" has a column "props" which contains some JSON
// ie. { "radius": 3, "center": { "x": 1, "y": 0 } }

let result = await db.query`
	shapes WHERE type = 'circle' {
		id
		props {
			radius
			center {
				x
				y
			}
		}
	}
`;
```

## Multiple entry points

```javascript
let result = await db.query`
	users  {
		id
		lastname
		firstname
		cars {
			id
		}
	}

	cars {
		id
		license
	}
`;
```

## Mutations

```javascript
let result = await db.query`
	INSERT INTO users(id, firstname, lastname) VALUES ('1', 'John', 'Doe') {
		id
		firstname
		lastname
		cars {
			license
		}
	}
`;
```

```javascript
let result = await db.query`
	UPDATE users SET firstname = 'Peter' WHERE firstname = 'John' {
		id
		firstname
		lastname
		cars {
			license
		}
	}
`;
```
