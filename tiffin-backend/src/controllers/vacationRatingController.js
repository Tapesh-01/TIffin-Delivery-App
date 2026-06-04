const User = require('../models/User');
const MealRating = require('../models/MealRating');
const { logActivity } = require('../utils/activityLogger');

// ─── VACATION MODE ────────────────────────────────────────────────

// POST /api/vacation/request  → Student sets vacation dates
exports.requestVacation = async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Start and end dates are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({ success: false, message: 'End date cannot be before start date' });
    }

    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const vacReq = {
      startDate,
      endDate,
      reason: reason || '',
      days,
      status: 'pending',
      requestedAt: new Date()
    };

    user.vacationRequests.push(vacReq);
    await user.save();

    // Emit live event to admin room
    const io = req.app.get('io');
    if (io) {
      io.to('admins').emit('vacation_requested', {
        userId: user._id,
        userName: user.name,
        phone: user.phone,
        startDate,
        endDate,
        days,
        reason: reason || '',
        requestId: user.vacationRequests[user.vacationRequests.length - 1]._id,
        requestedAt: vacReq.requestedAt
      });
    }

    await logActivity(req.app, user._id, 'vacation_started', `Requested vacation pause from ${startDate} to ${endDate} (${days} days)`);

    res.json({ success: true, message: 'Vacation request submitted!', data: vacReq });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/vacation/my  → Student fetches their vacation list
exports.getMyVacations = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('vacationRequests isOnVacation');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user.vacationRequests, isOnVacation: user.isOnVacation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/vacation/:requestId  → Student cancels a vacation
exports.cancelVacation = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const vac = user.vacationRequests.id(req.params.requestId);
    if (!vac) return res.status(404).json({ success: false, message: 'Vacation request not found' });

    vac.status = 'cancelled';
    await user.save();

    // Notify admin
    const io = req.app.get('io');
    if (io) {
      io.to('admins').emit('vacation_cancelled', { userId: user._id, requestId: req.params.requestId });
    }

    await logActivity(req.app, user._id, 'vacation_cancelled', `Cancelled scheduled vacation request.`);

    res.json({ success: true, message: 'Vacation cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ADMIN: List all vacation requests ───────────────────────────

// GET /api/admin/vacations  → Admin sees all vacation requests
exports.getAllVacations = async (req, res) => {
  try {
    const users = await User.find({ 'vacationRequests.0': { $exists: true } })
      .select('name phone email vacationRequests isOnVacation');

    const allRequests = [];
    users.forEach(u => {
      u.vacationRequests.forEach(v => {
        allRequests.push({
          requestId: v._id,
          userId: u._id,
          userName: u.name,
          phone: u.phone,
          email: u.email,
          startDate: v.startDate,
          endDate: v.endDate,
          days: v.days,
          reason: v.reason,
          status: v.status,
          requestedAt: v.requestedAt
        });
      });
    });

    allRequests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
    res.json({ success: true, count: allRequests.length, data: allRequests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/vacations/:userId/:requestId/status
exports.updateVacationStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'active', 'completed', 'cancelled'
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const vac = user.vacationRequests.id(req.params.requestId);
    if (!vac) return res.status(404).json({ success: false, message: 'Vacation not found' });

    vac.status = status;
    if (status === 'active') user.isOnVacation = true;
    if (status === 'completed' || status === 'cancelled') user.isOnVacation = false;
    await user.save();

    // Notify student
    const io = req.app.get('io');
    if (io) {
      io.to(user._id.toString()).emit('vacation_status_updated', { status, startDate: vac.startDate, endDate: vac.endDate });
    }

    res.json({ success: true, message: `Vacation ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/meal/rate  → Student rates today's meal
exports.rateMeal = async (req, res) => {
  try {
    const { rating, comment, mealName, dayName } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const user = await User.findById(req.user.id).select('name addressHostel addressRoom addressLine');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const today = new Date().toISOString().split('T')[0]; // "2026-05-29"

    // Upsert: one rating per user per day
    const mealRating = await MealRating.findOneAndUpdate(
      { user: req.user.id, date: today },
      {
        userName: user.name,
        rating,
        comment: comment || '',
        mealName: mealName || 'Today\'s Meal',
        dayName: dayName || '',
        date: today
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Emit live to admin room and all connected clients for real-time feed update
    const io = req.app.get('io');
    if (io) {
      io.to('admins').emit('meal_rated', {
        userId: req.user.id,
        userName: user.name,
        rating,
        comment: comment || '',
        mealName: mealName || 'Today\'s Meal',
        dayName: dayName || '',
        date: today,
        ratingId: mealRating._id
      });

      io.emit('new_feed_post', {
        id: mealRating._id,
        user_name: user.name,
        hostel_name: user.addressLine || (user.addressHostel ? `${user.addressHostel}, Room ${user.addressRoom || 'N/A'}` : 'BH-3'),
        rating,
        comment: comment || '',
        likes_yum: 0,
        likes_good: 0,
        created_at: mealRating.createdAt
      });
    }

    await logActivity(req.app, req.user.id, 'meal_rated', `Rated today's meal (${mealName || "Today's Meal"}) as ${rating} Stars. Feedback: "${comment || 'No comment'}"`);

    res.json({ success: true, message: 'Thank you for rating!', data: mealRating });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/meal/feed  → Student views recent meal ratings/reviews
exports.getMealFeed = async (req, res) => {
  try {
    const ratings = await MealRating.find()
      .populate('user', 'addressHostel addressRoom addressLine')
      .sort({ createdAt: -1 })
      .limit(50);
    
    const mapped = ratings.map(r => ({
      id: r._id,
      user_name: r.userName,
      hostel_name: r.user?.addressLine || (r.user?.addressHostel ? `${r.user.addressHostel}, Room ${r.user.addressRoom || 'N/A'}` : 'BH-3'),
      rating: r.rating,
      comment: r.comment,
      likes_yum: 0,
      likes_good: 0,
      created_at: r.createdAt
    }));

    res.json({ success: true, data: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/ratings  → Admin sees all meal ratings
exports.getAllRatings = async (req, res) => {
  try {
    const { date } = req.query; // optional filter by date
    const filter = date ? { date } : {};
    const ratings = await MealRating.find(filter).sort({ createdAt: -1 }).limit(100);
    
    const avgRating = ratings.length > 0
      ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
      : 0;

    res.json({ success: true, count: ratings.length, avgRating: parseFloat(avgRating), data: ratings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/meal/my-rating  → Check if student already rated today
exports.getMyRating = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const rating = await MealRating.findOne({ user: req.user.id, date: today });
    res.json({ success: true, data: rating || null, hasRated: !!rating });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
