import React, { useState } from "react";
import "./submitResolution.css";

export default function SubmitResolution() {
	const [fileName, setFileName] = useState("");

	const handleFileChange = (e) => {
		const file = e.target.files[0];
		if (file) setFileName(file.name);
	};

	return (
		<div className="submit-page">
			{/* Główny pasek */}
			<div className="uchwaly-bar">
				<h1 className="uchwaly-title">ZŁÓŻ UCHWAŁĘ</h1>
				<div className="session-info">
					Posiedzenie: Warszawa
					<br />
					<span>20.05</span>
				</div>
			</div>

			{/* Formularz */}
			<div className="submit-container">
				<div className="form-card">
					<div className="form-group">
						<label className="label">Wpisz nazwę uchwały:</label>
						<input
							type="text"
							className="text-input"
							placeholder="Wpisz nazwę uchwały..."
						/>
					</div>

					<div className="form-group">
						<label className="label">Dodaj plik</label>

						<div className="file-upload-area">
							<label className="file-button">
								Wybierz plik DOCX
								<input
									type="file"
									accept=".docx"
									hidden
									onChange={handleFileChange}
								/>
							</label>

							<div className="selected-file">
							{fileName ? (
								<>
									<b>Wybrany plik: </b>
									{fileName}
								</>
							) : (
								"Nie wybrano pliku"
							)}
							</div>
						</div>
					</div>

					<button className="submit-btn">Złóż</button>
				</div>
			</div>
		</div>
	);
}
