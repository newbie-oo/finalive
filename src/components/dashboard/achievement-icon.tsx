"use client";

import {
	Books,
	CheckCircle,
	Certificate,
	Flame,
	Trophy,
} from "@phosphor-icons/react";

export function AchievementIcon({ icon }: { icon: string }) {
	switch (icon) {
		case "trophy":
			return <Trophy size={22} weight="bold" />;
		case "flame":
			return <Flame size={22} weight="bold" />;
		case "books":
			return <Books size={22} weight="bold" />;
		case "check-circle":
			return <CheckCircle size={22} weight="bold" />;
		case "certificate":
			return <Certificate size={22} weight="bold" />;
		default:
			return <Trophy size={22} weight="bold" />;
	}
}
