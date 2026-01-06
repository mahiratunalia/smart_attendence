import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login attempt for:', email);
    console.log('📦 Request body:', { email, passwordLength: password?.length });

    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email and password' 
      });
    }

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');
    console.log('👤 User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    console.log('🔑 User has password:', !!user.password);
    
    if (!user.password) {
      console.log('❌ No password hash stored for user');
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Compare password
    console.log('🔍 Comparing passwords...');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('✅ Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '7d' }
    );

    const userResponse = {
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      studentId: user.studentId,
      departmentId: user.departmentId
    };

    console.log('✅ Login successful for:', email, '- Role:', user.role);

    res.json({ 
      success: true, 
      data: { 
        token, 
        user: userResponse 
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login: ' + error.message 
    });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, studentId, departmentId } = req.body;

    console.log('📝 New Registration Request:', email);

    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide name, email, and password' 
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ User already exists:', email);
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      // Let the User model pre-save hook hash the password
      password,
      role: role || 'student',
      studentId: role === 'student' ? studentId : undefined,
      departmentId: (role === 'student' || role === 'teacher') ? departmentId : undefined,
    });

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '7d' }
    );

    const userResponse = {
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      studentId: user.studentId,
      departmentId: user.departmentId
    };

    console.log('✅ Registered successfully:', email);

    res.status(201).json({ 
      success: true, 
      data: { token, user: userResponse },
      message: 'Registration successful'
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration: ' + error.message 
    });
  }
});

// Get current user
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({ 
      success: true, 
      data: {
        id: user._id.toString(),
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        departmentId: user.departmentId
      }
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user' 
    });
  }
});

export default router;

