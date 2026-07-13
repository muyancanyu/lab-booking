const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: '未登录，请先登录' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'lab_booking_2026_secret_key');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: '登录已过期，请重新登录' });
    }
};