import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { appSetting } from "@/db/schema/app-setting";

export interface BankDisplay {
  text: string;
}

async function readSetting<T>(key: string): Promise<T | null> {
  const rows = await db
    .select({ valueJson: appSetting.valueJson })
    .from(appSetting)
    .where(eq(appSetting.key, key))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  try {
    return row.valueJson as T;
  } catch {
    return null;
  }
}

export function getBankDisplay(): Promise<BankDisplay | null> {
  return readSetting<BankDisplay>("bank_account_display");
}

export async function getPromptPayQrImageUrl(): Promise<string | null> {
  const v = await readSetting<{ url?: string }>("promptpay_qr_image_url");
  return typeof v?.url === "string" && v.url.length > 0 ? v.url : null;
}
