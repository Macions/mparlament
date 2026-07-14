import { useNavigate } from "react-router-dom";

export default function BackButton({
    to = "/panel",
    label = "Panel"
}) {
    const navigate = useNavigate();

    return (
        <button
            className="back-to-home-btn"
            onClick={() => navigate(to)}
        >
            <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M15 18L9 12L15 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>

            {label}
        </button>
    );
}