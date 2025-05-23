const express = require('express');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const userAuth = require('../middleware/userAuth')
const router = express.Router();
const moment = require('moment')
const { sendToClients } = require('../utils/sseService');


const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1d",
  });
  const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
  return { accessToken, refreshToken };
};


router.get('/', async (req, res) => {
  const User = req.db.model('User', require('../models/User').schema)
  try {
    const users = await User.find({disabled: { $ne: true }})
    res.status(200).json(users)
  }
  catch (error) {
    res.status(500).json({ message: 'error fetching users' })
  }
})

router.get('/getUserByEmail/:email', async (req, res) => {
  const User = req.db.model('User', require('../models/User').schema)
  try {
    const user = await User.find({ email: req.params.email, disabled: { $ne: true } });
    res.status(200).json(user);
  }
  catch (error) {
    res.status(500).json({ message: 'error fetching users' })
  }
})

router.post('/is-auth', userAuth, async (req, res) => {
  try {
    res.json({ success: true, message: 'success' })
  }
  catch (error) {
    res.json({ message: 'error' })
  }
})

router.post('/logout', async (req, res) => {
  const User = req.db.model('User', require('../models/User').schema)
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) throw new Error("No refresh token provided");

    const user = await User.findOne({ refreshToken });
    if (user) {
      user.refreshToken = null; // Clear refresh token
      await user.save();
    }

    // Clear the refresh token cookie
    res.clearCookie("refreshToken");
    res.json({ message: "Logout successful" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
})

router.post('/login', async (req, res) => {
  const User = req.db.model('User', require('../models/User').schema)
  const { email, password } = req.body;

  // Check if the user exists
  const user = await User.findOne({ email, disabled: { $ne: true } });
  if (!user) return res.status(400).json({ message: 'User not found' });

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });


  const otp = Math.floor(100000 + Math.random() * 900000);
  user.otp = otp;
  user.otpExpiration = moment().add(10, 'minutes').toDate();  // Expire in 10 minutes
  await user.save();

  // Setup nodemailer transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail', // or your chosen email service
    auth: {
      user: process.env.MAILER_EMAIL, // Your email address
      pass: process.env.MAILER_APP_PASSWORD, // Your email password or app password
    },
  });

  // Send OTP email
  const mailOptions = {
    from: process.env.MAILER_EMAIL, // Sender address
    to: email, // Receiver address (user's email)
    subject: 'Your OTP for login validation',
    html: `<div style="font-family: Arial, sans-serif; background-color: #f4f8ff; padding: 20px; border-radius: 10px; margin:20px; text-align: center; border: 2px solid #2a73cc;">
    <h2 style="color: #2a73cc;">🔐 Login Verification</h2>
    <p style="font-size: 16px; color: #333;">Use the OTP below to complete your login:</p>
    
    <div style="margin: 20px 0; padding: 15px; background-color: #ff9900; color: white; font-size: 24px; font-weight: bold; border-radius: 5px; display: inline-block;letter-spacing: 12px">
        ${otp}
    </div>
    
    <p style="color: #555;">This OTP is valid for 10 minutes. Do not share it with anyone.</p>
</div>
`,
  };




  try {
    await transporter.sendMail(mailOptions);
    console.log('OTP sent to email');

    // You can also store the OTP in the database or in a session for later validation

    // Respond with the access token and other details
    res.json({
      success: true,
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({ message: 'Error sending OTP' });
  }
});

router.post('/verify-otp', async (req, res) => {
  const User = req.db.model('User', require('../models/User').schema)
  const { email, otp } = req.body;

  // Find the user by email
  const user = await User.findOne({ email, disabled: { $ne: true } });
  if (!user) return res.status(400).json({ message: 'User not found' });

  // Check if OTP exists and if it has expired
  if (!user.otp || !user.otpExpiration) {
    return res.status(400).json({ message: 'OTP not generated' });
  }

  if (moment().isAfter(user.otpExpiration)) {
    return res.status(400).json({ message: 'OTP has expired' });
  }

  // Verify OTP
  if (user.otp !== otp) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  const { accessToken, refreshToken } = generateTokens(user._id);

  user.refreshToken = refreshToken;
  await user.save()

  // Set refresh token as HttpOnly cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // OTP is valid and not expired
  res.json({
    success: true,
    accessToken,
    success: true,
    companyId: user.companyId,
    userId: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    access: user.access,
    site: user.site,
    siteArray: user.siteArray,
    message: 'OTP verified successfully'
  });
});

router.post('/refresh-token', async (req, res) => {
  const User = req.db.model('User', require('../models/User').schema)
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) throw new Error("No refresh token provided");

    const user = await User.findOne({ refreshToken });
    if (!user) throw new Error("Invalid refresh token");

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const { accessToken } = generateTokens(decoded.userId);

    res.json({ accessToken, access: user.access });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
})

// Signup Route
router.post('/signup', async (req, res) => {
  const User = req.db.model('User', require('../models/User').schema)
  const { firstName, lastName, email, password, role, access, site, siteArray, otp, otpVerified, otpExpiry, user_ID, companyId } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: role || 'user', // Default role is 'user' if none is provided
      access,
      site,
      siteArray,
      companyId,
      otp,
      otpVerified,
      otpExpiry,
      user_ID
    });

    await newUser.save();

    sendToClients(
      req.db, {
      type: 'userAdded', // Custom event to signal data update
    });

    // Generate JWT token for the new user
    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role }, // Include role in token
      'secret',
      { expiresIn: '1d' }
    );
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: 'None', secure: false, maxAge: 24 * 60 * 60 * 1000 });
    res.status(201).json({ message: 'User created successfully', token, role: newUser.role });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const User = req.db.model('User', require('../models/User').schema)
  try {
    await User.findByIdAndDelete(req.params.id)
    res.status(200).json({ message: 'user deleted' })
  }
  catch (error) {
    res.status(500).json({ message: 'unable to delete user' })
  }
})

router.delete('/deleteByUserID/:user_ID', async (req, res) => {
  const User = req.db.model('User', require('../models/User').schema)
  try {
    await User.deleteOne({ user_ID: req.params.user_ID });
    res.status(200).json({ message: 'user deleted' });
  }
  catch (error) {
    res.status(500).json({ message: 'unable to delete user' })
  }
})

router.put('/by-userid', async (req, res) => {
  const User = req.db.model('User', require('../models/User').schema)
  const { user_ID, update } = req.body;
  try {
    const updated = await User.findOneAndUpdate({ user_ID }, update, { new: true });
    res.status(200).json(updated);
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  const User = req.db.model('User', require('../models/User').schema)
  const { firstName, lastName, email, role, access, site, siteArray, delReqStatus } = req.body
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, {
      firstName, lastName, email, role, access, site, siteArray, delReqStatus
    })

    sendToClients(
      req.db, {
      type: 'osmDelReqUpdated', // Custom event to signal data update
    });

    res.status(200).json(updatedUser)
  }
  catch (error) {
    res.status(500).json('error updated')
  }
})

router.post('/updatepassword', async (req, res) => {
  const User = req.db.model('User', require('../models/User').schema)

  const { email, oldPassword, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });

    // Compare password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'wrong password entered' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const updatedUser = await User.updateOne({ email }, {
      $set: {
        password: hashedPassword
      }
    }
    )
    res.status(200).json({ message: 'password updated' })

  }
  catch (error) {
    res.status(500).json({ message: 'error changing password' })
  }
})

module.exports = router;
