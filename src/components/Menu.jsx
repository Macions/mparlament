const menuItems = [
  { label: 'O parlamencie', href: '#o-parlamencie' },
  { label: 'Posiedzenia', href: '#posiedzenia' },
  { label: 'Parlamentarzyści', href: '#parlamentarzysci' },
]

export default function Menu() {
  return (
    <nav className="menu" aria-label="Menu główne">
      {menuItems.map((item) => (
        <a key={item.label} href={item.href} className="menu__button">
          {item.label}
        </a>
      ))}
    </nav>
  )
}
