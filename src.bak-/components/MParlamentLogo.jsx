import logo from "../assets/main-logo.png";
import styles from "./MParlamentLogo.module.css";

export default function MParlamentLogo() {
	return (
		<div className={styles.mparlamentLogo}>
			<img src={logo} alt="mParlament" className={styles.mparlamentLogoImg} />
			<span className={styles.mparlamentLogoText}>mParlament</span>
		</div>
	);
}
