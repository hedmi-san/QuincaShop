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

async function attachFreshClientStatus(user: UserContext): Promise<UserContext> {
  if (user.role === 'CLIENT') {
    const clientRes = await query(
      'SELECT id, status FROM clients WHERE user_id = $1',
      [user.id]
    );
    if (clientRes.rows.length > 0) {
      user.clientId = clientRes.rows[0].id;
      user.clientStatus = clientRes.rows[0].status;
    }
  }
  return user;
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authentication required: No token provided', 401);
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as UserContext;
    req.user = await attachFreshClientStatus(decoded);
    next();
  } catch (err) {
    sendError(res, 'Invalid or expired token', 401);
    return;
  }
}

/**
 * Optional authentication: attaches user if token is present and valid,
 * and refreshes live client status from DB so newly approved clients immediately see prices.
 */
export async function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as UserContext;
      req.user = await attachFreshClientStatus(decoded);
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
 * upon approval, suspension, or rejection.
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
      res.status(403).json({
        success: false,
        message: `Account not active. Current status: ${client.status}`,
        error: {
          code: client.status === 'PENDING' ? 'ACCOUNT_PENDING_APPROVAL' : 'ACCOUNT_SUSPENDED',
          message: `Account not active. Current status: ${client.status}`,
        },
        data: { status: client.status },
        timestamp: new Date().toISOString(),
      });
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
