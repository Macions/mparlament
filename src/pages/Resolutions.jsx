import React from 'react';
import { Link } from "react-router-dom";
import './resolutions.css';


const resolutions = [
  {
    id: 1,
    title: "Uchwała dotycząca wydobycia złota",
    content: "Pełna treść uchwały o wydobyciu złota..."
  },
  {
    id: 2,
    title: "Uchwała dotycząca kalafiorów",
    content: "Kalafiory są bardzo ważnym elementem gospodarki..."
  },
  {
    id: 3,
    title: "Uchwała na temat rolnictwa",
    content: "Rolnictwo to fundament państwa..."
  },
  {
    id: 4,
    title: "Uchwała na temat rolnictwa",
    content: "Druga uchwała o rolnictwie..."
  },
];

export default function Resolutions() {
  return (
    <div className="resolutions-page">
      <main>

        <div className="uchwaly-bar">
          <h1 className="uchwaly-title">UCHWAŁY</h1>
          <div className="session-info">
            Posiedzenie: Warszawa<br />
            <span>20.05</span>
          </div>
        </div>

        <div className="resolutions-list">
          {resolutions.map((resolution) => (
            <div key={resolution.id} className="resolution-item">
              <p className="resolution-title">{resolution.title}</p>

              <Link to={`/uchwaly/${resolution.id}`}>
                <button className="read-btn">
                  Przeczytaj
                </button>
              </Link>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}