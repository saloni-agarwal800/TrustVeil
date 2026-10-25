import type { Finding } from '@trustveil/shared';

export interface DeepCheckMessage {
  type: 'DEEP_CHECK';
  url: string;
}

export type DeepCheckReply =
  | { ok: true; findings: Finding[]; mock?: boolean }
  | { ok: false; error: string };
