"use client";

import React, { useEffect } from "react";

// React compatibility helper for Ant Design v5
// Loaded at app root; avoids console overrides on React 19 to prevent errors
export default function AntdCompatibility() {
	useEffect(() => {
		if (typeof window === "undefined") return;

		const isProduction = process.env.NODE_ENV === "production";

		// Apply console filtering in development for noisy but known-safe warnings
		if (!isProduction) {
			const originalWarn = console.warn;
			const originalError = console.error;

			console.warn = (...args: unknown[]) => {
				try {
					const firstArg = args[0];
					const text = typeof firstArg === "string" ? firstArg : "";
					if (text.includes("[antd: compatible]")) return;
					if (text.includes("antd v5 support React is 16 ~ 18")) return;
					if (text.includes("findDOMNode")) return;
				} catch {}
				try {
					// Use Reflect.apply for robustness across environments
					Reflect.apply(originalWarn as unknown as (...a: unknown[]) => void, console, args);
				} catch {}
			};

			console.error = (...args: unknown[]) => {
				try {
					const firstArg = args[0];
					const text = typeof firstArg === "string" ? firstArg : "";
					if (text.includes("`children` is deprecated")) return;
					if (text.includes("`Tabs.TabPane` is deprecated")) return;
					if (text.includes("Warning: ReactDOM.render is no longer supported")) return;
					// Suppress Antd React 19 compatibility noise when routed via console.error
					if (text.includes("[antd: compatible]")) return;
					if (text.includes("antd v5 support React is 16 ~ 18")) return;
				} catch {}
				try {
					Reflect.apply(originalError as unknown as (...a: unknown[]) => void, console, args);
				} catch {}
			};

			// Cleanup on unmount
			return () => {
				console.warn = originalWarn;
				console.error = originalError;
			};
		}

		// Ensure proper hydration: trigger layout after load
		const handleHydration = () => {
			if (document.readyState === "complete") {
				window.dispatchEvent(new Event("resize"));
			}
		};

		if (document.readyState === "complete") {
			handleHydration();
		} else {
			window.addEventListener("load", handleHydration);
		}

		return () => {
			window.removeEventListener("load", handleHydration);
		};
	}, []);

	return null; // This component doesn't render anything
}
