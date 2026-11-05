import { z } from 'zod';

const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordRule,
  fullName: z.string().min(2, 'Full name is required (min 2 characters)'),
  phone: z.string().min(5, 'Valid phone number is required'),
  companyName: z.string().min(2, 'Company name is required'),
  contactPerson: z.string().optional(),
  address: z.string().optional(),
  wilaya: z.string().optional(),
  rc: z.string().optional(),
  nif: z.string().optional(),
  art: z.string().optional(),
  nis: z.string().optional(),
  activite: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordRule,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordRule,
});

