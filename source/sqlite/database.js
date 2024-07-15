export default class Database {
	constructor(database) {
		this.database = database;
	}

	all(sql, variables) {
		return this.database.all(sql, variables);
	}

	prepare(sql) {
		return this.database.prepare(sql);
	}

	run(statement, variables) {
		return statement.all(variables);
	}

	finalize(statement) {
		return statement.finalize();
	}
}
