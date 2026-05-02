import { randomBytes } from "node:crypto";

export function generateCertCode(): string {
  const year = new Date().getFullYear();
  const random = randomBytes(4).toString("hex").toUpperCase();
  return `CERT-${year}-${random}`;
}
