const ActivityLog = require('../models/ActivityLog');

exports.logActivity = async (app, userId, activityType, description, ipAddress = '') => {
  try {
    const log = await ActivityLog.create({
      user: userId || null,
      activityType,
      description,
      ipAddress
    });

    let populatedLog = log;
    if (userId) {
      populatedLog = await ActivityLog.findById(log._id).populate('user', 'name phone email role');
    }

    // Broadcast via socket to admin room
    const io = app.get('io');
    if (io) {
      io.to('admins').emit('new_activity_log', populatedLog);
      console.log(`📡 [Activity Broadcast] Broadcasted log to admins: ${description}`);
    }

    return populatedLog;
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};
