# SQL Graph Query

A really tiny sql query runner

## Installation

```
npm i sql-graph-query
```

## Basic usage

```javascript
import sqlQueryGraph from 'sql-graph-query';

let db = await Database.open({ filename: databasePath, driver: Sqlite3.Database });
let query = sqlQueryGraph.bind(db);
let result = await query`
	users {
		id
		lastname
		firstname
		cars {
			id
			license
			brand {
				id
				name
			}
		}
	}
`;
```

or add it to the database object `db.query = sqlQueryGraph` and use it like

```javascript
let result = await query`
	users {
		id
		lastname
		firstname
		cars {
			id
			license
			brand {
				id
				name
			}
		}
	}
`;
```
