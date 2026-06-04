const run = async () => {
  try {
    // 1. Login as admin
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@tiffin.com',
        password: 'admin123'
      })
    });
    
    if (!loginRes.ok) {
      console.error('Failed to login:', loginRes.status, await loginRes.text());
      return;
    }
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('🗝️ Logged in as admin. Token retrieved.');
    
    const checkEndpoint = async (name, path) => {
      const url = `http://localhost:5000${path}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`Endpoint: ${name} (${path}) -> Status: ${res.status}`);
      if (!res.ok) {
        console.error(`  Error message:`, await res.text());
      } else {
        const data = await res.json();
        console.log(`  Success, returned ${data.data ? data.data.length : 'no data.data'} items`);
      }
    };

    await checkEndpoint('Orders', '/api/orders');
    await checkEndpoint('Users', '/api/admin/users');
    
    // Test transactions in detail
    const txRes = await fetch('http://localhost:5000/api/admin/transactions', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const txData = await txRes.json();
    console.log('Endpoint: Transactions (/api/admin/transactions) -> Status:', txRes.status);
    console.log('Transactions Count:', txData.data?.length);
    if (txData.data && txData.data.length > 0) {
      console.log('Sample transaction:');
      const sample = txData.data[0];
      console.log({
        id: sample._id,
        amount: sample.amount,
        type: sample.type,
        status: sample.status,
        utr: sample.utr,
        user: sample.user
      });
    }
    
    await checkEndpoint('Weekly Menu', '/api/menu/weekly');
    
  } catch (err) {
    console.error('Error running test:', err.message);
  }
};

run();
