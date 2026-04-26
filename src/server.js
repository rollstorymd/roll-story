const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Restrict cross-origin access to the production domain.
// Set ALLOWED_ORIGIN in your Render environment variables.
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

const apiRoutes = require('./routes/api.routes');
const adminRoutes = require('./routes/admin.routes');

app.use('/api', apiRoutes);
app.use('/api/admin', adminRoutes);

// Return JSON 404 for unknown API routes; fall through to index.html for everything else.
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`Roll Story running on http://localhost:${PORT}`);
});

module.exports = app;
