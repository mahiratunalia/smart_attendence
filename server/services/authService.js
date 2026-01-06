import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

class AuthService {
  async registerUser(userData) {
    const { name, email, password, role, studentId, departmentId } = userData;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      studentId,
      departmentId
    });

    // Generate token
    const token = this.generateToken(user._id);

    return {
      success: true,
      data: { token, user: this.sanitizeUser(user) }
    };
  }

  async loginUser(email, password) {
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken(user._id);

    return {
      success: true,
      data: { token, user: this.sanitizeUser(user) }
    };
  }

  async getCurrentUser(userId) {
    const user = await User.findById(userId).populate('departmentId');
    if (!user) {
      throw new Error('User not found');
    }
    return this.sanitizeUser(user);
  }

  generateToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });
  }

  sanitizeUser(user) {
    const userObj = user.toObject();
    delete userObj.password;
    return userObj;
  }
}

export default new AuthService();
