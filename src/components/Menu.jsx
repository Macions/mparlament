import { NavLink } from "react-router-dom";

const menuItems = [
  { label: "O parlamencie", to: "/o-parlamencie", href: "https://parlamentmlodych.eu/" },
  { label: "Posiedzenia", to: "/posiedzenia" },
  { label: "Parlamentarzyści", to: "/parlamentarzysci" },
];

export default function Menu() {
  return (
    <nav className="menu">
      {menuItems.map((item) =>
        item.href ? (
          <a key={item.label} href={item.href} className="menu__button">
            {item.label}
          </a>
        ) : (
          <NavLink key={item.label} to={item.to} className="menu__button">
            {item.label}
          </NavLink>
        )
      )}
    </nav>
  );
}