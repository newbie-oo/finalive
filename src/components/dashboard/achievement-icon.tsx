"use client";

import {
	Books,
	CheckCircle,
	Certificate,
	Flame,
	Trophy,
} from "@phosphor-icons/react/dist/ssr";
import type { ReactElement } from "react";

const ICON_MAP: Record<string, ReactElement> = {
	trophy: <Trophy size={22} weight="bold" />,
	flame: <Flame size={22} weight="bold" />,
	books: <Books size={22} weight="bold" />,
	"check-circle": <CheckCircle size={22} weight="bold" />,
	certificate: <Certificate size={22} weight="bold" />,
};

export function AchievementIcon({ icon }: { icon: string }) {
	return ICON_MAP[icon] ?? ICON_MAP.trophy;
}
