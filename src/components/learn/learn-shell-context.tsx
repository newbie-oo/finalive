"use client";

import {
	createContext,
	useContext,
	useState,
	useCallback,
	type ReactNode,
} from "react";

interface LearnShellContextValue {
	sidebarOpen: boolean;
	toggleSidebar: () => void;
	mobileDrawerOpen: boolean;
	toggleMobileDrawer: () => void;
}

const LearnShellContext = createContext<LearnShellContextValue | null>(null);

export function LearnShellProvider({ children }: { children: ReactNode }) {
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

	const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
	const toggleMobileDrawer = useCallback(
		() => setMobileDrawerOpen((v) => !v),
		[],
	);

	return (
		<LearnShellContext.Provider
			value={{
				sidebarOpen,
				toggleSidebar,
				mobileDrawerOpen,
				toggleMobileDrawer,
			}}
		>
			{children}
		</LearnShellContext.Provider>
	);
}

export function useLearnShell(): LearnShellContextValue {
	const ctx = useContext(LearnShellContext);
	if (!ctx)
		throw new Error("useLearnShell must be used within LearnShellProvider");
	return ctx;
}
