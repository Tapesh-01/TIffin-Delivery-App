const axios = require('axios');

const run = async () => {
  try {
    // 1. Login as admin
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@tiffin.com',
      password: 'admin123'
    });
    
    const token = loginRes.data.token;
    console.log('🗝️ Logged in as admin. Token retrieved.');
    
    // 2. Fetch transactions
    const txRes = await axios.get('http://localhost:5000/api/admin/transactions', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📊 API Transactions response:');
    console.log(JSON.stringify(txRes.data, null, 2));
  } catch (err) {
    console.error('Error fetching transactions:', err.response?.data || err.message);
  }
};

run();
