const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);
router.use((req, res, next) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ message: '仅学生可操作' });
    }
    next();
});

router.post('/apply', (req, res) => {
    const { room_id, date, period } = req.body;

    if (!room_id || !date || !period) {
        return res.status(400).json({ message: '请填写完整信息' });
    }

    if (!['上午', '下午'].includes(period)) {
        return res.status(400).json({ message: '时段只能是上午或下午' });
    }

    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room_id);
    if (!room) {
        return res.status(404).json({ message: '机房不存在' });
    }

    // 检测：同一人不能重复提交完全相同的预约
    const duplicate = db.prepare(
        "SELECT * FROM orders WHERE student_id = ? AND room_id = ? AND date = ? AND period = ? AND status != 'rejected'"
    ).get(req.user.user_no, room_id, date, period);
    if (duplicate) {
        return res.status(400).json({ message: '你已提交过相同的预约，请勿重复申请' });
    }

    // 检测：同一人同时段不能约不同机房
    const conflictUser = db.prepare(
        "SELECT * FROM orders WHERE student_id = ? AND date = ? AND period = ? AND status != 'rejected'"
    ).get(req.user.user_no, date, period);
    if (conflictUser) {
        return res.status(400).json({ message: '你已在该时段预约了其他机房' });
    }

    // 检测：机房容量是否已满
    const approvedCount = db.prepare(
        "SELECT COUNT(*) as count FROM orders WHERE room_id = ? AND date = ? AND period = ? AND status = 'approved'"
    ).get(room_id, date, period).count;
    if (approvedCount >= room.capacity) {
        return res.status(400).json({ message: '该时段机房已满，无法预约' });
    }

    const result = db.prepare(
        'INSERT INTO orders (student_id, student_name, room_id, date, period, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.user.user_no, req.user.name, room_id, date, period, 'pending');

    res.json({ message: '预约申请成功', order_id: result.lastInsertRowid });
});

router.get('/my-orders', (req, res) => {
    const orders = db.prepare(
        'SELECT o.*, r.name as room_name FROM orders o JOIN rooms r ON o.room_id = r.id WHERE o.student_id = ? ORDER BY o.created_at DESC'
    ).all(req.user.user_no);
    res.json(orders);
});

router.get('/all-orders', (req, res) => {
    const orders = db.prepare(
        'SELECT o.*, r.name as room_name FROM orders o JOIN rooms r ON o.room_id = r.id ORDER BY o.created_at DESC'
    ).all();
    res.json(orders);
});

router.delete('/cancel/:id', (req, res) => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND student_id = ?').get(req.params.id, req.user.user_no);

    if (!order) {
        return res.status(404).json({ message: '预约不存在或不属于你' });
    }

    if (order.status === 'rejected') {
        return res.status(400).json({ message: '已拒绝的预约无需取消' });
    }

    db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
    res.json({ message: '预约已取消' });
});

module.exports = router;