import { FaFacebookF, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";

const socialLinks = [
	{
		label: "Instagram",
		href: "https://www.instagram.com/parlamentmlodychrp/",
		icon: FaInstagram,
		showLabel: true,
	},
	{
		label: "Facebook",
		href: "https://www.facebook.com/parlamentmlodychrp/",
		icon: FaFacebookF,
		showLabel: true,
	},
	{
		label: "TikTok",
		href: "https://www.tiktok.com/@parlamentmlodychrp",
		icon: FaTiktok,
		showLabel: true,
	},
	{
		label: "YouTube",
		href: "https://www.youtube.com/@ParlamentM%C5%82odychRP",
		icon: FaYoutube,
		showLabel: true,
	},
];

export default function SocialFooter() {
	return (
		<footer className="social-footer">
			<h2 className="social-footer__title">NASZE SOCIAL MEDIA</h2>
			<div className="social-footer__icons">
				{socialLinks.map(({ label, href, icon: Icon, showLabel }) => (
					<a
						key={label}
						href={href}
						className="social-footer__link"
						target="_blank"
						rel="noopener noreferrer"
						aria-label={label}
					>
						<Icon className="social-footer__icon" />
						{showLabel && <span className="social-footer__label">{label}</span>}
					</a>
				))}
			</div>
		</footer>
	);
}
