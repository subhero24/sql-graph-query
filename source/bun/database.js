export default class Database {
	constructor(database) {
		this.database = database;
	}

	all(sql, variables) {
		let statement = this.database.query(sql);
		try {
			return statement.all(variables);
		} finally {
			statement.finalize();
		}
	}

	prepare(sql) {
		return this.database.query(sql);
	}

	run(statement, variables) {
		return statement.all(variables);
	}

	finalize(statement) {
		statement.finalize();
	}
}
