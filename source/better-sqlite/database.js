export default class Database {
	constructor(database) {
		this.database = database;
	}

	prepare(sql) {
		return this.database.prepare(sql);
	}

	all(statement, variables) {
		if (variables == undefined) {
			return statement.all();
		} else {
			return statement.all(variables);
		}
	}

	finalize(statement) {}
}
