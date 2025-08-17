// ==UserScript==
// @name         Fahren-Lernen Google-Suche (1 Tab, fokussiert auf fuehrerschein-bestehen.de/Erklaerungen)
// @namespace    https://github.com/Massivendurchfall/Fahren-Lernen-Google-Suche
// @version      1.4
// @description  goggelt die frage
// @match        *://*fahren-lernen.de/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const SITE_FOCUS = 'fuehrerschein-bestehen.de/Erklaerungen/';

    function getQuestionText() {
        const label = document.querySelector("label.audio-label");
        return label ? label.innerText.trim() : null;
    }

    // Optional: Antworten holen (derzeit NICHT in der fokussierten Suche genutzt, weil es Treffer eher verwässert)
    function getAnswerTexts() {
        const labels = document.querySelectorAll(".multiple-choice-answer label.audio-label");
        return Array.from(labels).map(l => l.innerText.trim());
    }

    // Versucht typische Fragenummern zu finden (z. B. 2.1.06-014 oder 2-1-06-014)
    function extractQuestionCode() {
        const txt = document.body ? document.body.innerText : '';
        const patterns = [
            /\b\d{1,2}\.\d{1,2}\.\d{2}-\d{3}\b/, // 2.1.06-014
            /\b\d{1,2}-\d{1,2}-\d{2}-\d{3}\b/    // 2-1-06-014
        ];
        for (const re of patterns) {
            const m = re.exec(txt);
            if (m) return m[0];
        }
        return null;
    }

    function buildFocusQuery() {
        const question = getQuestionText();
        if (!question) return null;

        const exactQuestion = `"${question.replace(/["“”„]/g, '')}"`;

        const code = extractQuestionCode();
        const codeParts = [];
        if (code) {
            const dot  = code.includes('.') ? code : code.replace(/-/g, '.');
            const dash = code.includes('-') ? code : code.replace(/\./g, '-');
            codeParts.push(`"${dot}"`, `"${dash}"`);
        }

        const siteFilter = `site:${SITE_FOCUS}`;
        const pieces = [siteFilter, exactQuestion];
        if (codeParts.length) pieces.push('(' + codeParts.join(' OR ') + ')');

        // Absichtlich NUR Frage (+ evtl. Code). Antworten NICHT anhängen -> bessere Präzision auf Erklärungsseiten.
        return pieces.join(' ');
    }

    function openSingleTab() {
        const focusQuery = buildFocusQuery();
        if (!focusQuery) {
            alert("Frage nicht gefunden");
            return;
        }

        // Ein Tab, fertig. Lucky versucht direkt zu der passenden Erklärungsseite zu leiten.
        // gbv=1: einfache HTML-Ansicht (Lucky leitet dort meist zuverlässiger)
        // pws=0: ohne Personalisierung
        // gl=DE & hl=de: deutsch/Deutschland
        const luckyUrl = `https://www.google.com/search?gbv=1&hl=de&gl=DE&pws=0&btnI=1&q=${encodeURIComponent(focusQuery)}`;

        const win = window.open(luckyUrl, '_blank');
        if (win && typeof win.focus === 'function') {
            win.focus();
        }
        // Keine zweite Öffnung, kein Fallback-Tab. Genau EIN Tab pro Klick.
    }

    // UI-Button
    const btn = document.createElement("button");
    btn.innerText = "🔎";
    btn.title = "Auf Google suchen (1 Tab, fokussiert: fuehrerschein-bestehen.de/Erklaerungen)";
    Object.assign(btn.style, {
        position: "fixed",
        top: "10px",
        right: "10px",
        zIndex: "9999",
        padding: "10px 12px",
        backgroundColor: "#28a745",
        color: "#fff",
        fontSize: "16px",
        lineHeight: "1",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
    });
    btn.addEventListener("mouseover", () => btn.style.backgroundColor = "#218838");
    btn.addEventListener("mouseout",  () => btn.style.backgroundColor = "#28a745");

    document.body.appendChild(btn);
    btn.addEventListener("click", openSingleTab);
})();
