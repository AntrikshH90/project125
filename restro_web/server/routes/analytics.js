const express = require('express');
const router = express.Router();

let analytics = {
    pageViews: 0,
    events: [],
    startTime: new Date()
};

router.post('/', (req, res) => {
    const { event, seconds, path } = req.body || {};
    if (event === 'pageview' && path) {
        analytics.pageViews++;
    }
    if (event) {
        analytics.events.push({ event, seconds, path, at: new Date() });
        if (analytics.events.length > 1000) analytics.events.shift();
    }
    res.json({ success: true });
});

router.get('/stats', (req, res) => {
    const uptime = Math.floor((Date.now() - analytics.startTime) / 1000);
    res.json({
        success: true,
        data: {
            pageViews: analytics.pageViews,
            events: analytics.events.length,
            uptime,
            timestamp: new Date()
        }
    });
});

module.exports = router;
