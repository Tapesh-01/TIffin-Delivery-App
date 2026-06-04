const Poll = require('../models/Poll');
const { logActivity } = require('../utils/activityLogger');

// @desc    Get active poll
// @route   GET /api/polls/active
// @access  Private
exports.getActivePoll = async (req, res) => {
  try {
    let poll = await Poll.findOne({ isActive: true });

    // Seed default poll if none active exists
    if (!poll) {
      poll = await Poll.create({
        question: "What should be Saturday's Special?",
        option_a: "Chole Bhature 🍛",
        option_b: "Paneer Tikka 🧀",
        votes_a: 14,
        votes_b: 11
      });
    }

    const hasVoted = poll.votedUsers.includes(req.user.id);
    const totalVotes = poll.votes_a + poll.votes_b;

    res.json({
      success: true,
      data: {
        id: poll._id,
        question: poll.question,
        option_a: poll.option_a,
        option_b: poll.option_b,
        votes_a: poll.votes_a,
        votes_b: poll.votes_b,
        totalVotes,
        hasVoted,
        votedOption: hasVoted ? (poll.votedUsers.indexOf(req.user.id) % 2 === 0 ? 'a' : 'b') : null // simple mock check or fallback
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Vote in active poll
// @route   POST /api/polls/vote
// @access  Private
exports.votePoll = async (req, res) => {
  const { option } = req.body; // 'a' or 'b'
  if (!['a', 'b'].includes(option)) {
    return res.status(400).json({ success: false, message: 'Invalid option selected. Select a or b.' });
  }

  try {
    const poll = await Poll.findOne({ isActive: true });
    if (!poll) {
      return res.status(404).json({ success: false, message: 'No active poll found' });
    }

    if (poll.votedUsers.includes(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Aapne pehle hi vote kar diya hai!' });
    }

    // Record vote
    if (option === 'a') {
      poll.votes_a += 1;
    } else {
      poll.votes_b += 1;
    }
    poll.votedUsers.push(req.user.id);
    await poll.save();

    const totalVotes = poll.votes_a + poll.votes_b;
    const pollData = {
      id: poll._id,
      question: poll.question,
      option_a: poll.option_a,
      option_b: poll.option_b,
      votes_a: poll.votes_a,
      votes_b: poll.votes_b,
      totalVotes
    };

    // Broadcast poll update to all connected socket clients in real-time
    const io = req.app.get('io');
    if (io) {
      io.emit('poll_updated', pollData);
      console.log('📡 Broadcasted poll_updated to clients:', pollData);
    }

    const selectedOptionText = option === 'a' ? poll.option_a : poll.option_b;
    await logActivity(req.app, req.user.id, 'poll_voted', `Voted in poll: "${poll.question}" (Selected: "${selectedOptionText}")`);

    res.json({
      success: true,
      message: 'Vote cast successfully!',
      data: {
        ...pollData,
        hasVoted: true,
        votedOption: option
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
