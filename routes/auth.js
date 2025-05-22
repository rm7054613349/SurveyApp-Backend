const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

// Signup
router.post('/signup', async (req, res) => {
  const { email, password, role } = req.body;
  try {
    if (!email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (!['admin', 'employee'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    user = new User({ email, password, role });
    await user.save();
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.status(201).json({ token, id: user._id, role: user.role, email: user.email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// // Login
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  try {
    if (!email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const user = await User.findOne({ email });
    if (!user || user.role !== role) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({ token, id: user._id, role: user.role, email: user.email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});






// router.post('/login', async (req, res) => {
//   const { email, password, role } = req.body;
//   try {
//     if (!email || !password || !role) {
//       return res.status(400).json({ message: 'All fields are required' });
//     }
//     const user = await User.findOne({ email });
//     if (!user || user.role !== role) {
//       return res.status(400).json({ message: 'Invalid credentials' });
//     }
//     const isMatch = await user.matchPassword(password);
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Invalid credentials' });
//     }
//     const token = jwt.sign(
//       { id: user._id, role: user.role, email: user.email },
//       process.env.JWT_SECRET,
//       { expiresIn: '1d' }
//     );
//     res.json({ token, id: user._id, role: user.role, email: user.email });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// Get all users (Admin only)
router.get('/users', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});




// router.post('/change-password', authMiddleware, async (req, res) => {
//   const { currentPassword, newPassword } = req.body;
//   try {
//     if (!currentPassword || !newPassword) {
//       return res.status(400).json({ message: 'Current and new password are required' });
//     }

//     const user = await User.findById(req.user.id);
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const isMatch = await user.matchPassword(currentPassword);
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Current password is incorrect' });
//     }

//     if (newPassword.length < 6) {
//       return res.status(400).json({ message: 'New password must be at least 6 characters long' });
//     }

//     // Set the new password (middleware will hash it)
//     user.password = newPassword;
//     await user.save();

//     res.json({ message: 'Password changed successfully' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });


router.post('/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    // Set the new password (middleware will hash it)
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


//get 
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      id: user._id,
      email: user.email,
      role: user.role,
      badges: user.badges || [],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;