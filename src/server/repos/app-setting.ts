import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { appSetting } from "@/db/schema/app-setting";

export interface BankDisplay {
  text: string;
}

export async function getBankDisplay(): Promise<BankDisplay | null> {
  const rows = await db
    .select({ valueJson: appSetting.valueJson })
    .from(appSetting)
    .where(eq(appSetting.key, "bank_account_display"))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  try {
    return row.valueJson as BankDisplay;
  } catch {
    return null;
  }
}
