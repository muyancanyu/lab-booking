const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'lab_booking.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_no TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('student', 'teacher', 'admin')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        equipment TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        room_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        period TEXT NOT NULL CHECK(period IN ('上午', '下午')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id)
    );
`);

const roomCount = db.prepare('SELECT COUNT(*) as count FROM rooms').get();
if (roomCount.count === 0) {
    const bcrypt = require('bcryptjs');
    const insertRoom = db.prepare('INSERT INTO rooms (name, capacity, equipment) VALUES (?, ?, ?)');
    insertRoom.run('1号机房', 20, '标准配置 · 投影仪');
    insertRoom.run('2号机房', 50, '高性能 · 双投影 · 音响');
    insertRoom.run('3号机房', 100, '旗舰配置 · 智能黑板 · 录播');
    console.log('机房数据已初始化');
}

const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
    const bcrypt = require('bcryptjs');
    const insertUser = db.prepare('INSERT INTO users (user_no, name, password, role) VALUES (?, ?, ?, ?)');
    insertUser.run('2024001', '张三', bcrypt.hashSync('123456', 10), 'student');
    insertUser.run('T001', '李老师', bcrypt.hashSync('123456', 10), 'teacher');
    insertUser.run('admin', '管理员', bcrypt.hashSync('admin', 10), 'admin');
    console.log('用户数据已初始化');
}

module.exports = db;