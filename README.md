# GraphSql

A really tiny sql query runner

## Installation

```
npm i https://github.com/subhero24/graph-sql
```

## Basic usage

```javascript
import graphSql from 'graph-sql';

let db = await Database.open({ filename: databasePath, driver: Sqlite3.Database });
let query = graphSql.bind(db);
let result = await query`
	users {
		id
		lastname
		firstname
		cars {
			id
			brand
		}
	}
`;
```

or add it to the database object `db.query = graphSql` and use it like

```javascript
let result = await db.query`
	users {
		id
		lastname
		firstname
		cars {
			id
			brand
		}
	}
`;
```
