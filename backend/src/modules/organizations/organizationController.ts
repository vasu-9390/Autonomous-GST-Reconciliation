import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Organization } from '../../models/Organization';
import { User, UserRole } from '../../models/User';
import { AuditLog } from '../../models/AuditLog';

const updateSettingsSchema = z.object({
  amountTolerance: z.number().min(0).max(100).optional(),
  taxTolerance: z.number().min(0).max(100).optional(),
  dateWindowDays: z.number().min(0).max(365).optional(),
  autoAssignAccountant: z.string().optional(),
});

const inviteMemberSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['SUPER_ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT', 'AUDITOR']),
  password: z.string().min(6),
});

export class OrganizationController {
  static async getOrganization(req: Request, res: Response): Promise<void> {
    const org = await Organization.findById(req.user!.organizationId);
    if (!org) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }

    res.status(200).json({ success: true, organization: org });
  }

  static async updateSettings(req: Request, res: Response): Promise<void> {
    const validated = updateSettingsSchema.parse(req.body);
    const org = await Organization.findById(req.user!.organizationId);
    if (!org) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }

    const previousSettings = { ...org.settings };
    org.settings = {
      ...org.settings,
      ...validated,
    };
    await org.save();

    await AuditLog.create({
      organizationId: org._id,
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'UPDATE_ORGANIZATION_SETTINGS',
      resourceType: 'Organization',
      resourceId: org._id.toString(),
      beforeState: previousSettings,
      afterState: org.settings,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(200).json({ success: true, message: 'Settings updated successfully', settings: org.settings });
  }

  static async listMembers(req: Request, res: Response): Promise<void> {
    const members = await User.find({ organizationId: req.user!.organizationId })
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, members });
  }

  static async createMember(req: Request, res: Response): Promise<void> {
    const validated = inviteMemberSchema.parse(req.body);

    const existing = await User.findOne({ email: validated.email.toLowerCase() });
    if (existing) {
      res.status(409).json({ success: false, message: 'User with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);
    const newMember = await User.create({
      name: validated.name,
      email: validated.email.toLowerCase(),
      passwordHash,
      role: validated.role as UserRole,
      organizationId: req.user!.organizationId,
    });

    await AuditLog.create({
      organizationId: req.user!.organizationId,
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'ADD_TEAM_MEMBER',
      resourceType: 'User',
      resourceId: newMember._id.toString(),
      afterState: { email: newMember.email, role: newMember.role },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      message: 'Team member added successfully',
      member: {
        id: newMember._id,
        name: newMember.name,
        email: newMember.email,
        role: newMember.role,
      },
    });
  }
}
