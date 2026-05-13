'use server';

import { pool } from '@/lib/db';

export type Notification = {
  id: string;
  recipient_user_id: string;
  category: string;
  subject: string;
  body: string;
  from_name: string;
  from_email: string;
  primary_action: { label: string; href: string } | null;
  created_at: string;
  read_at: string | null;
};

/**
 * Returns notifications for the carrier user associated with the given USDOT.
 * Joins lth.users → lth.organization_memberships → lth.organizations on usdot.
 */
export async function getNotificationsForDot(dot: string): Promise<Notification[]> {
  const usdot = parseInt(dot, 10);
  if (isNaN(usdot)) return [];

  const { rows } = await pool().query<Notification>(
    `SELECT n.id, n.recipient_user_id, n.category, n.subject, n.body,
            n.from_name, n.from_email, n.primary_action, n.created_at,
            CASE WHEN n.is_read THEN n.created_at ELSE NULL END AS read_at
       FROM lth.notifications n
       JOIN lth.users u ON u.id = n.recipient_user_id
       JOIN lth.organization_memberships m ON m.user_id = u.id
       JOIN lth.organizations o ON o.id = m.organization_id
      WHERE o.usdot = $1
        AND m.status = 'active'
      ORDER BY n.created_at DESC
      LIMIT 200`,
    [usdot],
  );
  return rows;
}
