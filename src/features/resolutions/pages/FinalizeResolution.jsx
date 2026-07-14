import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { parseDocx } from "../../../utils/docxParser.js";
// import { generateDocxWithTags, downloadDocx } from "../../../utils/docxGenerator.js";

export default function FinalizeResolution() {
    const navigate = useNavigate();
    const { sessionId } = useParams();

    const [resolutions, setResolutions] = useState([]);
    const [selectedResolution, setSelectedResolution] = useState(null);
    const [amendments, setAmendments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [originalFile, setOriginalFile] = useState(null);
    const [articleMap, setArticleMap] = useState({});

    useEffect(() => {
        if (sessionId) {
            fetchResolutions();
        }
    }, [sessionId]);

    const fetchResolutions = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/resolutions/session/${sessionId}`);
            if (!response.ok) throw new Error('Nie udalo sie pobrac uchwal');
            const data = await response.json();
            setResolutions(data.resolutions);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectResolution = async (resolutionId) => {
        setLoading(true);
        setError(null);
        setOriginalFile(null);
        setArticleMap({});

        try {
            const response = await fetch(`/api/resolutions/${resolutionId}/amendments`);
            if (!response.ok) throw new Error('Nie udalo sie pobrac poprawek');
            const data = await response.json();

            setAmendments(data.amendments);
            const resolution = resolutions.find(r => r.id === resolutionId);
            setSelectedResolution(resolution);

            const fileResponse = await fetch(`/api/resolutions/${resolutionId}/file`);
            if (fileResponse.ok) {
                const blob = await fileResponse.blob();
                const file = new File([blob], resolution?.fileName || 'document.docx', {
                    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                });
                setOriginalFile(file);

                const parsed = await parseDocx(file);
                const map = {};
                let artCounter = 0;
                parsed.chapters.forEach(chapter => {
                    chapter.articles.forEach((article) => {
                        artCounter++;
                        const key = `art_${artCounter}`;
                        map[key] = {
                            articleId: artCounter,
                            number: article.number,
                            content: article.content
                        };
                    });
                });
                setArticleMap(map);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!selectedResolution || !originalFile) return;

        setGenerating(true);
        setError(null);
        setSuccess(null);

        try {
            const acceptedAmendments = amendments.filter(a => a.status === 'accepted');

            const data = {};
            acceptedAmendments.forEach(amendment => {
                if (amendment.changes && Array.isArray(amendment.changes)) {
                    amendment.changes.forEach(change => {
                        const key = `art_${change.articleId}`;
                        if (articleMap[key]) {
                            data[key] = change.after || '';
                        }
                    });
                }
            });

            if (Object.keys(data).length === 0) {
                setError('Brak danych do podmiany');
                setGenerating(false);
                return;
            }

            const buffer = await generateDocxWithTags(originalFile, data);

            const fileName = `${selectedResolution.slug}-final-${Date.now()}.docx`;
            downloadDocx(buffer, fileName);

            setSuccess(`Wygenerowano uchwale! Zastosowano ${acceptedAmendments.length} poprawek.`);
        } catch (err) {
            setError(err.message);
        } finally {
            setGenerating(false);
        }
    };

    const stats = {
        total: amendments.length,
        accepted: amendments.filter(a => a.status === 'accepted').length,
        rejected: amendments.filter(a => a.status === 'rejected').length,
        pending: amendments.filter(a => a.status === 'pending').length
    };

    const handleBack = () => {
        navigate('/panel');
    };

    return (
        <div>
            <div style={{ padding: '20px', borderBottom: '1px solid #ccc' }}>
                <button onClick={handleBack}>← Powrot do panelu</button>
                <h1>Generowanie koncowej uchwaly</h1>
                <p>Posiedzenie ID: {sessionId}</p>
            </div>

            {error && (
                <div style={{ padding: '10px', margin: '10px', background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a' }}>
                    {error}
                </div>
            )}
            {success && (
                <div style={{ padding: '10px', margin: '10px', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' }}>
                    {success}
                </div>
            )}

            <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
                <div style={{ flex: '1', border: '1px solid #ddd', padding: '15px' }}>
                    <h2>Uchwaly w posiedzeniu</h2>
                    {loading && <p>Ladowanie...</p>}

                    {resolutions.length === 0 && !loading && (
                        <p>Brak uchwal dla tego posiedzenia</p>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {resolutions.map(res => (
                            <button
                                key={res.id}
                                onClick={() => handleSelectResolution(res.id)}
                                style={{
                                    padding: '10px',
                                    textAlign: 'left',
                                    background: selectedResolution?.id === res.id ? '#bbdefb' : 'white',
                                    border: selectedResolution?.id === res.id ? '2px solid #1976d2' : '1px solid #ddd',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                <strong>{res.title}</strong>
                                <br />
                                <small>Status: {res.status} | Autor: {res.author}</small>
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ flex: '2', border: '1px solid #ddd', padding: '15px' }}>
                    {selectedResolution ? (
                        <>
                            <h2>{selectedResolution.title}</h2>
                            <p><strong>Autor:</strong> {selectedResolution.author}</p>
                            <p><strong>Status:</strong> {selectedResolution.status}</p>
                            <p><strong>Data:</strong> {selectedResolution.createdAt}</p>

                            <hr />

                            <h3>Poprawki ({stats.total})</h3>

                            <div style={{ display: 'flex', gap: '15px', margin: '10px 0' }}>
                                <span style={{ color: '#2e7d32' }}>Przyjete: {stats.accepted}</span>
                                <span style={{ color: '#c62828' }}>Odrzucone: {stats.rejected}</span>
                                <span style={{ color: '#ed6c02' }}>Oczekujace: {stats.pending}</span>
                            </div>

                            {amendments.length === 0 && (
                                <p>Brak poprawek do tej uchwaly</p>
                            )}

                            <div style={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #eee' }}>
                                {amendments.map(am => (
                                    <div
                                        key={am.id}
                                        style={{
                                            padding: '10px',
                                            borderBottom: '1px solid #eee',
                                            background: am.status === 'accepted' ? '#e8f5e9' :
                                                am.status === 'rejected' ? '#ffebee' : '#fff3e0'
                                        }}
                                    >
                                        <div>
                                            <strong>{am.targetParagraphId}</strong>
                                            <span style={{
                                                marginLeft: '10px',
                                                padding: '2px 8px',
                                                borderRadius: '3px',
                                                fontSize: '12px',
                                                background: am.status === 'accepted' ? '#4caf50' :
                                                    am.status === 'rejected' ? '#f44336' : '#ff9800',
                                                color: 'white'
                                            }}>
                                                {am.status}
                                            </span>
                                            <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666' }}>
                                                {am.author}
                                            </span>
                                        </div>
                                        <p style={{ margin: '5px 0', fontSize: '14px' }}>{am.content}</p>
                                        {am.changes && am.changes.length > 0 && (
                                            <div style={{
                                                margin: '5px 0',
                                                padding: '8px',
                                                background: '#f5f5f5',
                                                borderRadius: '4px',
                                                fontSize: '13px'
                                            }}>
                                                <strong>Zmiany:</strong>
                                                {am.changes.map((change, idx) => (
                                                    <div key={idx} style={{ margin: '5px 0' }}>
                                                        <div>Artykul {change.articleId}</div>
                                                        {change.before && change.before !== '(nowy artykul)' && (
                                                            <div style={{ color: '#c62828' }}>
                                                                PRZED: {change.before}
                                                            </div>
                                                        )}
                                                        {change.after && change.after !== '(usuniety)' && (
                                                            <div style={{ color: '#2e7d32' }}>
                                                                PO: {change.after}
                                                            </div>
                                                        )}
                                                        {change.before === '(nowy artykul)' && (
                                                            <div style={{ color: '#2e7d32' }}>
                                                                NOWY: {change.after}
                                                            </div>
                                                        )}
                                                        {change.after === '(usuniety)' && (
                                                            <div style={{ color: '#c62828' }}>
                                                                USUNIETO: {change.before}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {am.status === 'withdrawn' && am.withdrawnReason && (
                                            <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                                                Powod wycofania: {am.withdrawnReason}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <hr />

                            <button
                                onClick={handleGenerate}
                                disabled={generating || stats.accepted === 0 || !originalFile}
                                style={{
                                    padding: '12px 24px',
                                    background: (stats.accepted === 0 || !originalFile) ? '#ccc' : '#1976d2',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: (stats.accepted === 0 || !originalFile) ? 'not-allowed' : 'pointer',
                                    fontSize: '16px',
                                    marginTop: '10px'
                                }}
                            >
                                {generating ? 'Generowanie...' : 'Generuj koncowa uchwale'}
                            </button>

                            {stats.accepted === 0 && (
                                <p style={{ color: '#666', fontSize: '14px' }}>
                                    Brak przyjetych poprawek do zastosowania
                                </p>
                            )}
                            {!originalFile && (
                                <p style={{ color: '#666', fontSize: '14px' }}>
                                    Ladowanie pliku uchwaly...
                                </p>
                            )}
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                            <p>Wybierz uchwale z lewej listy</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}