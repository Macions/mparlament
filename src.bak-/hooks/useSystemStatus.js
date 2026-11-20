import { useEffect, useState } from "react";

// Hook intentionally disabled — maintenance is handled by nginx (maintenance.on).
// Restoring the polling below would cause AuthProvider remount on loading state
// change, which triggers a fetch loop in NotificationsContext.
const API_BASE = import.meta.env.VITE_API_URL ?? "/newapp/api";

export function useSystemStatus() {
	return { loading: false, maintenance: false, message: null, until: null };
}
