"use client";

import styles from "./validator.module.css";
import Image from "next/image";
import { useState, ChangeEvent, useEffect } from "react";

type OCRItem = {
    name: string;
    price: number;
};

type OCRData = {
    establishment: string;
    address: string;
    cuit: string;
    pdv: string;
    ticket_number: string;
    date: string;
    items: OCRItem[];
};

export default function ValidatorPage() {
    const [loading, setLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>("/receipt-demo.png");
    const [ocrData, setOcrData] = useState<OCRData | null>(null);
    const [validationStep, setValidationStep] = useState<1 | 2 | 3>(1);
    const [adminLocation, setAdminLocation] = useState<{ lat: number, lng: number } | null>(null);

    const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);

    // Auto calcular total
    const currentTotal = ocrData?.items.reduce((acc, item) => acc + (Number(item.price) || 0), 0) || 0;

    useEffect(() => {
        // Pedir la ubicación al admin para asignar el local a su ciudad actual
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setAdminLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => console.log("Geolocalización denegada en admin:", err)
            );
        }
    }, []);

    const fetchRandomTicket = async () => {
        setLoading(true);
        setOcrData(null);
        setValidationStep(1);
        setCurrentTicketId(null);
        setImagePreview(null);

        try {
            const res = await fetch("/api/tickets/random");
            const data = await res.json();
            if (data.ticket) {
                setImagePreview(data.ticket.public_url);
                setCurrentTicketId(data.ticket.id);
            } else {
                alert("No hay tickets nuevos para moderar 🥳");
            }
        } catch (err) {
            console.error("Error trayendo ticket aleatorio:", err);
            alert("Hubo un error al buscar tickets.");
        } finally {
            setLoading(false);
        }
    };

    const handleRunOcr = async () => {
        if (!imagePreview) return;
        setLoading(true);

        try {
            const response = await fetch("/api/ocr", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image_url: imagePreview }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Error desconocido al procesar con IA");

            setOcrData(data);
        } catch (err: any) {
            console.error(err);
            alert(err.message || "Error al procesar el ticket con la IA");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateItem = (index: number, field: keyof OCRItem, value: string | number) => {
        if (!ocrData) return;
        const newItems = [...ocrData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setOcrData({ ...ocrData, items: newItems });
    };

    const handleSave = async () => {
        if (!ocrData) return;
        setLoading(true);
        try {
            // Usa la ubicación del dispositivo, o un predeterminado central (ej. tu ciudad si está fija, aquí dejamos el placeholder por si falla, pero el admin usualmente acepta)
            const finalLat = adminLocation?.lat || -27.4740; // Default: Corrientes (tu ubicación detectada)
            const finalLng = adminLocation?.lng || -58.8492;

            const response = await fetch("/api/prices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...ocrData,
                    lat: finalLat,
                    lng: finalLng
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Error del servidor al guardar:", errorData);
                alert("Hubo un error al guardar en la base de datos: " + (errorData.error || "Desconocido"));
                return;
            }

            // Si hay un ticket actual, lo pasamos a la siguiente carpeta (pending_collaboration)
            if (currentTicketId) {
                await fetch("/api/tickets/moderate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ticket_id: currentTicketId, action: 'approve' })
                });
            }

            alert("¡Ticket validado! Pasando a la siguiente carpeta...");

            // Traer el siguiente automáticamente
            fetchRandomTicket();

        } catch (err: any) {
            console.error("Error de conexión al guardar:", err);
            alert("Error de red al guardar los datos: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <span className={styles.badge}>Internal Tool</span>
                    <h1 style={{ marginTop: '8px' }}>Validador de Tickets (Cloud AI)</h1>
                </div>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <button
                        onClick={fetchRandomTicket}
                        className={styles.approveBtn}
                        style={{ background: 'var(--accent-secondary)', cursor: 'pointer' }}
                        disabled={loading}
                    >
                        {loading ? "Buscando..." : "Traer Siguiente Ticket"}
                    </button>
                    {currentTicketId && (
                        <button
                            onClick={() => {
                                // Opción rápida para rechazar/borrar tickets ilegibles
                                fetch("/api/tickets/moderate", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ ticket_id: currentTicketId, action: "reject" })
                                }).then(() => fetchRandomTicket());
                            }}
                            className={styles.rejectBtn}
                        >
                            Desechar Ticket
                        </button>
                    )}
                </div>
            </header>

            <main className={styles.grid}>
                {/* Panel Izquierdo: Imagen Original */}
                <section className={styles.panel}>
                    <h2 className={styles.panelTitle}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        Imagen Original
                    </h2>
                    <div className={styles.imageContainer}>
                        {imagePreview && (
                            <>
                                <Image
                                    src={imagePreview}
                                    alt="Ticket original"
                                    fill
                                    className={styles.mockImage}
                                    style={{ padding: '20px', objectFit: 'contain' }}
                                />
                                {!ocrData && !loading && (
                                    <button
                                        onClick={handleRunOcr}
                                        className={styles.approveBtn}
                                        style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}
                                    >
                                        🧠 Procesar con IA
                                    </button>
                                )}
                            </>
                        )}
                        {loading && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span className="text-gradient" style={{ fontWeight: 'bold' }}>IA Analizando...</span>
                            </div>
                        )}
                    </div>
                </section>

                {/* Panel Derecho: Interpretación OCR y Edición */}
                <section className={styles.panel}>
                    <h2 className={styles.panelTitle}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Interpretación Cloud AI (Gemini)
                    </h2>

                    <div className={`${styles.formCard} glass`}>
                        {!ocrData && !loading ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                Haz clic en "Traer Siguiente Ticket" o "Procesar con IA" para comenzar.
                            </p>
                        ) : (
                            <>
                                {/* Indicador de Pasos */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--surface-border)', paddingBottom: '16px' }}>
                                    {['1. Local', '2. Fecha', '3. Productos'].map((stepName, i) => (
                                        <div key={i} style={{
                                            fontWeight: validationStep === i + 1 ? '700' : '400',
                                            color: validationStep === i + 1 ? 'var(--accent-primary)' : 'var(--text-muted)'
                                        }}>
                                            {stepName}
                                        </div>
                                    ))}
                                </div>

                                {validationStep === 1 && (
                                    <>
                                        <div className={styles.fieldGroup}>
                                            <label className={styles.label}>Establecimiento</label>
                                            <input
                                                type="text"
                                                value={ocrData?.establishment || ""}
                                                onChange={(e) => setOcrData(prev => prev ? { ...prev, establishment: e.target.value } : null)}
                                                className={styles.input}
                                                placeholder="Esperando datos..."
                                            />
                                        </div>
                                        <div className={styles.fieldGroup}>
                                            <label className={styles.label}>Dirección (Para Geolocalización)</label>
                                            <input
                                                type="text"
                                                value={ocrData?.address || ""}
                                                onChange={(e) => setOcrData(prev => prev ? { ...prev, address: e.target.value } : null)}
                                                className={styles.input}
                                                placeholder="Calle y Número, Ciudad"
                                            />
                                        </div>

                                        {/* NUEVO: Datos Fiscales para Puntos y Anti-Fraude */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                            <div className={styles.fieldGroup}>
                                                <label className={styles.label}>CUIT</label>
                                                <input
                                                    type="text"
                                                    value={ocrData?.cuit || ""}
                                                    onChange={(e) => setOcrData(prev => prev ? { ...prev, cuit: e.target.value } : null)}
                                                    className={styles.input}
                                                    placeholder="Sin guiones"
                                                />
                                            </div>
                                            <div className={styles.fieldGroup}>
                                                <label className={styles.label}>PDV</label>
                                                <input
                                                    type="text"
                                                    value={ocrData?.pdv || ""}
                                                    onChange={(e) => setOcrData(prev => prev ? { ...prev, pdv: e.target.value } : null)}
                                                    className={styles.input}
                                                    placeholder="0005"
                                                />
                                            </div>
                                            <div className={styles.fieldGroup}>
                                                <label className={styles.label}>N° Ticket</label>
                                                <input
                                                    type="text"
                                                    value={ocrData?.ticket_number || ""}
                                                    onChange={(e) => setOcrData(prev => prev ? { ...prev, ticket_number: e.target.value } : null)}
                                                    className={styles.input}
                                                    placeholder="0014028"
                                                />
                                            </div>
                                        </div>

                                        <button className={styles.approveBtn} onClick={() => setValidationStep(2)}>Confirmar Comercio ✓</button>
                                    </>
                                )}

                                {validationStep === 2 && (
                                    <>
                                        <div className={styles.fieldGroup}>
                                            <label className={styles.label}>Fecha</label>
                                            <input
                                                type="date"
                                                value={ocrData?.date || ""}
                                                onChange={(e) => setOcrData(prev => prev ? { ...prev, date: e.target.value } : null)}
                                                className={styles.input}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button className={styles.rejectBtn} onClick={() => setValidationStep(1)}>Atrás</button>
                                            <button className={styles.approveBtn} onClick={() => setValidationStep(3)}>Confirmar Fecha ✓</button>
                                        </div>
                                    </>
                                )}

                                {validationStep === 3 && (
                                    <>
                                        <div className={styles.tableContainer}>
                                            <label className={styles.label} style={{ display: 'block', marginBottom: '12px' }}>Productos (Modifica o Elimina Descuentos)</label>
                                            {ocrData?.items.map((item, index) => (
                                                <div key={index} className={styles.itemRow}>
                                                    <input
                                                        type="text"
                                                        value={item.name}
                                                        onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                                                        className={styles.input}
                                                    />
                                                    <input
                                                        type="number"
                                                        value={Number.isNaN(item.price) ? "" : item.price}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            handleUpdateItem(index, 'price', isNaN(val) ? 0 : val);
                                                        }}
                                                        className={styles.input}
                                                    />
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setOcrData(prev => prev ? { ...prev, items: [...prev.items, { name: "", price: 0 }] } : null)}
                                                style={{ background: 'none', border: '1px dashed var(--surface-border)', color: 'var(--text-muted)', width: '100%', padding: '8px', cursor: 'pointer', borderRadius: '8px' }}
                                            >
                                                + Agregar Item Manualmente
                                            </button>
                                        </div>

                                        <div className={styles.fieldGroup} style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '20px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700' }}>
                                                <span>Total Calculado (Suma Exacta)</span>
                                                <span className="text-gradient">${currentTotal.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        <div className={styles.actions}>
                                            <button
                                                className={styles.rejectBtn}
                                                onClick={() => setValidationStep(2)}
                                            >
                                                Atrás
                                            </button>
                                            <button
                                                className={styles.approveBtn}
                                                onClick={handleSave}
                                                disabled={loading || !ocrData}
                                            >
                                                {loading ? "Guardando..." : "Guardar Ticket Final"}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
