const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "caltrack_db",
  password: "TSUNADE@106",
  port: 5432,
});

module.exports = pool;
