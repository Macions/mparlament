import logo from "../assets/main-logo.png";

export default function MParlamentLogo() {
	return (
		<div className="mparlament-logo">
			<img src={logo} className="mparlament-logo__img" />
			<span className="mparlament-logo__text">mParlament</span>
		</div>
	);
}
