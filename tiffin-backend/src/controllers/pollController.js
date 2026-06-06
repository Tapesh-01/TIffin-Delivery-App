const Poll = require('../models/Poll');
const { logActivity } = require('../utils/activityLogger');

const PRESET_POLLS = [
  {
    question: "What should be next week's Sunday Special?",
    option_a: "Special Veg Biryani + Raita 🍛",
    option_b: "Butter Paneer Masala + Butter Naan 🫓"
  },
  {
    question: "Which sweet should we add in Friday's dinner?",
    option_a: "Hot Gulab Jamun (2 pcs) 🍡",
    option_b: "Creamy Kheer Sagar 🥣"
  },
  {
    question: "Choose the mid-week energy booster lunch side:",
    option_a: "Aloo Jeera + Masala Chaas 🥛",
    option_b: "Veg Cutlet + Mint Chutney 🍃"
  },
  {
    question: "What's the preferred choice for Saturday's Cheat Meal?",
    option_a: "Paneer Tikka Roll 🌯",
    option_b: "Chole Bhature 🍛"
  },
  {
    question: "Which option for Monday's healthy restart?",
    option_a: "Dal Makhani + Jeera Rice 🍛",
    option_b: "Mix Veg + Butter Roti 🫓"
  }
];

const getWeekIdentifier = (date) => {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);
  return `${target.getFullYear()}-W${weekNum}`;
};

// @desc    Get active poll
// @route   GET /api/polls/active
// @access  Private
exports.getActivePoll = async (req, res) => {
  try {
    let poll = await Poll.findOne({ isActive: true });
    const currentWeekId = getWeekIdentifier(new Date());

    // Check if the current poll is from a past week
    if (poll) {
      const pollWeekId = getWeekIdentifier(poll.createdAt);
      if (pollWeekId !== currentWeekId) {
        // Deactivate old poll
        poll.isActive = false;
        await poll.save();
        poll = null;
      }
    }

    // Seed/Create poll for the current week if none exists
    if (!poll) {
      const weekNumStr = currentWeekId.split('-W')[1];
      const weekNum = parseInt(weekNumStr, 10) || 0;
      const preset = PRESET_POLLS[weekNum % PRESET_POLLS.length];

      poll = await Poll.create({
        question: preset.question,
        option_a: preset.option_a,
        option_b: preset.option_b,
        votes_a: 0,
        votes_b: 0,
        isActive: true,
        createdAt: new Date()
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
        votedOption: hasVoted ? (poll.votedUsers.indexOf(req.user.id) % 2 === 0 ? 'a' : 'b') : null,
        createdAt: poll.createdAt
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
  const currentDay = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  if (currentDay === 6 || currentDay === 0) {
    return res.status(400).json({ success: false, message: 'Voting has closed for this week! Results are now visible.' });
  }

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
