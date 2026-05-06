#!/usr/bin/env node
/**
 * Architecture lint — enforce layered boundary rules.
 *
 * Rules:
 * 1. Services must NOT import `db` from `@/db/client` (except factories/adapters).
 * 2. Actions must NOT import `db` from `@/db/client` (must use container/repos).
 * 3. Repos must NOT import from `@/server/services/` (except type imports).
 * 4. Repos must NOT import `coverImageUrl` from `@/lib/media-url` (presentation logic).
 *
 * Known exceptions are explicitly listed so new violations are caught.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function findFiles(dir, ext) {
	const results = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...findFiles(full, ext));
		} else if (entry.isFile() && entry.name.endsWith(ext)) {
			results.push(full);
		}
	}
	return results;
}

function relative(p) {
	return path.relative(ROOT, p);
}

const violations = [];

// ── Rule 1: Services must not import db (except factories/adapters) ──
const serviceDir = path.join(ROOT, "src/server/services");
const serviceFiles = findFiles(serviceDir, ".ts").filter(
	(f) =>
		!f.includes(".test.ts") &&
		!f.includes(".factory.ts") &&
		!f.includes("-factory") &&
		!f.includes("-adapter") &&
		!path.basename(f).startsWith("audit.ts"),
);

for (const file of serviceFiles) {
	const content = fs.readFileSync(file, "utf-8");
	if (
		content.includes('from "@/db/client"') ||
		content.includes("from '@/db/client'")
	) {
		violations.push({
			rule: "service-no-db",
			file: relative(file),
			message:
				"Service imports db directly; inject via deps or move to factory/adapter",
		});
	}
}

// ── Rule 2: Actions must not import db ──
const actionDir = path.join(ROOT, "src/server/actions");
const actionFiles = findFiles(actionDir, ".ts").filter(
	(f) => !f.includes(".test.ts"),
);

// Known exceptions that haven't been refactored yet
const actionDbExceptions = new Set([
	// None after our refactoring pass — keep empty to catch regressions
]);

for (const file of actionFiles) {
	const content = fs.readFileSync(file, "utf-8");
	const hasDb =
		content.includes('from "@/db/client"') ||
		content.includes("from '@/db/client'");
	if (hasDb && !actionDbExceptions.has(path.basename(file))) {
		violations.push({
			rule: "action-no-db",
			file: relative(file),
			message: "Action imports db directly; use container or repo",
		});
	}
}

// ── Rule 3: Repos must not import services ──
const repoDir = path.join(ROOT, "src/server/repos");
const repoFiles = findFiles(repoDir, ".ts").filter(
	(f) => !f.includes(".test.ts"),
);

const repoServiceExceptions = new Set([
	// student-dashboard.ts re-exports presenter types — allowed after refactor
]);

for (const file of repoFiles) {
	const content = fs.readFileSync(file, "utf-8");
	const hasService = /from\s+["']@\/server\/services\//.test(content);
	if (hasService && !repoServiceExceptions.has(path.basename(file))) {
		violations.push({
			rule: "repo-no-service",
			file: relative(file),
			message:
				"Repo imports from services layer; should only import from db/lib/other repos",
		});
	}
}

// ── Rule 4: Repos must not import coverImageUrl ──
for (const file of repoFiles) {
	const content = fs.readFileSync(file, "utf-8");
	if (
		content.includes('from "@/lib/media-url"') ||
		content.includes("from '@/lib/media-url'")
	) {
		violations.push({
			rule: "repo-no-presentation",
			file: relative(file),
			message:
				"Repo imports presentation utility (media-url); move to service or view layer",
		});
	}
}

// ── Report ──
if (violations.length === 0) {
	console.log("✅ Architecture lint passed — no violations.");
	process.exit(0);
}

const byRule = violations.reduce((acc, v) => {
	acc[v.rule] = (acc[v.rule] || []).concat(v);
	return acc;
}, {});

for (const [rule, items] of Object.entries(byRule)) {
	console.log(
		`\n❌ ${rule} (${items.length} violation${items.length > 1 ? "s" : ""})`,
	);
	for (const v of items) {
		console.log(`  ${v.file}`);
		console.log(`    → ${v.message}`);
	}
}

console.log(`\nTotal: ${violations.length} violation(s)`);
process.exit(1);
