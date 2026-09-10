import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, AlertTriangle, Info, X } from "lucide-react";
import "./Toast.css";

export default function Toast({ toast, onClose, duration = 4000 }) {
	useEffect(() => {
		if (!toast) return;
		const timer = setTimeout(() => onClose(), duration);
		return () => clearTimeout(timer);
	}, [toast, duration, onClose]);

	if (!toast) return null;

	// ✅ Ten sam portal root
	const modalRoot =
		(typeof document !== "undefined" &&
			document.getElementById("modal-root")) ||
		document.body;

	const renderIcon = () => {
		switch (toast.type) {
			case "success":
				return <CheckCircle size={20} color="#16a34a" />;
			case "error":
				return <AlertTriangle size={20} color="#dc2626" />;
			case "warning":
				return <AlertTriangle size={20} color="#f59e0b" />;
			default:
				return <Info size={20} color="#3b82f6" />;
		}
	};

	return createPortal(
		<div className={`toast toast--${toast.type || "info"}`}>
			<div className="toast__icon">{renderIcon()}</div>
			<div className="toast__content">
				{toast.title && <div className="toast__title">{toast.title}</div>}
				{toast.message && <div className="toast__message">{toast.message}</div>}
			</div>
			<button className="toast__close" onClick={onClose}>
				<X size={16} />
			</button>
		</div>,
		modalRoot,
	);
}
