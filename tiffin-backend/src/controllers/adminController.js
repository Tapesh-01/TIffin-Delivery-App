const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const ActivityLog = require('../models/ActivityLog');
const Poll = require('../models/Poll');
const { logActivity } = require('../utils/activityLogger');


// 1. Get all users (CRM profiles)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Adjust user wallet balance (credits/refunds)
exports.adjustUserWallet = async (req, res) => {
  const { amount, type, description } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.walletBalance += parseFloat(amount);
    await user.save();

    // Create a transaction log
    const transaction = await Transaction.create({
      user: user._id,
      amount: parseFloat(amount),
      type: type || 'refund',
      description: description || 'Admin adjustment',
      status: 'approved'
    });

    // Emit live wallet update to the student's room
    const io = req.app.get('io');
    if (io) {
      io.to(user._id.toString()).emit('wallet_updated', user.walletBalance);
    }

    await logActivity(req.app, user._id, 'admin_adjustment', `Admin adjusted wallet balance by ${amount >= 0 ? '+' : ''}₹${amount} (${description || 'Admin adjustment'})`);

    res.json({ 
      success: true, 
      walletBalance: user.walletBalance,
      transaction 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Get all transactions (for financial ledger and approvals)
exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('user', 'name email phone role')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: transactions.length, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Update transaction status (Approve/Reject)
exports.updateTransactionStatus = async (req, res) => {
  const { status } = req.body;
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Transaction is already approved' });
    }

    const io = req.app.get('io');

    if (status === 'approved') {
      // Find the user and credit their wallet
      const user = await User.findById(transaction.user);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User associated with transaction not found' });
      }

      user.walletBalance += Math.abs(transaction.amount);
      await user.save();
      
      transaction.status = 'approved';
      await transaction.save();

      await logActivity(req.app, transaction.user, 'wallet_recharge_approved', `Approved wallet recharge of ₹${Math.abs(transaction.amount)} (UTR: ${transaction.utr || 'N/A'})`);

      // Emit live wallet update to the student's room
      if (io) {
        io.to(user._id.toString()).emit('wallet_updated', user.walletBalance);
      }
    } else if (status === 'rejected' || status === 'failed') {
      transaction.status = 'failed';
      await transaction.save();

      await logActivity(req.app, transaction.user, 'wallet_recharge_rejected', `Rejected wallet recharge of ₹${Math.abs(transaction.amount)} (UTR: ${transaction.utr || 'N/A'})`);

      // Emit update event to student's room to trigger transaction ledger update
      const user = await User.findById(transaction.user);
      if (user && io) {
        io.to(user._id.toString()).emit('wallet_updated', user.walletBalance);
      }
    } else {
      transaction.status = status;
      await transaction.save();
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Delete student user (CRM)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Get recent 100 activity logs
exports.getActivityLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .populate('user', 'name phone email role')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Create a new active poll
exports.createPoll = async (req, res) => {
  const { question, option_a, option_b } = req.body;
  if (!question || !option_a || !option_b) {
    return res.status(400).json({ success: false, message: 'All fields (question, option_a, option_b) are required.' });
  }

  try {
    // Deactivate any existing active polls
    await Poll.updateMany({ isActive: true }, { isActive: false });

    // Create new active poll
    const newPoll = await Poll.create({
      question,
      option_a,
      option_b,
      votes_a: 0,
      votes_b: 0,
      votedUsers: [],
      isActive: true
    });

    // Emit live poll update to all connected socket clients in real-time
    const io = req.app.get('io');
    if (io) {
      const pollData = {
        id: newPoll._id,
        question: newPoll.question,
        option_a: newPoll.option_a,
        option_b: newPoll.option_b,
        votes_a: newPoll.votes_a,
        votes_b: newPoll.votes_b,
        totalVotes: 0,
        hasVoted: false,
        votedOption: null
      };
      io.emit('new_poll_created', pollData);
      console.log('📡 Broadcasted new_poll_created to clients:', pollData);
    }

    await logActivity(req.app, req.user.id, 'poll_created', `Admin created new poll: "${question}"`);

    res.status(201).json({
      success: true,
      message: 'New poll deployed successfully!',
      data: {
        id: newPoll._id,
        question: newPoll.question,
        option_a: newPoll.option_a,
        option_b: newPoll.option_b,
        votes_a: newPoll.votes_a,
        votes_b: newPoll.votes_b,
        totalVotes: 0,
        hasVoted: false,
        votedOption: null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 8. Generate today's tiffin orders for all active subscribers
exports.generateTiffinOrders = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0,0,0,0));
    const endOfDay = new Date(today.setHours(23,59,59,999));

    // Find all active subscribers (exclude those on vacation)
    const activeSubscribers = await User.find({
      role: 'student',
      plan: { $ne: 'none' },
      isOnVacation: { $ne: true }
    });

    let generatedCount = 0;
    const generatedOrders = [];

    const planPrices = {
      basic: 70,
      standard: 90,
      premium: 120
    };

    const planItems = {
      basic: [{ name: 'Basic Tiffin Meal (Roti, Dal, Sabji)', quantity: 1, price: 70 }],
      standard: [{ name: 'Standard Tiffin Meal (Roti, Dal, Sabji, Rice)', quantity: 1, price: 90 }],
      premium: [{ name: 'Premium Tiffin Meal (Special Curry, Roti, Dal, Rice, Salad, Sweet)', quantity: 1, price: 120 }]
    };

    for (const subscriber of activeSubscribers) {
      // Check if subscriber already has a tiffin order today
      const existingOrder = await Order.findOne({
        user: subscriber._id,
        isTiffinOrder: true,
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });

      if (!existingOrder) {
        const planType = subscriber.plan;
        const price = planPrices[planType] || 90;
        const items = planItems[planType] || planItems.standard;

        // Deduct from wallet daily balance
        if (subscriber.walletBalance >= price) {
          subscriber.walletBalance -= price;
          await subscriber.save();

          // Log daily deduction
          await Transaction.create({
            user: subscriber._id,
            amount: -price,
            type: 'tiffin_deduction',
            description: `${planType.toUpperCase()} Tiffin daily subscription deduction`,
            status: 'approved'
          });
        }

        const newOrder = await Order.create({
          user: subscriber._id,
          isTiffinOrder: true,
          items,
          totalAmount: price,
          paymentMethod: 'wallet',
          paymentStatus: 'approved',
          status: 'pending',
          latitude: subscriber.latitude || null,
          longitude: subscriber.longitude || null
        });

        const populatedOrder = await Order.findById(newOrder._id)
          .populate('user', 'name email plan role addressLine')
          .populate('rider', 'name phone');

        generatedOrders.push(populatedOrder);
        generatedCount++;

        // Notify admins and student rooms
        const io = req.app.get('io');
        if (io) {
          io.to('admins').emit('new_order', populatedOrder);
          io.to(subscriber._id.toString()).emit('order_status_updated', populatedOrder);
          io.to(subscriber._id.toString()).emit('wallet_updated', subscriber.walletBalance);
        }
      }
    }

    if (generatedCount > 0) {
      await logActivity(req.app, req.user.id, 'tiffins_generated', `Generated ${generatedCount} active tiffin orders for today's subscribers.`);
    }

    res.json({
      success: true,
      message: `Successfully generated ${generatedCount} tiffin orders for today!`,
      count: generatedCount,
      data: generatedOrders
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 9. Update user details (admin edit)
exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const fieldsToUpdate = ['name', 'email', 'phone', 'plan', 'vehicle', 'riderPin', 'isOnline', 'walletBalance', 'isOnVacation'];
    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    await logActivity(req.app, req.user.id, 'user_updated', `Admin updated profile details of user: ${user.name} (${user.role})`);

    res.json({ success: true, message: 'User profile updated successfully', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 10. Create a new user (rider/student/admin)
exports.createUser = async (req, res) => {
  const { name, email, phone, password, role, vehicle, riderPin } = req.body;
  if (!name || !password || !role) {
    return res.status(400).json({ success: false, message: 'Name, password, and role are required' });
  }

  try {
    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }
    }

    if (phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists) {
        return res.status(400).json({ success: false, message: 'Phone number already registered' });
      }
    }

    const newUser = await User.create({
      name,
      email,
      phone,
      password,
      role,
      vehicle: vehicle || '',
      riderPin: riderPin || '',
      isOnline: true
    });

    await logActivity(req.app, req.user.id, 'user_created', `Admin created user profile: ${name} (${role})`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        vehicle: newUser.vehicle,
        riderPin: newUser.riderPin
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

