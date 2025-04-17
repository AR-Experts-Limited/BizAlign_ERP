const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();
require('dotenv').config();

// ✅ Generate JWT Access Token
const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

// ✅ Generate JWT Refresh Token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

// EXAMPLE: GET /api/applicationAuth/application-settings/logo
// Fetch the companyLogo from ApplicationSettings
router.get('/application-settings/logo', async (req, res) => {
  const ApplicationSettings = req.db.model('ApplicationSettings', require('../models/ApplicationSettings').schema);
  try {
    // If you only have one doc for the entire application:
    const settings = await ApplicationSettings.findOne();
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'No application settings found.'
      });
    }

    return res.status(200).json({
      success: true,
      companyLogo: settings.companyLogo,
      primaryThemeColour: settings.primaryThemeColour,
      secondaryThemeColour: settings.secondaryThemeColour,
      message: 'Successfully retrieved company logo from ApplicationSettings.'
    });
  } catch (error) {
    console.error('Error fetching company logo from ApplicationSettings:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching company logo.',
      error: error.message
    });
  }
});


/**
 * POST /api/applicationAuth/check-company
 * Body example: { "userID": "215000006" }
 */
router.post('/check-company', async (req, res) => {
  const CompanyMetadata = req.db.model('CompanyMetadata', require('../models/companyMetadata').schema);
  try {
    const { cID } = req.body;
    const clientType = req.headers['client-type']; // e.g. "app"
    const origin = req.headers['origin'];
    const host = req.headers['host'];

    console.log('Client-Type:', clientType);
    console.log('Origin:', origin);
    console.log('Host:', host);

    if (!cID) {
      return res.status(400).json({
        success: false,
        message: 'cID is required in the request body.',
      });
    }

    // Example: prefix = first 3 digits of userID string
    const prefix = cID.toString().slice(0, 3);

    // Find the matching company document
    const company = await CompanyMetadata.findOne({ companyID: Number(prefix) });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: `No company found for prefix ${prefix}`
      });
    }

    // Return info to the client
    return res.status(200).json({
      success: true,
      companyURL: company.companyURL,   // e.g. "rainaltd"
      companyName: company.companyName,
      companyLogo: company.companyLogo, // e.g. "https://example.com/logo.png"
      message: `Company found: ${company.companyName}`,
    });
  } catch (error) {
    console.error('Error in check-company route:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
      error: error.message,
    });
  }
});


// Authenticate a user - login
router.post('/login', async (req, res) => {
  const User = req.db.model('User', require('../models/User').schema);
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Both email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.otpVerified) {
      return res.status(401).json({ message: 'OTP verification required.' });
    }

    // Generate Tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    //  Store hashed refresh token in DB
    user.refreshToken = refreshToken;
    await user.save();
    
    res.status(200).json({
      message: 'Login successful',
      success: true,
      accessToken,
      refreshToken,
      user: { email: user.email, role: user.role, user_ID: user.user_ID },
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// 🚀 LOGOUT API (Invalidate Refresh Token)
router.post('/logout', async (req, res) => {
  const User = req.db.model('User',require('../models/User').schema);

  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    // Find user by refreshToken
    const user = await User.findOne({ refreshToken });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Clear refresh token from DB
    user.refreshToken = null;
    await user.save();

    res.status(200).json({ message: 'User logged out successfully' });
  } catch (error) {
    console.error('❌ Error during logout:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//  REFRESH TOKEN API (Returns New Access Token)
router.post('/refresh-token', async (req, res) => {
  const User = req.db.model('User',require('../models/User').schema);
  const { refreshToken } = req.body;

  if (!refreshToken) return res.status(401).json({ message: 'Refresh Token required' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findOne({ _id: decoded.userId });

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const newAccessToken = generateAccessToken(user);
    res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
});

//  Middleware to Protect Routes
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid Token' });
    req.user = decoded;
    next();
  });
};



// 🚀 Example of a Protected API
router.get('/protected', verifyToken, (req, res) => {
  const User = req.db.model('User',require('../models/User').schema);
  res.json({ message: 'This is a protected route.', user: req.user });
});


// Check OTP status
router.post('/check-otp-status', async (req, res) => {
  const User = req.db.model('User', require('../models/User').schema);
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      otpVerified: user.otpVerified,
      firstName: user.firstName,
      user_ID: user.user_ID,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Validate OTP
router.post('/validate-otp', async (req, res) => {
  const User = req.db.model('User', require('../models/User').schema);
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.otpVerified) {
      return res.status(400).json({ message: 'OTP already verified.' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ message: 'OTP expired.' });
    }

    // Mark OTP as verified
    user.otpVerified = true;
    user.otp = null; // Clear OTP
    user.otpExpiry = null; // Clear expiry
    await user.save();

    res.status(200).json({ message: 'OTP verified successfully.' });
  } catch (error) {
    console.error('Error validating OTP:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

//
router.post('/save-token', async (req, res) => {
  const User = req.db.model('User', require('../models/User').schema);
  try {
    const { user_ID, expoPushTokens } = req.body;

    if (!user_ID || !expoPushTokens) {
      return res.status(400).json({ message: 'Both user_ID and Expo Push Token are required' });
    }

    const user = await User.findOne({ user_ID });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // ✅ Overwrite existing push token instead of storing multiple
    user.expoPushTokens = expoPushTokens;
    await user.save();

    res.status(200).json({ message: 'Push token saved successfully', expoPushTokens: user.expoPushTokens });
  } catch (error) {
    console.error('Error saving push token:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});



// ------------------ NEW ENDPOINTs ---------------------------------------------------------------------

//  Forgot Password
router.post('/forgot-password', async (req, res) => {
  const User = req.db.model('User',require('../models/User').schema);
  const origin = req.headers['origin'];
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found. Please Check you Email ID' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpiry = Date.now() + 15 * 60 * 1000; // 15 mins expiry
    await user.save();

    const resetLink = `${origin}/reset-password/${resetToken}`;
    console.log(origin);

    res.status(200).json({ resetLink, message: 'Reset link generated successfully.' });
  }catch (error){
    console.error('Error Resetting Password', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});


router.post('/reset-password/:token', async (req, res) => {
  const User = req.db.model('User',require('../models/User').schema);
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ message: 'Invalid or expired reset link.' });

  user.password = await bcrypt.hash(req.body.password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;

  await user.save();

  // Send confirmation email (optional but recommended)
  res.status(200).json({ message: 'Your password has been reset successfully.' });
});



module.exports = router;
