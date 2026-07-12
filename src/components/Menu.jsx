import { NavLink } from "react-router-dom";

const isLoggedIn = localStorage.getItem('msw_current_user') !== null;

const menuItems = [
  { id: 1, label: "O parlamencie", to: "/o-parlamencie", href: "https://parlamentmlodych.eu/" },
  { id: 2, label: "Posiedzenia", to: "/posiedzenia" },
  { id: 3, label: "Parlamentarzyści", to: "/parlamentarzysci" },
  ...(isLoggedIn ? [{ id: 4, label: "Dashboard", to: "/dashboard" }] : []),
];

export default function Menu() {
  return (
    <nav className="menu">
      {menuItems.map((item) =>
        item.href ? (
          <a
            key={item.id}
            href={item.href}
            className="menu__button"
            target="_blank"
            rel="noopener noreferrer"
          >
            {item.label}
          </a>
        ) : (
          <NavLink
            key={item.id}
            to={item.to}
            className={({ isActive }) =>
              `menu__button ${isActive ? "menu__button--active" : ""}`
            }
          >
            {item.label}
          </NavLink>
        )
      )}
    </nav>
  );
}