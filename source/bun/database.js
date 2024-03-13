export default class Database {
	constructor(database) {
		this.database = database;
	}

	prepare(sql) {
		return this.database.query(sql);
	}

	all(statement, variables) {
		return statement.all(variables);
	}

	finalize(statement) {
		statement.finalize();
	}
}
