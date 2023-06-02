# GraphSql

A tiny sql query runner

## Installation

```
npm install https://github.com/subhero24/graph-sql
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