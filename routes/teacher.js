const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');
const auth = require('../middleware/auth');

router.use(auth);
router.use((req, res, next) => {
    if (req.user.role !== 'teacher') return res.status(403).json({ message: '仅教师可操作' });
    next();
});

router.get('/all-orders', (req, res) => {
    const orders = all('SELECT o.*, r.name as room_name FROM orders o JOIN rooms r ON o.room_id = r.id ORDER BY o.created_at DESC');
    res.json(orders);
});

router.put('/review/:id', (req, res) => {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: '审核结果只能是 approved 或 rejected' });

    const order = get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ message: '预约不存在' });
    if (order.status !== 'pending') return res.status(400).json({ message: '该预约已审核过' });

    if (status === 'approved') {
        const room = get('SELECT * FROM rooms WHERE id = ?', [order.room_id]);
        const approvedCount = get("SELECT COUNT(*) as count FROM orders WHERE room_id = ? AND date = ? AND period = ? AND status = 'approved'", [order.room_id, order.date, order.period]);
        if (approvedCount && approvedCount.count >= room.capacity) return res.status(400).json({ message: '审核失败：该时段机房已满' });

        const userApproved = get("SELECT * FROM orders WHERE student_id = ? AND date = ? AND period = ? AND status = 'approved' AND id != ?", [order.student_id, order.date, order.period, req.params.id]);
        if (userApproved) return res.status(400).json({ message: '审核失败：该学生在此时间段已有审核通过的预约' });
    }

    run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: status === 'approved' ? '审核通过' : '审核拒绝' });
});

module.exports = router;