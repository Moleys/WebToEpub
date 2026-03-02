"use strict";

parserFactory.register("readfrom.net", () => new IReaderReadFromParser());

class IReaderReadFromParser extends Parser {
    constructor() {
        super();
        this.searchInfo = null;
    }

    async loadEpubMetaInfo(dom) {
        this.searchInfo = null;
        let title = IReaderReadFromParser.extractTitleText(dom);
        if (util.isNullOrEmpty(title)) {
            return;
        }
        let basePath = new URL(dom.baseURI).pathname.replace(/^\/+/, "");
        let searchUrl = `https://readfrom.net/build_in_search/?q=${encodeURIComponent(title)}`;
        try {
            let searchDom = (await HttpClient.wrapFetch(searchUrl)).responseXML;
            this.searchInfo = IReaderReadFromParser.parseSearchInfo(searchDom, basePath);
        } catch {
            // ignore search failures
        }
    }

    static extractTitleText(dom) {
        let raw = dom.querySelector("center > h2.title")?.textContent ?? "";
        if (util.isNullOrEmpty(raw)) {
            return "";
        }
        return raw.split(/,\s*\n\s*\n/)[0].trim();
    }

    static parseSearchInfo(dom, basePath) {
        let articles = [...dom.querySelectorAll("div.text > article.box")];
        let matching = articles.find(article => {
            let href = article.querySelector("h2.title > a")?.getAttribute("href") ?? "";
            return !util.isNullOrEmpty(basePath) && href.includes(basePath);
        });
        if (!matching) {
            return null;
        }
        let summary = matching.querySelector("div.text5");
        if (summary) {
            summary.querySelector(".coll-ellipsis")?.remove();
            summary.querySelectorAll("a").forEach(a => a.remove());
        }
        let description = summary?.textContent?.trim() ?? "";
        let author = [...matching.querySelectorAll("h5.title > a")]
            .find(a => (a.getAttribute("title") || "").startsWith("Book author - "))
            ?.textContent?.trim() ?? "";
        let genres = [...matching.querySelectorAll("h5.title > a")]
            .filter(a => (a.getAttribute("title") || "").startsWith("Genre - "))
            .map(a => a.textContent?.trim())
            .filter(t => !util.isNullOrEmpty(t));
        return { description: description, author: author, genres: genres };
    }

    async getChapterUrls(dom) {
        let chapters = [];
        chapters.push({
            sourceUrl: dom.baseURI,
            title: "1",
            number: 1
        });

        let pages = [...dom.querySelectorAll("div.pages > a")];
        for (let index = 0; index < pages.length; index++) {
            let link = pages[index];
            let href = link.href;
            if (!util.isNullOrEmpty(href)) {
                chapters.push({
                    sourceUrl: href,
                    title: link.textContent?.trim() ?? href,
                    number: index + 2
                });
            }
        }
        return chapters;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom)
            || dom.querySelector("#textToRead")
            || dom.body
            || dom.documentElement;
    }

    async fetchChapter(url) {
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        let textToRead = dom.querySelector("#textToRead");
        if (!textToRead) {
            return dom;
        }
        util.removeChildElementsMatchingSelector(textToRead, "span:empty, center");
        let paragraphs = IReaderReadFromParser.extractParagraphs(textToRead);
        let html = paragraphs.map(p => `<p>${p}</p>`).join("");
        let newDoc = Parser.makeEmptyDocForContent(url);
        util.parseHtmlAndInsertIntoContent(html, newDoc.content);
        return newDoc.dom;
    }

    static extractParagraphs(element) {
        let paragraphs = [];
        let current = "";
        for (let node of element.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                let text = node.textContent?.trim();
                if (!util.isNullOrEmpty(text)) {
                    current += text + " ";
                }
            } else if (node.nodeName.toLowerCase() === "br") {
                if (!util.isNullOrEmpty(current)) {
                    paragraphs.push(current.trim());
                    current = "";
                }
            } else {
                if (!util.isNullOrEmpty(current)) {
                    paragraphs.push(current.trim());
                    current = "";
                }
                let text = node.textContent?.trim();
                if (!util.isNullOrEmpty(text)) {
                    paragraphs.push(text);
                }
            }
        }
        if (!util.isNullOrEmpty(current)) {
            paragraphs.push(current.trim());
        }
        return paragraphs.filter(p => !util.isNullOrEmpty(p));
    }

    findChapterTitle(dom, webPage) {
        if (webPage?.title) {
            return webPage.title;
        }
        const selector = "center > h2.title";
        return selector ? dom.querySelector(selector) : null;
    }

    extractTitleImpl(dom) {
        let title = IReaderReadFromParser.extractTitleText(dom);
        return util.isNullOrEmpty(title) ? super.extractTitleImpl(dom) : title;
    }

    findCoverImageUrl(dom) {
        const selector = "article.box > div > center > div > a > img";
        let img = selector ? dom.querySelector(selector) : null;
        return img?.getAttribute("src") || super.findCoverImageUrl(dom);
    }

    extractAuthor(dom) {
        let author = this.searchInfo?.author;
        return util.isNullOrEmpty(author) ? super.extractAuthor(dom) : author;
    }

    extractSubject(dom) {
        let genres = this.searchInfo?.genres;
        if (Array.isArray(genres) && genres.length > 0) {
            return genres.join(", ");
        }
        return super.extractSubject(dom);
    }

    extractDescription(dom) {
        let description = this.searchInfo?.description;
        if (!util.isNullOrEmpty(description)) {
            return description;
        }
        return super.extractDescription(dom);
    }
}
