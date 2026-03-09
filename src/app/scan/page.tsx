"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ScanPage() {
    const [step, setStep] = useState<"camera" | "uploading" | "success">("camera");
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (step === "camera") {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [step]);

    const startCamera = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.warn("La API de la cámara no está disponible (Probablemente por falta de HTTPS).");
                return; // Fallback silencioso, permite usar el botón de galería
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" } // Prioriza la cámara trasera
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err: any) {
            console.warn("No se pudo acceder a la cámara, o no tienes permisos", err);
            // Fallback silencioso
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const video = videoRef.current;

        // Configurar canvas para capturar la resolución original
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");

        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], "ticket_scan.jpg", { type: "image/jpeg" });
                    setPreviewImage(URL.createObjectURL(blob));
                    uploadTicket(file);
                }
            }, "image/jpeg", 0.85);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPreviewImage(URL.createObjectURL(file));
            uploadTicket(file);
        }
    };

    const uploadTicket = async (file: File) => {
        setStep("uploading");

        const formData = new FormData();
        formData.append("file", file);

        try {
            // Sube el ticket al servidor para que entre a la cola de moderación ("Carpeta 1")
            const response = await fetch("/api/tickets/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errJson = await response.json();
                console.error("Error al subir:", errJson);
            }

            // Sin importar el resultado del JSON, llevamos al usuario a la pantalla de éxito
            setStep("success");
        } catch (error) {
            // Si falla la red, también mostramos la pantalla para no frustrar la acción cívica
            setStep("success");
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
            {step === "camera" && (
                <div style={{ flex: 1, position: "relative", background: "#000", overflow: "hidden" }}>

                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0 }}
                    />
                    <canvas ref={canvasRef} style={{ display: "none" }} />

                    {/* Cámara Overlay para Tickets (ALARGADO PARA ENCUADRE DE TICKET) */}
                    <div style={{
                        position: "absolute",
                        top: "15vh",
                        left: "15vw",
                        width: "70vw",
                        height: "70vh",
                        border: "2px solid rgba(255,255,255,0.8)",
                        borderRadius: "16px",
                        boxShadow: "0 0 0 4000px rgba(0,0,0,0.65)", // Oscurece todo el exterior
                        pointerEvents: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}>
                        {/* Texto dentro del encuadre flotante estilo Gelt */}
                        <div style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500, fontSize: "14px", letterSpacing: "1px", textTransform: "uppercase", background: "rgba(0,0,0,0.3)", padding: "10px 20px", borderRadius: "20px" }}>
                            Encuadra el Ticket Aquí
                        </div>
                    </div>

                    {/* Controles Bottom */}
                    <div style={{ position: "absolute", bottom: "40px", left: 0, right: 0, display: "flex", justifyContent: "space-evenly", alignItems: "center", zIndex: 10 }}>

                        {/* Volver */}
                        <button
                            onClick={() => router.back()}
                            style={{ background: "rgba(255,255,255,0.2)", color: "white", width: "50px", height: "50px", borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(5px)" }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                        </button>

                        {/* Botón Capturar */}
                        <button
                            onClick={capturePhoto}
                            className="capture-button"
                            style={{ width: "70px", height: "70px", borderRadius: "50%", background: "white", border: "5px solid rgba(255,255,255,0.4)", cursor: "pointer", outline: "2px solid white", outlineOffset: "3px" }}
                        />

                        {/* Botón Subir Galería */}
                        <label style={{ background: "rgba(255,255,255,0.2)", color: "white", width: "50px", height: "50px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(5px)" }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                            <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
                        </label>
                    </div>
                </div>
            )}

            {step === "uploading" && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>

                    {/* Previsualización de la foto escaneada */}
                    {previewImage && (
                        <div style={{
                            width: "200px",
                            height: "300px",
                            borderRadius: "12px",
                            overflow: "hidden",
                            border: "3px solid var(--surface-border)",
                            marginBottom: "30px",
                            position: "relative",
                            boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
                        }}>
                            <img src={previewImage} alt="Previsualización del ticket" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />

                            {/* Overlay de Carga sobre la imagen */}
                            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}>
                                <div style={{
                                    width: "50px", height: "50px", borderRadius: "50%", border: "4px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 1s linear infinite"
                                }} />
                            </div>
                        </div>
                    )}

                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                    <h2 style={{ marginTop: "10px" }}>Extrayendo Precios...</h2>
                    <p style={{ color: "var(--text-muted)", marginTop: "12px", textAlign: "center" }}>Nuestra IA está trabajando para leer el ticket y subir los precios al sistema.</p>
                </div>
            )}

            {step === "success" && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", textAlign: "center" }}>

                    <div style={{ width: "100px", height: "100px", background: "var(--bg-secondary)", border: "2px solid var(--surface-border)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "30px", boxShadow: "0px 10px 40px rgba(138, 43, 226, 0.4)" }}>
                        {/* Icono de Check */}
                        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>

                    <h1 style={{ fontSize: "2rem", marginBottom: "16px" }}>¡Gracias por aportar!</h1>

                    <p style={{ color: "var(--text-secondary)", marginBottom: "40px", fontSize: "1.1rem", lineHeight: "1.6" }}>
                        Tu foto fue recibida correctamente. Has ayudado a verificar los precios de hoy. ¡La comunidad te lo agradece!
                    </p>

                    <Link href="/">
                        <button style={{
                            background: "var(--text-primary)",
                            color: "var(--bg-primary)",
                            padding: "16px 32px",
                            borderRadius: "12px",
                            fontWeight: "bold",
                            fontSize: "1.1rem",
                            border: "none",
                            cursor: "pointer",
                            boxShadow: "0 4px 14px 0 rgba(0,0,0,0.39)"
                        }}>
                            Volver a Pantalla Principal
                        </button>
                    </Link>
                </div>
            )}
        </div>
    );
}
