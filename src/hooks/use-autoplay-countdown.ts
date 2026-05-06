"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export function useAutoplayCountdown({
	onNavigate,
}: {
	onNavigate: () => void;
}) {
	const [showCountdown, setShowCountdown] = useState(false);
	const [countdownValue, setCountdownValue] = useState(10);
	const countdownCancelledRef = useRef(false);
	const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const startCountdown = useCallback(() => {
		if (countdownCancelledRef.current) return;
		setShowCountdown(true);
		setCountdownValue(10);

		if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
		let remaining = 10;
		countdownTimerRef.current = setInterval(() => {
			remaining -= 1;
			setCountdownValue(remaining);
			if (remaining <= 0) {
				if (countdownTimerRef.current) {
					clearInterval(countdownTimerRef.current);
				}
				onNavigate();
			}
		}, 1000);
	}, [onNavigate]);

	const cancelCountdown = useCallback(() => {
		countdownCancelledRef.current = true;
		setShowCountdown(false);
		if (countdownTimerRef.current) {
			clearInterval(countdownTimerRef.current);
			countdownTimerRef.current = null;
		}
	}, []);

	useEffect(() => {
		return () => {
			if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
		};
	}, []);

	return {
		showCountdown,
		countdownValue,
		startCountdown,
		cancelCountdown,
	};
}
