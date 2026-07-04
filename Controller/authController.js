const User = require('../Model/User');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// @desc    Sign up a new user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword, role = 'buyer', companyName, payoutInfo } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !confirmPassword || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    if (!['buyer', 'seller'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Seller must provide company name
    if (role === 'seller' && !companyName) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required for seller accounts'
      });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    let safePayout;

    if (role === 'seller') {
      if (!payoutInfo || !payoutInfo.accountHolder || !payoutInfo.bankName || !payoutInfo.accountNumber) {
        return res.status(400).json({
          success: false,
          message: 'Bank name, account holder name, and account number are required for seller accounts'
       });
      }
      const rawAccount = String(payoutInfo.accountNumber).replace(/\D/g, '');
  
      if (rawAccount.length < 4) {
        return res.status(400).json({ success: false, message: 'A valid account number is required' });
      }

      safePayout = {
        accountHolder: payoutInfo.accountHolder.trim(),
        bankName: payoutInfo.bankName.trim(),
        last4: rawAccount.slice(-4)
     };
  }

    // Create new user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      companyName: role === 'seller' ? companyName : undefined,
      payoutInfo: role === 'seller' ? safePayout : undefined
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        companyName: user.companyName || null,
        payoutInfo: user.payoutInfo || null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        companyName: user.companyName || null,
        payoutInfo: user.payoutInfo || null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
