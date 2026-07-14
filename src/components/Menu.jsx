import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Menu() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("msw_current_user");
    setIsLoggedIn(user !== null);
  }, []);

  const menuItems = [
    { id: 1, label: "O parlamencie", to: "/o-parlamencie", href: "https://parlamentmlodych.eu/" },
    { id: 2, label: "Posiedzenia", to: "/posiedzenie" },
    { id: 3, label: "Parlamentarzyści", to: "/parlamentarzysci" },
    ...(localStorage.getItem("token")
      ? [{ id: 4, label: "Panel użytkownika", to: "/panel" }]
      : []),
  ];

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