const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const aiRoutes = require('./routes/ai');
const sosRoutes = require('./routes/sos');

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/ai', aiRoutes);
app.use('/api/sos', sosRoutes);

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'AuraHealth API is running' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
