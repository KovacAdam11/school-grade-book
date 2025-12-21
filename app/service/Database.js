import mysql from 'mysql2/promise';

// Pripojenie k DB (vo forme connection pool)
const dbPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    namedPlaceholders: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
});

/**
 * Vykonanie SQL prikazu
 *
 * @param sql
 * @param params
 */
async function query(sql, params) {
    let [rows, fields] = await dbPool.query(sql, params);

    return rows;
}

export {dbPool, query};