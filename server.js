const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api', require('./routes/auth'));
app.use('/api/student', require('./routes/student'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/rooms', (req, res) => {
    const rooms = db.prepare('SELECT * FROM rooms').all();
    res.json(rooms);
});

app.get('/api/rooms/status', (req, res) => {
    const rooms = db.prepare('SELECT * FROM rooms').all();
    const result = rooms.map(room => {
        const stats = db.prepare(`
            SELECT date, period, status, COUNT(*) as count
            FROM orders
            WHERE room_id = ? AND status IN ('pending', 'approved')
            GROUP BY date, period, status
        `).all(room.id);

        const periods = {};
        stats.forEach(s => {
            const key = `${s.date}_${s.period}`;
            if (!periods[key]) periods[key] = { date: s.date, period: s.period, approved: 0, pending: 0 };
            if (s.status === 'approved') periods[key].approved = s.count;
            if (s.status === 'pending') periods[key].pending = s.count;
        });

        return {
            id: room.id,
            name: room.name,
            capacity: room.capacity,
            equipment: room.equipment,
            periods: Object.values(periods)
        };
    });
    res.json(result);
});

app.listen(PORT, () => {
    console.log(`服务已启动: http://localhost:${PORT}`);
});