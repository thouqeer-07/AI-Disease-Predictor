const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const aiRoutes = require('./routes/ai');
const sosRoutes = require('./routes/sos');
const adminRoutes = require('./routes/admin');
const doctorRoutes = require('./routes/doctors');
const patientRoutes = require('./routes/patients');
const { seedAdmin } = require('./services/adminSeeder');
const { connectToWhatsApp } = require('./services/whatsappService');

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/ai', aiRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'AuraHealth API is running' });
});

// Start Server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('\n==================================================');
  console.log('🚀 [AI SERVICE STATUS] Active Model Configured:');
  console.log('   1. Primary ML Model : RandomForestClassifier (rf_disease_pipeline.joblib)');
  console.log('==================================================\n');

  // Run admin seeding script on startup
  await seedAdmin();
  
  // Initialize WhatsApp Baileys socket for SOS
  try {
    await connectToWhatsApp();
  } catch (err) {
    console.error('Failed to initialize WhatsApp service:', err);
  }
});
