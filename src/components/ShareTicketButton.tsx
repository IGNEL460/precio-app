'use client';

import { useState } from 'react';

export default function ShareTicketButton({ ticketUrl, storeName }: { ticketUrl: string, storeName?: string }) {
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        const shareData = {
            title: storeName ? `Ticket de ${storeName}` : 'Ticket Escaneado',
            text: `¡Mira mis ahorros y precios en este ticket!`,
            url: ticketUrl,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                console.log('Compartido con éxito');
            } catch (error) {
                console.log('Error o usuario canceló:', error);
            }
        } else {
            // Fallback para navegadores que no soportan Web Share API (ej. PC)
            try {
                await navigator.clipboard.writeText(ticketUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Error al copiar:', err);
            }
        }
    };

    return (
        <button
            onClick={handleShare}
            className={`mt-4 w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2 ${copied ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
                }`}
        >
            {copied ? (
                <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    ¡Enlace Copiado!
                </>
            ) : (
                <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Compartir Ticket
                </>
            )}
        </button>
    );
}
