
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { User, UserRole } from '../../models/User';
import { Organization } from '../../models/Organization';
import { config } from '../../config';
import { GSTINUtil } from '../../utils/gstin';

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().trim().min(2, 'Name is required'),
  role: z
    .enum(['SUPER_ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT', 'AUDITOR'])
    .optional(),
  organizationName: z.string().trim().min(2, 'Organization name is required'),
  organizationGstin: z
    .string()
    .trim()
    .min(15, 'Valid 15-character GSTIN is required')
    .max(15, 'GSTIN must contain exactly 15 characters'),
  state: z.string().trim().min(2, 'State is required'),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  // ==========================================
  // REGISTER
  // ==========================================
  static async register(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid registration details',
          errors: parsed.error.flatten(),
        });
        return;
      }

      const validated = parsed.data;
      const email = validated.email.toLowerCase();

      // Validate GSTIN.
      const gstinResult = GSTINUtil.validate(
        validated.organizationGstin
      );

      if (!gstinResult.isValid) {
        res.status(400).json({
          success: false,
          message: `Invalid GSTIN: ${gstinResult.error}`,
        });
        return;
      }

      // Check for an existing user.
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'User with this email already exists',
        });
        return;
      }

      // Find or create the organization.
      let org = await Organization.findOne({
        gstin: gstinResult.normalizedGstin,
      });

      if (!org) {
        org = await Organization.create({
          name: validated.organizationName,
          gstin: gstinResult.normalizedGstin,
          pan: gstinResult.pan,
          state: validated.state,
        });
      }

      // Hash the password before storing it.
      const passwordHash = await bcrypt.hash(
        validated.password,
        10
      );

      const userRole: UserRole =
        validated.role || 'FINANCE_MANAGER';

      const newUser = await User.create({
        email,
        passwordHash,
        name: validated.name,
        role: userRole,
        organizationId: org._id,
        isActive: true,
      });

      const token = jwt.sign(
        {
          id: newUser._id.toString(),
          email: newUser.email,
          role: newUser.role,
          organizationId: org._id.toString(),
        },
        config.jwtSecret,
        {
          expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
        }
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
    } catch (error) {
      console.error('[REGISTER] Failed:', error);

      res.status(500).json({
        success: false,
        message: 'Registration failed due to a server error',
      });
    }
  }

  // ==========================================
  // LOGIN
  // ==========================================
  static async login(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: 'Please provide a valid email and password',
          errors: parsed.error.flatten(),
        });
        return;
      }

      const email = parsed.data.email.toLowerCase();
      const password = parsed.data.password;

      // Temporary diagnostics. Never log passwords or tokens.
      console.log('[LOGIN] Submitted email:', email);
      console.log('[LOGIN] Connected database:', User.db.name);
      console.log('[LOGIN] MongoDB ready state:', User.db.readyState);

      const user = await User.findOne({ email }).populate(
        'organizationId'
      );

      console.log('[LOGIN] User found:', Boolean(user));

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      console.log(
        '[LOGIN] Password hash exists:',
        Boolean(user.passwordHash)
      );

      const isMatch = await user.comparePassword(password);

      console.log('[LOGIN] Password matches:', isMatch);

      if (!isMatch) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({
          success: false,
          message: 'Your account is inactive. Contact your administrator.',
        });
        return;
      }

      const org = user.organizationId as any;

      if (!org || !org._id) {
        res.status(500).json({
          success: false,
          message: 'User organization is missing or invalid',
        });
        return;
      }

      const token = jwt.sign(
        {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          organizationId: org._id.toString(),
        },
        config.jwtSecret,
        {
          expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
        }
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
          organizationName: org.name || 'Enterprise Client',
          organizationGstin: org.gstin || '',
        },
      });
    } catch (error) {
      console.error('[LOGIN] Unexpected error:', error);

      res.status(500).json({
        success: false,
        message: 'Login failed due to a server error',
      });
    }
  }

  // ==========================================
  // GET CURRENT USER
  // ==========================================
  static async getMe(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      const user = await User.findById(req.user.id)
        .select('-passwordHash')
        .populate('organizationId');

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
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
          organizationId: org?._id || null,
          organizationName: org?.name || '',
          organizationGstin: org?.gstin || '',
          organizationSettings: org?.settings,
        },
      });
    } catch (error) {
      console.error('[GET ME] Failed:', error);

      res.status(500).json({
        success: false,
        message: 'Unable to retrieve the current user',
      });
    }
  }
}
