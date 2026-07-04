import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function usePageAnim() {
  const location = useLocation();

  useEffect(() => {
    const main = document.querySelector(".main");
    if (!main) return;

    const pageContent = main.children[0];
    if (!pageContent) return;

    // Natychmiast ukrywamy element (przed malowaniem)
    pageContent.style.transition = "none";
    pageContent.style.opacity = "0";
    pageContent.style.transform = "translateY(30px)";

    void pageContent.offsetWidth; // force reflow

    // Uruchomienie animacji bez opóźnienia
    pageContent.style.transition = "all 1s cubic-bezier(0.25, 0.1, 0.25, 1)";
    pageContent.classList.add("anim", "show");

    // Sprzątanie inline styles po animacji (następna klatka)
    requestAnimationFrame(() => {
      pageContent.style.transition = "";
      pageContent.style.opacity = "";
      pageContent.style.transform = "";
    });

    return;
  }, [location.pathname]);
}