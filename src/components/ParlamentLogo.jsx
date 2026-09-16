import logo from "../assets/full_logo.png";
import styles from "./ParlamentLogo.module.css";

export default function ParlamentLogo() {
	return (
		<div className={styles.parlamentLogo}>
			<img
				src={logo}
				alt="Parlament Młodych Rzeczypospolitej Polskiej"
				className={styles.parlamentLogoImg}
			/>
		</div>
	);
}
