const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { run, get, all } = require('../db');
const auth = require('../middleware/auth');

router.use(auth);
router.use((req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: '仅管理员可操作' });
    next();
});

router.post('/add-account', (req, res) => {
    const { user_no, name, password, role } = req.body;
    if (!user_no || !name || !password || !role) return res.status(400).json({ message: '请填写完整信息' });
    if (!['student', 'teacher'].includes(role)) return res.status(400).json({ message: '角色只能是 student 或 teacher' });
    const exist = get('SELECT * FROM users WHERE user_no = ?', [user_no]);
    if (exist) return res.status(400).json({ message: '该编号已存在' });
    const hashed = bcrypt.hashSync(password, 10);
    run('INSERT INTO users (user_no, name, password, role) VALUES (?, ?, ?, ?)', [user_no, name, hashed, role]);
    res.json({ message: '账号创建成功' });
});

router.get('/accounts', (req, res) => {
    const { role } = req.query;
    let users;
    if (role && ['student', 'teacher'].includes(role)) {
        users = all('SELECT id, user_no, name, role, created_at FROM users WHERE role = ?', [role]);
    } else {
        users = all("SELECT id, user_no, name, role, created_at FROM users WHERE role != 'admin'");
    }
    res.json(users);
});

router.delete('/clear-orders', (req, res) => {
    const result = get('SELECT COUNT(*) as count FROM orders');
    run('DELETE FROM orders');
    res.json({ message: `已清空 ${result.count} 条预约记录` });
});

module.exports = router;