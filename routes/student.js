const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');
const auth = require('../middleware/auth');

router.use(auth);
router.use((req, res, next) => {
    if (req.user.role !== 'student') return res.status(403).json({ message: '仅学生可操作' });
    next();
});

router.post('/apply', (req, res) => {
    const { room_id, date, period } = req.body;
    if (!room_id || !date || !period) return res.status(400).json({ message: '请填写完整信息' });
    if (!['上午', '下午'].includes(period)) return res.status(400).json({ message: '时段只能是上午或下午' });

    const room = get('SELECT * FROM rooms WHERE id = ?', [room_id]);
    if (!room) return res.status(404).json({ message: '机房不存在' });

    const duplicate = get("SELECT * FROM orders WHERE student_id = ? AND room_id = ? AND date = ? AND period = ? AND status != 'rejected'", [req.user.user_no, room_id, date, period]);
    if (duplicate) return res.status(400).json({ message: '你已提交过相同的预约，请勿重复申请' });

    const conflictUser = get("SELECT * FROM orders WHERE student_id = ? AND date = ? AND period = ? AND status != 'rejected'", [req.user.user_no, date, period]);
    if (conflictUser) return res.status(400).json({ message: '你已在该时段预约了其他机房' });

    const approvedCount = get("SELECT COUNT(*) as count FROM orders WHERE room_id = ? AND date = ? AND period = ? AND status = 'approved'", [room_id, date, period]);
    if (approvedCount && approvedCount.count >= room.capacity) return res.status(400).json({ message: '该时段机房已满，无法预约' });

    run('INSERT INTO orders (student_id, student_name, room_id, date, period, status) VALUES (?, ?, ?, ?, ?, ?)', [req.user.user_no, req.user.name, room_id, date, period, 'pending']);
    const lastId = get('SELECT last_insert_rowid() as id').id;
    res.json({ message: '预约申请成功', order_id: lastId });
});

router.get('/my-orders', (req, res) => {
    const orders = all('SELECT o.*, r.name as room_name FROM orders o JOIN rooms r ON o.room_id = r.id WHERE o.student_id = ? ORDER BY o.created_at DESC', [req.user.user_no]);
    res.json(orders);
});

router.get('/all-orders', (req, res) => {
    const orders = all('SELECT o.*, r.name as room_name FROM orders o JOIN rooms r ON o.room_id = r.id ORDER BY o.created_at DESC');
    res.json(orders);
});

router.delete('/cancel/:id', (req, res) => {
    const order = get('SELECT * FROM orders WHERE id = ? AND student_id = ?', [req.params.id, req.user.user_no]);
    if (!order) return res.status(404).json({ message: '预约不存在或不属于你' });
    if (order.status === 'rejected') return res.status(400).json({ message: '已拒绝的预约无需取消' });
    run('DELETE FROM orders WHERE id = ?', [req.params.id]);
    res.json({ message: '预约已取消' });
});

module.exports = router;