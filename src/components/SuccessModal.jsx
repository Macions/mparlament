import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import "./SuccessModal.css";

export default function SuccessModal({
	title = "Złożono uchwałę",
	description = "Uchwała została pomyślnie dodana",
	redirectTo = "/",
	seconds = 3,
	onClose,
}) {
	const navigate = useNavigate();
	const [count, setCount] = useState(seconds);
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		document.body.classList.add("modal-open");
		return () => document.body.classList.remove("modal-open");
	}, []);

	useEffect(() => {
		if (!visible) return;

		const interval = setInterval(() => {
			setCount((prev) => {
				if (prev <= 1) {
					clearInterval(interval);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(interval);
	}, [visible]);

	useEffect(() => {
		if (count === 0) {
			setVisible(false);
			setTimeout(() => {
				if (onClose) onClose();
				navigate(redirectTo);
			}, 600);
		}
	}, [count, navigate, redirectTo, onClose]);

	if (!visible) return null;

	return createPortal(
		<div className="success-overlay">
			<div className="success-modal">
				<div className="check-wrapper">
					<svg className="checkmark" viewBox="0 0 52 52">
						<circle
							className="checkmark-circle"
							cx="26"
							cy="26"
							r="25"
							fill="none"
						/>
						<path
							className="checkmark-check"
							fill="none"
							d="M14 27l7 7 17-17"
						/>
					</svg>
				</div>
				<h2>{title}</h2>
				<p>{description}</p>
				<div className="countdown">
					Przekierowanie za <span>{count}</span>s
				</div>
				<button className="redirect-btn" onClick={() => navigate(redirectTo)}>
					Przejdź teraz
				</button>
			</div>
		</div>,
		document.body,
	);
}
