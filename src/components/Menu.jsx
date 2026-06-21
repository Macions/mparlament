import { NavLink } from "react-router-dom";

const menuItems = [
  { label: "O parlamencie", to: "/o-parlamencie" },
  { label: "Posiedzenia", to: "/posiedzenia" },
  { label: "Parlamentarzyści", to: "/parlamentarzysci" },
];

export default function Menu() {
  return (
    <nav className="menu">
      {menuItems.map((item) => (
        <NavLink
          key={item.label}
          to={item.to}
          className="menu__button"
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}