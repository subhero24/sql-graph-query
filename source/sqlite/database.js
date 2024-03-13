export default class Database {
	constructor(database) {
		this.database = database;
	}

	prepare(sql) {
		return this.database.prepare(sql);
	}

	all(statement, variables) {
		return statement.all(variables);
	}

	finalize(statement) {
		return statement.finalize();
	}
}
