// ==UserScript==
// @name         Fahren-Lernen Google-Suche
// @namespace    https://github.com/Tapetenputzer/Fahren-Lernen-Google-Suche
// @version      1.2
// @description  Extrahiert Frage + (optional) Antworten und öffnet Google-Suche im neuen Tab
// @match        *://*fahren-lernen.de/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Konfiguration
    const CONFIG = {
        SEARCH_ICON: '🔍',
        MAX_QUERY_LENGTH: 250,
        BUTTON_STYLES: {
            position: 'fixed',
            top: '10px',
            right: '10px',
            zIndex: '9999',
            padding: '12px 16px',
            backgroundColor: '#28a745',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'all 0.2s ease',
            minWidth: '40px',
            minHeight: '40px'
        }
    };

    /**
     * Bereinigt Text von unnötigen Zeichen und Leerzeichen
     * @param {string} text - Der zu bereinigende Text
     * @returns {string} Bereinigter Text
     */
    function cleanText(text) {
        return text
            .replace(/\s+/g, ' ')
            .replace(/[^\w\säöüßÄÖÜ.,!?()-]/g, '')
            .trim();
    }

    /**
     * Extrahiert die Fragetexte von der Seite
     * @returns {Object} Objekt mit questionText und answerTexts
     */
    function extractQuestionData() {
        // Frage suchen
        const questionSelectors = [
            "label.audio-label",
            ".question-text",
            "[data-testid='question']",
            ".question"
        ];
        
        let questionElement = null;
        for (const selector of questionSelectors) {
            questionElement = document.querySelector(selector);
            if (questionElement) break;
        }

        if (!questionElement) {
            throw new Error("Frage nicht gefunden. Möglicherweise hat sich die Seitenstruktur geändert.");
        }

        const questionText = cleanText(questionElement.innerText);

        // Antworten suchen
        const answerSelectors = [
            ".multiple-choice-answer label.audio-label",
            ".answer-option",
            "[data-testid='answer']"
        ];

        let answerElements = [];
        for (const selector of answerSelectors) {
            answerElements = document.querySelectorAll(selector);
            if (answerElements.length > 0) break;
        }

        const answerTexts = Array.from(answerElements)
            .map(el => cleanText(el.innerText))
            .filter(text => text.length > 0);

        return { questionText, answerTexts };
    }

    /**
     * Erstellt die Google-Suchanfrage
     * @param {string} questionText - Der Fragetext
     * @param {string[]} answerTexts - Array der Antwortentexte
     * @returns {string} Die Suchanfrage
     */
    function buildSearchQuery(questionText, answerTexts) {
        let query = questionText;
        
        // Nur die ersten 2-3 Antworten hinzufügen, um die Anfrage nicht zu lang zu machen
        if (answerTexts.length > 0) {
            const selectedAnswers = answerTexts.slice(0, 3).join(' ');
            query += ` ${selectedAnswers}`;
        }

        // Fahrschule-spezifische Begriffe hinzufügen für bessere Suchergebnisse
        query += ' Fahrschule Theorie';

        return query.substring(0, CONFIG.MAX_QUERY_LENGTH);
    }

    /**
     * Führt die Google-Suche durch
     */
    function performGoogleSearch() {
        try {
            const { questionText, answerTexts } = extractQuestionData();
            
            if (!questionText) {
                throw new Error("Leere Frage gefunden");
            }

            const searchQuery = buildSearchQuery(questionText, answerTexts);
            const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

            console.log('Suchanfrage:', searchQuery);
            window.open(googleUrl, '_blank');

        } catch (error) {
            console.error('Fehler beim Durchführen der Suche:', error);
            alert(`Fehler: ${error.message}`);
        }
    }

    /**
     * Wendet Styles auf ein Element an
     * @param {HTMLElement} element - Das Element
     * @param {Object} styles - Die Styles als Objekt
     */
    function applyStyles(element, styles) {
        Object.assign(element.style, styles);
    }

    /**
     * Erstellt und konfiguriert den Such-Button
     * @returns {HTMLButtonElement} Der erstellte Button
     */
    function createSearchButton() {
        const button = document.createElement('button');
        button.innerText = CONFIG.SEARCH_ICON;
        button.title = 'Frage bei Google suchen (Strg+G)';
        button.setAttribute('aria-label', 'Frage bei Google suchen');
        
        applyStyles(button, CONFIG.BUTTON_STYLES);

        // Hover-Effekte
        button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = '#218838';
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = CONFIG.BUTTON_STYLES.backgroundColor;
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = CONFIG.BUTTON_STYLES.boxShadow;
        });

        button.addEventListener('click', performGoogleSearch);

        return button;
    }

    /**
     * Fügt Keyboard-Shortcuts hinzu
     */
    function addKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Strg+G für Google-Suche
            if (e.ctrlKey && e.key === 'g') {
                e.preventDefault();
                performGoogleSearch();
            }
        });
    }

    /**
     * Prüft, ob wir uns auf einer relevanten Seite befinden
     * @returns {boolean} True wenn auf einer Frage-Seite
     */
    function isOnQuestionPage() {
        // Prüfe auf typische Elemente einer Frage-Seite
        const indicators = [
            'label.audio-label',
            '.question-text',
            '.multiple-choice-answer',
            '[data-testid="question"]'
        ];

        return indicators.some(selector => document.querySelector(selector));
    }

    /**
     * Wartet auf das Laden der Seite und initialisiert das Script
     */
    function waitForPageLoad() {
        if (isOnQuestionPage()) {
            initializeScript();
        } else {
            // Beobachte Änderungen am DOM für SPA-Navigation
            const observer = new MutationObserver(() => {
                if (isOnQuestionPage() && !document.getElementById('google-search-btn')) {
                    initializeScript();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Stoppe den Observer nach 30 Sekunden
            setTimeout(() => observer.disconnect(), 30000);
        }
    }

    /**
     * Initialisiert das UserScript
     */
    function initializeScript() {
        // Verhindere doppelte Initialisierung
        if (document.getElementById('google-search-btn')) {
            return;
        }

        try {
            const searchButton = createSearchButton();
            searchButton.id = 'google-search-btn';
            
            document.body.appendChild(searchButton);
            addKeyboardShortcuts();
            
            console.log('Fahren-Lernen Google-Suche UserScript erfolgreich geladen');
        } catch (error) {
            console.error('Fehler beim Initialisieren des UserScripts:', error);
        }
    }

    // Script starten
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForPageLoad);
    } else {
        waitForPageLoad();
    }

})();
