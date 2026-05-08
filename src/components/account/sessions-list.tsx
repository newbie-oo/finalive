"use client";

import { useEffect, useState } from "react";
import {
	DeviceMobile,
	DesktopTower,
	Laptop,
} from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export type DeviceKind = "mobile" | "laptop" | "desktop";

export interface UserAgentInfo {
	browser: string;
	os: string;
	deviceKind: DeviceKind;
}

interface SessionsListProps {
	/** Optional override (server-rendered or test). Falls back to navigator.userAgent. */
	userAgent?: string;
}

/**
 * Stub list of active sessions. Better Auth does not expose a "list other
 * sessions" endpoint to the client today, so we render the current device
 * only — sourced from the user agent — alongside the existing
 * "ออกจากระบบทุกอุปกรณ์" action that handles the multi-device case.
 */
export function SessionsList({ userAgent }: SessionsListProps) {
	const [info, setInfo] = useState<UserAgentInfo | null>(
		userAgent ? describeUserAgent(userAgent) : null,
	);

	useEffect(() => {
		if (!info && typeof navigator !== "undefined") {
			setInfo(describeUserAgent(navigator.userAgent));
		}
	}, [info]);

	if (!info) {
		return (
			<div className="rounded-card border border-border bg-card p-4 text-uism text-muted-foreground">
				กำลังโหลดข้อมูลอุปกรณ์...
			</div>
		);
	}

	const Icon =
		info.deviceKind === "mobile"
			? DeviceMobile
			: info.deviceKind === "desktop"
				? DesktopTower
				: Laptop;

	return (
		<div className="space-y-1">
			<div className="flex items-center gap-3 rounded-card border border-border bg-card p-3.5">
				<span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-radius-button bg-muted text-foreground">
					<Icon size={20} weight="bold" />
				</span>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<span className="text-ui font-semibold text-foreground">
							{info.browser} บน {info.os}
						</span>
						<Badge variant="success">อุปกรณ์นี้</Badge>
					</div>
					<div className="text-caption text-muted-foreground">
						ใช้งานอยู่ตอนนี้
					</div>
				</div>
			</div>
			<Separator className="my-3" />
		</div>
	);
}

/**
 * Pure user-agent → label mapping. Lives next to the component so tests can
 * exercise it directly without rendering. Patterns are intentionally narrow
 * — the alternative (full UA parsing library) is far too heavy for a stub.
 */
export function describeUserAgent(ua: string): UserAgentInfo {
	const browser = ua.includes("Edg")
		? "Edge"
		: ua.includes("Chrome") && !ua.includes("Chromium")
			? "Chrome"
			: ua.includes("Firefox")
				? "Firefox"
				: ua.includes("Safari")
					? "Safari"
					: "เบราว์เซอร์ที่ไม่รู้จัก";

	const os = ua.includes("iPhone") || ua.includes("iPad")
		? "iOS"
		: ua.includes("Android")
			? "Android"
			: ua.includes("Mac OS X")
				? "macOS"
				: ua.includes("Windows")
					? "Windows"
					: ua.includes("Linux")
						? "Linux"
						: "ไม่ทราบระบบ";

	const deviceKind: DeviceKind = /iPhone|Android.+Mobile/.test(ua)
		? "mobile"
		: /Macintosh|Mac OS X/.test(ua)
			? "laptop"
			: "desktop";

	return { browser, os, deviceKind };
}
