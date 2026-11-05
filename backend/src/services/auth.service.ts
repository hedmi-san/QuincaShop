import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../db/index.js';
import { generateToken } from '../middleware/auth.middleware.js';
import { UserContext, RoleName, ClientStatus } from '../types/index.js';

export class AuthError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode = 400, code = 'AUTH_ERROR', details?: any) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export async function registerClient(data: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  companyName: string;
  contactPerson?: string;
  address?: string;
  wilaya?: string;
  rc?: string;
  nif?: string;
  art?: string;
  nis?: string;
  activite?: string;
}) {
  return withTransaction(async (client) => {
    // 1. Check if user already exists
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (existing.rows.length > 0) {
      throw new AuthError('An account with this email address already exists', 409, 'EMAIL_ALREADY_EXISTS');
    }

    // 2. Fetch role for CLIENT
    const roleRes = await client.query("SELECT id FROM roles WHERE name = 'CLIENT'");
    if (roleRes.rows.length === 0) {
      throw new AuthError('Role CLIENT not configured in database', 500, 'INTERNAL_SERVER_ERROR');
    }
    const roleId = roleRes.rows[0].id;

    // 3. Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // 4. Create user
    const userRes = await client.query(
      `INSERT INTO users (
        email, password_hash, full_name, phone, role_id, email_verified, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, full_name, phone, role_id, email_verified, created_at`,
      [data.email, passwordHash, data.fullName, data.phone, roleId, false, true]
    );
    const newUser = userRes.rows[0];

    // 5. Create client record linked to user
    const clientRes = await client.query(
      `INSERT INTO clients (
        user_id, name, contact_person, phone, email, address, wilaya,
        rc, nif, art, nis, activite, status, credit_limit
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'PENDING', 0)
      RETURNING id, name, status, credit_limit, created_at`,
      [
        newUser.id,
        data.companyName,
        data.contactPerson || data.fullName,
        data.phone,
        data.email,
        data.address || null,
        data.wilaya || null,
        data.rc || null,
        data.nif || null,
        data.art || null,
        data.nis || null,
        data.activite || null,
      ]
    );
    const newClient = clientRes.rows[0];

    // 6. Generate verification token
    const tokenRaw = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex');
    await client.query(
      `INSERT INTO email_tokens (user_id, purpose, token_hash, expires_at)
       VALUES ($1, 'VERIFY_EMAIL', $2, NOW() + INTERVAL '48 HOURS')`,
      [newUser.id, tokenHash]
    );

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        role: 'CLIENT' as RoleName,
      },
      client: {
        id: newClient.id,
        companyName: newClient.name,
        status: newClient.status as ClientStatus,
      },
      verificationToken: tokenRaw,
    };
  });
}

export async function login(credentials: { email: string; password: string }) {
  const res = await query(
    `SELECT u.id, u.email, u.password_hash, u.full_name, u.phone,
            u.email_verified, u.must_change_password, u.active,
            u.failed_logins, u.locked_until,
            r.name AS role_name,
            c.id AS client_id, c.code AS client_code, c.name AS client_name,
            c.status AS client_status, c.credit_limit, c.current_balance
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN clients c ON c.user_id = u.id
     WHERE u.email = $1`,
    [credentials.email]
  );

  if (res.rows.length === 0) {
    throw new AuthError('Incorrect email or password', 401, 'AUTH_INVALID_CREDENTIALS');
  }

  const user = res.rows[0];

  if (!user.active) {
    throw new AuthError('Account is disabled. Please contact administrator.', 403, 'ACCOUNT_DISABLED');
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new AuthError('Account is temporarily locked due to failed attempts. Try again later.', 403, 'ACCOUNT_LOCKED');
  }

  const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);
  if (!isPasswordValid) {
    // Increment failed logins
    const newFailedCount = (user.failed_logins || 0) + 1;
    let lockClause = '';
    if (newFailedCount >= 5) {
      lockClause = ", locked_until = NOW() + INTERVAL '15 minutes'";
    }
    await query(`UPDATE users SET failed_logins = $1 ${lockClause} WHERE id = $2`, [newFailedCount, user.id]);

    throw new AuthError('Incorrect email or password', 401, 'AUTH_INVALID_CREDENTIALS');
  }

  // Reset failed logins & update last login
  await query('UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1', [
    user.id,
  ]);

  const userContext: UserContext = {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role_name as RoleName,
    clientId: user.client_id || null,
    clientStatus: user.client_status || null,
  };

  const token = generateToken(userContext);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role_name,
      emailVerified: user.email_verified,
      mustChangePassword: user.must_change_password,
    },
    client: user.client_id
      ? {
          id: user.client_id,
          code: user.client_code,
          name: user.client_name,
          status: user.client_status,
          creditLimit: Number(user.credit_limit || 0),
          currentBalance: Number(user.current_balance || 0),
        }
      : null,
  };
}

export async function getMe(userId: number) {
  const res = await query(
    `SELECT u.id, u.email, u.full_name, u.phone, u.email_verified,
            u.must_change_password, u.active, u.created_at,
            r.name AS role_name,
            c.id AS client_id, c.code AS client_code, c.name AS client_name,
            c.status AS client_status, c.credit_limit, c.current_balance
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN clients c ON c.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );

  if (res.rows.length === 0) {
    throw new AuthError('User not found', 404, 'ENTITY_NOT_FOUND');
  }

  const u = res.rows[0];
  return {
    user: {
      id: u.id,
      email: u.email,
      fullName: u.full_name,
      phone: u.phone,
      role: u.role_name,
      emailVerified: u.email_verified,
      mustChangePassword: u.must_change_password,
      createdAt: u.created_at,
    },
    client: u.client_id
      ? {
          id: u.client_id,
          code: u.client_code,
          name: u.client_name,
          status: u.client_status,
          creditLimit: Number(u.credit_limit || 0),
          currentBalance: Number(u.current_balance || 0),
        }
      : null,
  };
}

export async function verifyEmail(token: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  return withTransaction(async (client) => {
    const res = await client.query(
      `SELECT id, user_id FROM email_tokens
       WHERE token_hash = $1
         AND purpose = 'VERIFY_EMAIL'
         AND used_at IS NULL
         AND expires_at > NOW()`,
      [tokenHash]
    );

    if (res.rows.length === 0) {
      throw new AuthError('Invalid or expired verification token', 400, 'INVALID_TOKEN');
    }

    const emailToken = res.rows[0];

    await client.query('UPDATE email_tokens SET used_at = NOW() WHERE id = $1', [emailToken.id]);
    await client.query('UPDATE users SET email_verified = true WHERE id = $1', [emailToken.user_id]);

    return { verified: true };
  });
}

export async function forgotPassword(email: string) {
  const userRes = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (userRes.rows.length === 0) {
    // Don't reveal user existence
    return { sent: true };
  }

  const userId = userRes.rows[0].id;
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  await query(
    `INSERT INTO email_tokens (user_id, purpose, token_hash, expires_at)
     VALUES ($1, 'RESET_PASSWORD', $2, NOW() + INTERVAL '2 HOURS')`,
    [userId, tokenHash]
  );

  return {
    sent: true,
    resetToken: rawToken, // Provided in response for easy dev/testing
  };
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  return withTransaction(async (client) => {
    const res = await client.query(
      `SELECT id, user_id FROM email_tokens
       WHERE token_hash = $1
         AND purpose = 'RESET_PASSWORD'
         AND used_at IS NULL
         AND expires_at > NOW()`,
      [tokenHash]
    );

    if (res.rows.length === 0) {
      throw new AuthError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
    }

    const emailToken = res.rows[0];
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await client.query(
      'UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2',
      [passwordHash, emailToken.user_id]
    );
    await client.query('UPDATE email_tokens SET used_at = NOW() WHERE id = $1', [emailToken.id]);

    return { reset: true };
  });
}

