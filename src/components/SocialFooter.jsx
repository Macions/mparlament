import { FaFacebookF, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";
import styles from "./Footer.module.css";

const socialLinks = [
	{ label: "Instagram", href: "https://www.instagram.com/parlamentmlodychrp/", icon: FaInstagram, showLabel: true },
	{ label: "Facebook", href: "https://www.facebook.com/parlamentmlodychrp/", icon: FaFacebookF, showLabel: true },
	{ label: "TikTok", href: "https://www.tiktok.com/@parlamentmlodychrp", icon: FaTiktok, showLabel: true },
	{ label: "YouTube", href: "https://www.youtube.com/@ParlamentM%C5%82odychRP", icon: FaYoutube, showLabel: true },
];

export default function SocialFooter() {
	return (
		<footer className={styles["social-footer"]}>
			<h2 className={styles["social-footer__title"]}>NASZE SOCIAL MEDIA</h2>
			<div className={styles["social-footer__icons"]}>
				{socialLinks.map(({ label, href, icon: Icon, showLabel }) => (
					<a
						key={label}
						href={href}
						className={styles["social-footer__link"]}
						target="_blank"
						rel="noopener noreferrer"
						aria-label={label}
					>
						<Icon className={styles["social-footer__icon"]} />
						{showLabel && (
							<span className={styles["social-footer__label"]}>{label}</span>
						)}
					</a>
				))}
			</div>
		</footer>
	);
}