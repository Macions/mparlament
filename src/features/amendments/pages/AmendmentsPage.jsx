import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./AmendmentsPage.css";


export default function AmendmentsPage() {

	const { slug } = useParams();


	const [resolution, setResolution] = useState(null);
	const [amendments, setAmendments] = useState([]);
	const [session, setSession] = useState(null);

	const [loading, setLoading] = useState(true);



	useEffect(() => {

		fetch(`/api/resolutions/${slug}/amendments`)

			.then((res) => {

				if (!res.ok) {
					throw new Error(
						"Nie znaleziono uchwały"
					);
				}

				return res.json();

			})

			.then((data) => {

				setResolution(data.resolution);

				setAmendments(data.amendments);

				setSession(data.session);

			})

			.catch((error) => {

				console.error(
					"Błąd pobierania poprawek:",
					error
				);

			})

			.finally(() => {

				setLoading(false);

			});

	}, [slug]);




	const isAmendmentWithdrawn = (amendment) => {
		return amendment.status === "withdrawn";
	};



	const getStatusLabel = (status) => {

		const statusMap = {

			accepted: "Przyjęta",

			pending: "Oczekuje",

			rejected: "Odrzucona",

			withdrawn: "Wycofana",

		};


		return statusMap[status] || status;

	};



	const getStatusClass = (status) => {

		const classMap = {

			accepted: "status-accepted",

			pending: "status-pending",

			rejected: "status-rejected",

			withdrawn: "status-withdrawn",

		};


		return classMap[status] || "";

	};




	if (loading) {
		return <div>Ładowanie poprawek...</div>;
	}



	if (!resolution) {
		return (
			<div>
				Nie znaleziono uchwały #{slug}
			</div>
		);
	}




	return (

		<div className="amendments-page">


			<div className="uchwaly-bar">


				<Link
					to={`/${slug}`}
					className="uchwaly-title"
				>


					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="50"
						height="50"
						fill="currentColor"
						className="bi bi-arrow-left"
						viewBox="0 0 16 16"
					>

						<path
							fillRule="evenodd"
							d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"
						/>

					</svg>


					WRÓĆ


				</Link>



				<div className="session-info">

					Posiedzenie: {session?.city}

					<br />

					<span>
						{session?.date}
					</span>

				</div>


			</div>




			<div className="amendments-container">


				<h1 className="page-title">

					Poprawki do uchwały

					<br />

					<blockquote>
						„{resolution.title}”
					</blockquote>


				</h1>




				<div className="addAmendment">

					<Link
						to={`/${slug}/dodaj-poprawke`}
						className="AddBtn"
					>
						Dodaj poprawkę
					</Link>

				</div>




				<div className="amendments-list">


					{amendments.length > 0 ? (

						amendments.map((amendment) => {


							const isWithdrawn =
								isAmendmentWithdrawn(amendment);



							return (

								<div

									key={amendment.id}

									className={
										`amendment-card ${isWithdrawn
											? "withdrawn"
											: ""
										}`
									}

								>



									<div className="amendment-main">


										<div className="amendment-title">


											Poprawka nr {amendment.id}


											{isWithdrawn && (

												<span className="withdrawn-badge">
													WYCOFANA
												</span>

											)}


										</div>




										<div className="amendment-author">

											Autor: {amendment.author}

										</div>




										{isWithdrawn &&
											amendment.withdrawnReason && (

												<div className="withdrawn-reason">

													Powód wycofania:
													{" "}
													{amendment.withdrawnReason}

												</div>

											)}


									</div>





									<div className="amendment-status">


										<div
											className={
												`status-badge ${getStatusClass(
													amendment.status
												)
												}`
											}
										>

											{
												getStatusLabel(
													amendment.status
												)
											}

										</div>





										{!isWithdrawn ? (

											<Link
												to={`/${slug}/poprawka/${amendment.id}`}
												className="read-more"
											>

												Wyświetl szczegóły

											</Link>


										) : (

											<span
												className="read-more-disabled"
												title="Ta poprawka została wycofana"
											>

												Szczegóły niedostępne

											</span>

										)}



									</div>


								</div>

							);

						})


					) : (

						<p>
							Nie ma jeszcze żadnych poprawek do tej uchwały.
						</p>

					)}


				</div>


			</div>


		</div>

	);

}