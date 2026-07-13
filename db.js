const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'lab_booking.db');

let db;

async function getDb() {
    if (db) return db;
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }
    db.run('PRAGMA foreign_keys = ON');
    return db;
}

function saveDb() {
    if (db) {
        fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
    }
}

async function initDb() {
    const database = await getDb();
    db = database;
    database.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, user_no TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('student', 'teacher', 'admin')), created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    database.run(`CREATE TABLE IF NOT EXISTS rooms (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, capacity INTEGER NOT NULL, equipment TEXT)`);
    database.run(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id TEXT NOT NULL, student_name TEXT NOT NULL, room_id INTEGER NOT NULL, date TEXT NOT NULL, period TEXT NOT NULL CHECK(period IN ('上午', '下午')), status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (room_id) REFERENCES rooms(id))`);

    const rc = database.exec('SELECT COUNT(*) as count FROM rooms');
    if (rc[0].values[0][0] === 0) {
        database.run('INSERT INTO rooms (name, capacity, equipment) VALUES (?, ?, ?)', ['1号机房', 20, '标准配置 · 投影仪']);
        database.run('INSERT INTO rooms (name, capacity, equipment) VALUES (?, ?, ?)', ['2号机房', 50, '高性能 · 双投影 · 音响']);
        database.run('INSERT INTO rooms (name, capacity, equipment) VALUES (?, ?, ?)', ['3号机房', 100, '旗舰配置 · 智能黑板 · 录播']);
        console.log('机房数据已初始化');
    }
    const uc = database.exec('SELECT COUNT(*) as count FROM users');
    if (uc[0].values[0][0] === 0) {
        database.run('INSERT INTO users (user_no, name, password, role) VALUES (?, ?, ?, ?)', ['2024001', '张三', bcrypt.hashSync('123456', 10), 'student']);
        database.run('INSERT INTO users (user_no, name, password, role) VALUES (?, ?, ?, ?)', ['T001', '李老师', bcrypt.hashSync('123456', 10), 'teacher']);
        database.run('INSERT INTO users (user_no, name, password, role) VALUES (?, ?, ?, ?)', ['admin', '管理员', bcrypt.hashSync('admin', 10), 'admin']);
        console.log('用户数据已初始化');
    }
    saveDb();
}

function run(sql, params = []) {
    db.run(sql, params);
    saveDb();
}

function get(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
        const cols = stmt.getColumnNames();
        const vals = stmt.get();
        const obj = {};
        cols.forEach((c, i) => obj[c] = vals[i]);
        stmt.free();
        return obj;
    }
    stmt.free();
    return null;
}

function all(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    const cols = stmt.getColumnNames();
    while (stmt.step()) {
        const vals = stmt.get();
        const obj = {};
        cols.forEach((c, i) => obj[c] = vals[i]);
        results.push(obj);
    }
    stmt.free();
    return results;
}

module.exports = { initDb, run, get, all };