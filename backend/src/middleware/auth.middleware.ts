import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserContext, RoleName } from '../types/index.js';
import { sendError } from '../common/response.js';
import { query } from '../db/index.js';
import { config } from '../config/index.js';

export interface AuthRequest extends Request {
  user?: UserContext;
}

export function generateToken(user: UserContext): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      clientId: user.clientId,
      clientStatus: user.clientStatus,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as any }
  );
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authentication required: No token provided', 401);
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as UserContext;
    req.user = decoded;
    next();
  } catch (err) {
    sendError(res, 'Invalid or expired token', 401);
    return;
  }
}

/**
 * Optional authentication: attaches user if token is present and valid,
 * but allows unauthenticated requests to proceed.
 */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as UserContext;
      req.user = decoded;
    } catch {
      // Ignore invalid token on public routes
    }
  }
  next();
}

export function requireRole(...allowedRoles: RoleName[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      sendError(res, `Access denied: requires one of [${allowedRoles.join(', ')}]`, 403);
      return;
    }
    next();
  };
}

/**
 * Ensures the authenticated user is an ACTIVE client.
 * Re-reads client status directly from the database to ensure immediate enforcement
 * upon suspension or rejection.
 */
export async function requireActiveClient(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  // Admins and Accountants bypass client status check
  if (req.user.role === 'ADMIN' || req.user.role === 'ACCOUNTANT') {
    next();
    return;
  }

  try {
    const clientRes = await query(
      `SELECT c.id, c.status
       FROM clients c
       WHERE c.user_id = $1`,
      [req.user.id]
    );

    if (clientRes.rows.length === 0) {
      sendError(res, 'No client account linked to this user', 403);
      return;
    }

    const client = clientRes.rows[0];
    if (client.status !== 'ACTIVE') {
      sendError(
        res,
        `Account not active. Current status: ${client.status}`,
        403,
        { status: client.status }
      );
      return;
    }

    // Update context with verified DB values
    req.user.clientId = client.id;
    req.user.clientStatus = client.status;
    next();
  } catch (err) {
    console.error('Error validating active client status:', err);
    sendError(res, 'Failed to verify client status', 500);
  }
}

