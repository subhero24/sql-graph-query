export default class Database {
	constructor(database) {
		this.database = database;
	}

	all(sql, variables) {
		let statement = this.database.prepare(sql);
		if (variables == undefined) {
			return statement.all();
		} else {
			return statement.all(variables);
		}
	}

	prepare(sql) {
		return this.database.prepare(sql);
	}

	run(statement, variables) {
		if (variables == undefined) {
			return statement.all();
		} else {
			return statement.all(variables);
		}
	}

	finalize() {}
}
