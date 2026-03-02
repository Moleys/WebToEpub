"use strict";

parserFactory.register("sunovels.com", () => new IReaderSunovelsParser());

class IReaderSunovelsParser extends Parser {
    constructor() {
        super();
        this.baseUrl = "https://sunovels.com";
    }

    async getChapterUrls(dom) {
        let url = dom.baseURI;
        if (!url.includes("activeTab=chapters")) {
            url = url.includes("?") ? `${url}&activeTab=chapters` : `${url}?activeTab=chapters`;
        }
        let chapters = IReaderSunovelsParser.extractChaptersFromDom(dom);
        if (chapters.length > 0) {
            return IReaderSunovelsParser.dedupeChapters(chapters);
        }
        try {
            let tocDom = (await HttpClient.wrapFetch(url)).responseXML;
            chapters = IReaderSunovelsParser.extractChaptersFromDom(tocDom);
        } catch {
            // ignore and fall back to iframe
        }
        if (chapters.length === 0) {
            try {
                let iframeDom = await HttpClient.fetchIframeDom(url, {
                    waitForSelector: "a[href*='/novel/']",
                    minMatchCount: 1,
                    timeoutMs: 45000,
                    scrollToBottom: true
                });
                chapters = IReaderSunovelsParser.extractChaptersFromDom(iframeDom);
            } catch {
                // ignore
            }
        }
        return IReaderSunovelsParser.dedupeChapters(chapters);
    }

    static extractChaptersFromDom(dom) {
        let links = [...dom.querySelectorAll("a[href*='/novel/']")];
        return links
            .filter(a => /\/\d+\/?$/.test(a.getAttribute("href") || ""))
            .map(a => {
                let title = a.querySelector("strong")?.textContent?.trim() || a.textContent?.trim() || a.href;
                return {
                    sourceUrl: a.href,
                    title: title
                };
            });
    }

    static dedupeChapters(chapters) {
        let unique = [];
        let seen = new Set();
        for (let chapter of chapters) {
            let key = chapter.sourceUrl;
            if (util.isNullOrEmpty(key) || seen.has(key)) {
                continue;
            }
            seen.add(key);
            unique.push(chapter);
        }
        return unique;
    }

    findContent(dom) {
        const selector = ".chapter-content p:not(.d-none)";
        if (selector) {
            let nodes = [...dom.querySelectorAll(selector)];
            if (nodes.length > 0) {
                let wrapper = dom.createElement("div");
                for (let node of nodes) {
                    wrapper.appendChild(node.cloneNode(true));
                }
                return wrapper;
            }
        }
        let fallbackSelectors = ["main > div > p", "body > div > div > p", "div > p"];
        for (let fallback of fallbackSelectors) {
            let nodes = [...dom.querySelectorAll(fallback)];
            if (nodes.length > 0) {
                let wrapper = dom.createElement("div");
                for (let node of nodes) {
                    wrapper.appendChild(node.cloneNode(true));
                }
                return wrapper;
            }
        }
        return dom.body || dom.documentElement;
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        let content = this.findContent(chapterDom);
        if (content != null && (content.textContent?.length || 0) >= 10) {
            return chapterDom;
        }
        try {
            let iframeDom = await HttpClient.fetchIframeDom(url, {
                waitForSelector: ".chapter-content p:not(.d-none)",
                minTextLength: 10,
                timeoutMs: 45000,
                scrollToBottom: true
            });
            if (this.findContent(iframeDom) != null) {
                return iframeDom;
            }
        } catch {
            // ignore and fall back
        }
        return chapterDom;
    }

    removeUnwantedElementsFromContentElement(element) {
        for (let node of [...element.querySelectorAll("p")]) {
            let text = node.textContent?.trim() ?? "";
            if (text.toLowerCase().includes("tahtoh") || text.startsWith("\u00a9")) {
                node.remove();
            }
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom, webPage) {
        let title = dom.querySelector("banner h2, header h2");
        return title ?? (webPage ? webPage.title : null);
    }

    extractTitleImpl(dom) {
        const selector = "article h3";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        const selector = ".author";
        let author = selector ? dom.querySelector(selector)?.textContent?.trim() : null;
        return util.isNullOrEmpty(author) ? super.extractAuthor(dom) : author;
    }

    findCoverImageUrl(dom) {
        let preload = dom.querySelector("link[rel='preload'][as='image'][href*='/uploads/']");
        let href = preload?.getAttribute("href");
        if (!util.isNullOrEmpty(href)) {
            return href.startsWith("http") ? href : `${this.baseUrl}${href}`;
        }
        return super.findCoverImageUrl(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        const selector = "article > div > div p";
        return selector ? [...dom.querySelectorAll(selector)] : [];
    }
}
