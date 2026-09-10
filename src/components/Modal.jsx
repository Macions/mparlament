import React from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle, Info, ShieldAlert } from "lucide-react";
import "./Modal.css";

export default function Modal({
	isOpen,
	title,
	icon,
	variant = "info", // "info" | "warning" | "danger"
	children,
	confirmText = "Potwierdź",
	cancelText = "Anuluj",
	onConfirm,
	onCancel,
	hideCancel = false,
}) {
	if (!isOpen) return null;

	// ✅ Renderujemy do #modal-root, jeśli istnieje (poza drzewem aplikacji)
	const modalRoot =
		(typeof document !== "undefined" &&
			document.getElementById("modal-root")) ||
		document.body;

	const renderIcon = () => {
		if (icon) return icon;
		switch (variant) {
			case "danger":
				return <ShieldAlert size={28} color="#dc2626" />;
			case "warning":
				return <AlertTriangle size={28} color="#f59e0b" />;
			default:
				return <Info size={28} color="#3b82f6" />;
		}
	};

	return createPortal(
		<div className="modal-overlay" onClick={onCancel}>
			<div
				className={`modal modal--${variant}`}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="modal__header">
					<div className="modal__icon">{renderIcon()}</div>
					<h2 className="modal__title">{title}</h2>
					<button className="modal__close" onClick={onCancel}>
						<X size={18} />
					</button>
				</div>

				<div className="modal__body">{children}</div>

				<div className="modal__actions">
					{!hideCancel && (
						<button
							className="modal__btn modal__btn--cancel"
							onClick={onCancel}
						>
							{cancelText}
						</button>
					)}
					<button
						className={`modal__btn modal__btn--confirm modal__btn--${variant}`}
						onClick={onConfirm}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</div>,
		modalRoot,
	);
}
