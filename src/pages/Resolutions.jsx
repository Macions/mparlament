import React from "react";
import { Link } from "react-router-dom";
import "./resolutions.css";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const resolutions = [
	{
		id: 1,
		title: "Uchwała dotycząca wydobycia złota",
	},
	{
		id: 2,
		title: "Uchwała dotycząca kalafiorów",
	},
	{
		id: 3,
		title: "Uchwała na temat rolnictwa",
	},
	{
		id: 4,
		title: "Uchwała na temat rolnictwa",
	},
];


export default function Resolutions() {
  const location = useLocation();

  useEffect(() => {
    const savedScroll = sessionStorage.getItem("resolutionsScroll");

    if (savedScroll) {
      window.scrollTo(0, Number(savedScroll));

      sessionStorage.removeItem("resolutionsScroll");
    }
  }, [location.pathname]);

  return (
    <div className="resolutions-page">
      <main>
        <div className="uchwaly-bar">
          <h1 className="uchwaly-title">UCHWAŁY</h1>
        </div>

        <div className="resolutions-list">
          {resolutions.map((resolution) => (
            <div key={resolution.id} className="resolution-item">
              <p className="resolution-title">{resolution.title}</p>

              <Link
                to={`/uchwaly/${resolution.id}`}
                onClick={() => {
                  sessionStorage.setItem(
                    "resolutionsScroll",
                    window.scrollY.toString()
                  );
                }}
              >
                <button className="read-btn">Przeczytaj</button>
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}