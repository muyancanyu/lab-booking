const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);
router.use((req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: '仅管理员可操作' });
    }
    next();
});

router.post('/add-account', (req, res) => {
    const { user_no, name, password, role } = req.body;
    if (!user_no || !name || !password || !role) {
        return res.status(400).json({ message: '请填写完整信息' });
    }
    if (!['student', 'teacher'].includes(role)) {
        return res.status(400).json({ message: '角色只能是 student 或 teacher' });
    }
    const exist = db.prepare('SELECT * FROM users WHERE user_no = ?').get(user_no);
    if (exist) {
        return res.status(400).json({ message: '该编号已存在' });
    }
    const hashed = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (user_no, name, password, role) VALUES (?, ?, ?, ?)').run(user_no, name, hashed, role);
    res.json({ message: '账号创建成功' });
});

router.get('/accounts', (req, res) => {
    const { role } = req.query;
    let users;
    if (role && ['student', 'teacher'].includes(role)) {
        users = db.prepare('SELECT id, user_no, name, role, created_at FROM users WHERE role = ?').all(role);
    } else {
        users = db.prepare('SELECT id, user_no, name, role, created_at FROM users WHERE role != ?').all('admin');
    }
    res.json(users);
});

router.delete('/clear-orders', (req, res) => {
    const count = db.prepare('SELECT COUNT(*) as count FROM orders').get();
    db.prepare('DELETE FROM orders').run();
    res.json({ message: `已清空 ${count.count} 条预约记录` });
});

module.exports = router;