require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Transaction = require('./models/Transaction');

const checkTx = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📡 Connected to MongoDB');
    
    const txs = await Transaction.find().populate('user', 'name email phone role');
    console.log(`📊 Found ${txs.length} transactions:`);
    txs.forEach(t => {
      console.log(`- ID: ${t._id}, User: ${t.user?.name || 'N/A'}, Phone: ${t.user?.phone || 'N/A'}, Amount: ${t.amount}, Type: ${t.type}, Status: ${t.status}, UTR: ${t.utr}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

checkTx();
