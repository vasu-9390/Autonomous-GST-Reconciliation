import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User, UserRole } from '../../models/User';
import { Organization } from '../../models/Organization';
import { config } from '../../config';
import { GSTINUtil } from '../../utils/gstin';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name is required'),
  role: z.enum(['SUPER_ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT', 'AUDITOR']).optional(),
  organizationName: z.string().min(2, 'Organization name is required'),
  organizationGstin: z.string().min(15, 'Valid 15-character GSTIN is required'),
  state: z.string().min(2, 'State is required'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    const validated = registerSchema.parse(req.body);

    // Validate GSTIN
    const gstinResult = GSTINUtil.validate(validated.organizationGstin);
    if (!gstinResult.isValid) {
      res.status(400).json({ success: false, message: `Invalid GSTIN: ${gstinResult.error}` });
      return;
    }

    const existingUser = await User.findOne({ email: validated.email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({ success: false, message: 'User with this email already exists' });
      return;
    }

    // Find or create organization
    let org = await Organization.findOne({ gstin: gstinResult.normalizedGstin });
    if (!org) {
      org = await Organization.create({
        name: validated.organizationName,
        gstin: gstinResult.normalizedGstin,
        pan: gstinResult.pan,
        state: validated.state,
      });
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);
    const userRole: UserRole = validated.role || 'FINANCE_MANAGER';

    const newUser = await User.create({
      email: validated.email.toLowerCase(),
      passwordHash,
      name: validated.name,
      role: userRole,
      organizationId: org._id,
    });

    const token = jwt.sign(
      { id: newUser._id.toString(), email: newUser.email, role: newUser.role, organizationId: org._id.toString() },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        organizationId: org._id,
        organizationName: org.name,
        organizationGstin: org.gstin,
      },
    });
  }

  static async login(req: Request, res: Response): Promise<void> {
    const validated = loginSchema.parse(req.body);

    const user = await User.findOne({ email: validated.email.toLowerCase() }).populate('organizationId');
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const isMatch = await user.comparePassword(validated.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const org = user.organizationId as any;

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role, organizationId: org._id.toString() },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: org._id,
        organizationName: org?.name || 'Enterprise Client',
        organizationGstin: org?.gstin || '',
      },
    });
  }

  static async getMe(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const user = await User.findById(req.user.id).select('-passwordHash').populate('organizationId');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const org = user.organizationId as any;

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: org._id,
        organizationName: org?.name || '',
        organizationGstin: org?.gstin || '',
        organizationSettings: org?.settings,
      },
    });
  }
}
