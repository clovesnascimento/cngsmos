/**
 * Markdown Scraper v1.4.1
 * Injected into the page to extract main content and convert basic structures to MD.
 */
(function() {
    function clean(text) {
        return text.replace(/\s+/g, ' ').trim();
    }

    const mainContent = document.querySelector('main, article, .content, #content') || document.body;
    const items = [];
    
    // Basic H1 enrichment
    const title = document.querySelector('h1')?.innerText || document.title;
    items.push(`# ${clean(title)}`);

    // Extract paragraphs and headers
    const elements = mainContent.querySelectorAll('h2, h3, p, li');
    elements.forEach(el => {
        if (el.tagName.startsWith('H')) {
            items.push(`## ${clean(el.innerText)}`);
        } else if (el.tagName === 'P') {
            items.push(clean(el.innerText));
        } else if (el.tagName === 'LI') {
            items.push(`- ${clean(el.innerText)}`);
        }
    });

    return {
        title: title,
        markdown: items.join('\n\n'),
        url: window.location.href
    };
})();
