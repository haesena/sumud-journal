// --- DARKMODE-TOGGLE (unverändert) ---
const darkModeToggle = document.getElementById('darkmode-toggle');
darkModeToggle.addEventListener('click', function() {
    document.documentElement.classList.toggle('darkmode');
    if (document.documentElement.classList.contains('darkmode')) {
        localStorage.setItem('darkmode', 'enabled');
    } else {
        localStorage.setItem('darkmode', 'disabled');
    }
});

// --- SPRACH-TOGGLE (NEU) ---
const langToggle = document.getElementById('lang-toggle'); // Dein neuer Button/Toggle in der HTML
// Standardmässig 'de', ausser im localStorage ist bereits 'en' gespeichert
let currentLang = localStorage.getItem('language') || 'de'; 

// Setze initial das richtige Attribut an das HTML-Tag (nützlich für CSS-Styling)
document.documentElement.setAttribute('lang', currentLang);

if(langToggle) {
    langToggle.addEventListener('click', function() {
        currentLang = currentLang === 'de' ? 'en' : 'de';
        localStorage.setItem('language', currentLang);
        document.documentElement.setAttribute('lang', currentLang);
        
        // Seite neu laden, damit die Inhalte in der richtigen Sprache geladen werden
        window.location.reload(); 
    });
}

// --- HEADER SCROLL LOGIK ---
const header = document.querySelector('header');
const body = document.body;
if (body.classList.contains('always-scrolled')) {
  header.classList.add('scrolled');
  body.classList.add('header-scrolled');
} else {
  // Reguläre Scroll-Logik für alle anderen Seiten
  window.addEventListener('scroll', () => {
    if (window.innerWidth >= 480) {
      if (document.body.scrollHeight > 1.25 * window.innerHeight) {
        if (window.scrollY > 50) {
          header.classList.add('scrolled');
          body.classList.add('header-scrolled');
        } else {
          header.classList.remove('scrolled');
          body.classList.remove('header-scrolled');
        }
      }
    }
  });
}

// --- JSON-DATEN LADEN: INDEX / GRID ---
const gridContainer = document.querySelector('.grid-container');
if (gridContainer) { // Nur ausführen, wenn auf der Grid-Seite
    fetch('data/articles.json')
        .then(response => response.json())
        .then(articles => {
            articles.reverse().forEach(article => {
                // Dynamische Auswahl der Felder basierend auf der Sprache
                const title = currentLang === 'en' && article.title_en ? article.title_en : article.title;
                const lead = currentLang === 'en' && article.lead_en ? article.lead_en : article.lead;
                const authorPrefix = currentLang === 'en' ? 'By:' : 'Von:';

                const articleCard = document.createElement('div');
                articleCard.className = 'article-card';
                articleCard.innerHTML = `
                    <a href="article.html?id=${article.id}">
                        <!--<img src="images/${article.image}" alt="${title}">-->
                        <div class="article-card-content">
                            <p class="author">${authorPrefix} ${article.author}</p>
                            <h2>${title}</h2>
                            <p class="lead">${lead}</p>
                        </div>
                    </a>`;
                gridContainer.appendChild(articleCard);
            });
        })
        .catch(error => console.error('Fehler beim Laden der Daten:', error));
}

// --- JSON-DATEN LADEN: ARTIKEL-DETAILS ---
const articleContent = document.getElementById('article-content');
if (articleContent) { // Nur ausführen, wenn auf der Artikel-Seite
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');

    fetch('data/articles.json')
        .then(response => response.json())
        .then(articles => {
            const article = articles.find(a => a.id == articleId);
            if (article) {
                // Sprachabhängige Variablen definieren
                const title = currentLang === 'en' && article.title_en ? article.title_en : article.title;
                const lead = currentLang === 'en' && article.lead_en ? article.lead_en : article.lead;
                const authorDesc = currentLang === 'en' && article.authordescription_en ? article.authordescription_en : article.authordescription;
                
                // Korrekte .txt-Datei wählen (Standard de oder _en)
                const textFile = currentLang === 'en' && article.text_en ? article.text_en : article.text;

                document.title = title;

                fetch(`articles/${textFile}`)
                    .then(response => response.text())
                    .then(fileContent => {
                        const processedContent = processArticleContent(fileContent, authorDesc);
                        articleContent.innerHTML = `
                            <p class="author">${article.author}</p>
                            <h1>${title}</h1>
                            <!--<img src="images/${article.image}" alt="${title}">-->
                            <p class='lead'>${lead}</p>
                            <div class="article-text">${processedContent}</div>`;
                    })
                    .catch(error => {
                        console.error('Error fetching article text:', error);
                        articleContent.innerHTML = currentLang === 'en' 
                            ? '<p>Article could not be loaded.</p>' 
                            : '<p>Artikel konnte nicht geladen werden.</p>';
                    });
            }
        })
        .catch(error => console.error('Error fetching articles:', error));
}

// --- TEXT-VERARBEITUNG ---
function processArticleContent(content, authorDescription) {
    const blocks = content.split(/\r?\n\r?\n/);
    let isFirstParagraphOverall = true;
    let isFirstParagraphOfSection = false;
    let currentMode = 'normal'; 
    const processedBlocks = [];

    // Label für die Autorenbox übersetzen
    const authorBoxTitle = currentLang === 'en' ? 'About the Author:' : 'Über den Autor:';

    for (const block of blocks) {
        const cleanBlock = block.replace(/^\uFEFF/, '').trim();
        if (!cleanBlock) continue;

        if (cleanBlock.includes('<div class="bibliography">')) { currentMode = 'bibliography'; processedBlocks.push(cleanBlock); continue; }
        if (cleanBlock.includes('<div class="endnotes">')) { currentMode = 'endnotes'; processedBlocks.push(cleanBlock); continue; }
        if (cleanBlock.includes('</div>')) { currentMode = 'normal'; processedBlocks.push(cleanBlock); continue; }

        if (currentMode === 'bibliography') { processedBlocks.push(`<p class="bib-entry">${cleanBlock}</p>`); continue; }
        if (currentMode === 'endnotes') { processedBlocks.push(`<p class="endnote-entry">${cleanBlock}</p>`); continue; }

        if (cleanBlock.startsWith('<h2 class="subtitle"')) { isFirstParagraphOfSection = true; processedBlocks.push(cleanBlock); continue; }
        if (cleanBlock.startsWith('<h3 class="subsubtitle"')) { isFirstParagraphOfSection = true; processedBlocks.push(cleanBlock); continue; }
        if (cleanBlock.startsWith('<h4')) { isFirstParagraphOfSection = true; processedBlocks.push(cleanBlock); continue; }
        if (cleanBlock.startsWith('<') && cleanBlock.endsWith('>')) { processedBlocks.push(cleanBlock); continue; }

        if (isFirstParagraphOverall) {
            isFirstParagraphOverall = false;
            isFirstParagraphOfSection = false;
            const initialText = cleanBlock.charAt(0).toUpperCase();
            const processedBlock = `<span class="initial">${initialText}</span>${cleanBlock.slice(1)}`;
            processedBlocks.push(`<p>${processedBlock}</p>`);

            if (authorDescription && authorDescription.trim() !== '') {
                processedBlocks.push(`<div class="author-description-box"><strong>${authorBoxTitle}</strong><p>${authorDescription}</p></div>`);
            }
            continue;
        }

        if (isFirstParagraphOfSection) {
            isFirstParagraphOfSection = false;
            processedBlocks.push(`<p>${cleanBlock}</p>`);
            continue;
        }

        processedBlocks.push(`<p class="indented-paragraph">${cleanBlock}</p>`);
    }
    return processedBlocks.join('');
}
