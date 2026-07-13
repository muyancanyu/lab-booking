const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get } = require('../db');

router.post('/login', (req, res) => {
    const { user_no, name, password, role } = req.body;
    if (!user_no || !name || !password || !role) return res.status(400).json({ message: '请填写完整信息' });
    const user = get('SELECT * FROM users WHERE user_no = ? AND role = ?', [user_no, role]);
    if (!user) return res.status(401).json({ message: '账号或角色不存在' });
    if (user.name !== name) return res.status(401).json({ message: '姓名不匹配' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ message: '密码错误' });
    const token = jwt.sign(
        { id: user.id, user_no: user.user_no, name: user.name, role: user.role },
        process.env.JWT_SECRET || 'lab_booking_2026_secret_key',
        { expiresIn: '7d' }
    );
    res.json({ message: '登录成功', token, user: { user_no: user.user_no, name: user.name, role: user.role } });
});

module.exports = router;