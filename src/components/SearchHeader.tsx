"use client";

import styles from "./SearchHeader.module.css";

interface SearchHeaderProps {
    query: string;
    onSearch: (value: string) => void;
}

export default function SearchHeader({ query, onSearch }: SearchHeaderProps) {
    return (
        <header className={styles.header}>
            <h1 className={`${styles.title} animate-fade-in`}>
                Encuentra el mejor <span className="text-gradient">precio</span> en tu zona
            </h1>
            <p className={styles.subtitle}>
                Búscalo por su nombre y compáralo con los locales más cercanos. Transparencia total hecha por la comunidad.
            </p>

            <div className={styles.searchContainer}>
                <div className={styles.searchIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => onSearch(e.target.value)}
                    placeholder="Ej: Leche entera 1L..."
                    className={styles.searchInput}
                />
            </div>
        </header>
    );
}
