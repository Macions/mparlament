import React from 'react';
import './resolutions.css';

const resolutions = [
  { title: "Uchwała dotycząca wydobycia złota" },
  { title: "Uchwała dotycząca kalafiorów" },
  { title: "Uchwała na temat rolnictwa" },
  { title: "Uchwała na temat rolnictwa" },
];

export default function Resolutions() {
  return (
    <div className="resolutions-page">
      {/* Main Content */}
      <main>
        <div className="uchwaly-bar">
          <h1 className="uchwaly-title">UCHWAŁY</h1>
          <div className="session-info">
            Posiedzenie: Warszawa<br />
            <span>20.05</span>
          </div>
        </div>

        <div className="resolutions-list">
          {resolutions.map((resolution, index) => (
            <div key={index} className="resolution-item">
              <p className="resolution-title">{resolution.title}</p>
              <button className="read-btn">Przeczytaj</button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}