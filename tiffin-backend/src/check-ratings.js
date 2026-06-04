require('dotenv').config();
const connectDB = require('./config/db');
const MealRating = require('./models/MealRating');
const User = require('./models/User');

async function run() {
  await connectDB();
  const ratings = await MealRating.find({});
  console.log('--- ALL RATINGS ---');
  console.log(ratings);
  const users = await User.find({});
  console.log('--- ALL USERS ---');
  users.forEach(u => console.log(u.name, u._id, u.role));
  process.exit(0);
}

run();
