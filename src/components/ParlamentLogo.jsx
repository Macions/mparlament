import logo from '../assets/full_logo.png'

export default function ParlamentLogo() {
  return (
    <div className="parlament-logo">
      <img
        src={logo}
        alt="Parlament Młodych Rzeczypospolitej Polskiej"
        className="parlament-logo__img"
      />
    </div>
  )
}