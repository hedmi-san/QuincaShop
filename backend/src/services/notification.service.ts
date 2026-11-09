import pg from 'pg';
import { query } from '../db/index.js';

export interface NotificationInput {
  userId?: number | null;
  roleTarget?: 'ADMIN' | 'ACCOUNTANT' | 'CLIENT' | null;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  emailRecipient?: string | null;
}

export async function createNotification(
  input: NotificationInput,
  txClient?: pg.PoolClient
) {
  if (!input.userId && !input.roleTarget) {
    return null;
  }

  const sql = `
    INSERT INTO notifications (user_id, role_target, type, title, body, link)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, user_id, role_target, type, title, body, link, is_read, created_at
  `;
  const params = [
    input.userId || null,
    input.roleTarget || null,
    input.type,
    input.title,
    input.body || null,
    input.link || null,
  ];

  const res = txClient
    ? await txClient.query(sql, params)
    : await query(sql, params);

  if (input.emailRecipient) {
    console.log(
      `📧 [Email Dispatched -> ${input.emailRecipient}] Subject: ${input.title} | Body: ${input.body || ''}`
    );
  }

  return res.rows[0];
}

export async function getUserNotifications(userId: number, role: string, limit = 30) {
  const res = await query(
    `SELECT id, user_id, role_target, type, title, body, link, is_read, read_at, created_at
     FROM notifications
     WHERE user_id = $1 OR (user_id IS NULL AND role_target = $2)
     ORDER BY created_at DESC
     LIMIT $3`,
    [userId, role, limit]
  );

  const unreadRes = await query(
    `SELECT COUNT(id)::int AS unread_count
     FROM notifications
     WHERE (user_id = $1 OR (user_id IS NULL AND role_target = $2))
       AND is_read = false`,
    [userId, role]
  );

  return {
    notifications: res.rows,
    unreadCount: unreadRes.rows[0]?.unread_count || 0,
  };
}

export async function markNotificationRead(notificationId: number, userId: number, role: string) {
  const res = await query(
    `UPDATE notifications
     SET is_read = true, read_at = NOW()
     WHERE id = $1 AND (user_id = $2 OR role_target = $3)
     RETURNING id, is_read, read_at`,
    [notificationId, userId, role]
  );
  return res.rows[0] || null;
}

export async function markAllNotificationsRead(userId: number, role: string) {
  await query(
    `UPDATE notifications
     SET is_read = true, read_at = NOW()
     WHERE (user_id = $1 OR (user_id IS NULL AND role_target = $2))
       AND is_read = false`,
    [userId, role]
  );
  return { markedAllRead: true };
}

