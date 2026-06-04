const run = async () => {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@tiffin.com',
        password: 'student123'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Token retrieved:', token ? 'YES' : 'NO');

    const rateRes = await fetch('http://localhost:5000/api/meal/rate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        rating: 5,
        comment: 'Superb food today!',
        mealName: 'Palak Paneer',
        dayName: 'Friday'
      })
    });
    console.log('Rate status:', rateRes.status);
    const rateData = await rateRes.json();
    console.log('Rate data:', rateData);

    const getRes = await fetch('http://localhost:5000/api/admin/ratings', {
      headers: {
        Authorization: `Bearer ${token}` // This should fail because it's a student
      }
    });
    console.log('Get ratings status (should be 403):', getRes.status);
    
  } catch (err) {
    console.error('Error:', err);
  }
};

run();
