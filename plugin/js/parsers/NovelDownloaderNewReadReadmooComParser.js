"use strict";

parserFactory.register("new-read.readmoo.com", () => new NovelDownloaderNewReadReadmooComParser());

class NovelDownloaderNewReadReadmooComParser extends Parser {
    constructor() {
        super();
        this.readmooMeta = null;
    }

    async getChapterUrls(dom) {
        const bookId = dom.baseURI.split("/").pop();
        if (!bookId) {
            return [];
        }
        const headers = {
            Accept: "*/*",
            Authorization: "bearer TWBLXfuP-NbtCrjD2PAiFA",
            Referer: "https://reader.readmoo.com/reader/index.html",
            "X-Requested-With": "XMLHttpRequest"
        };
        const navUrl = `https://reader.readmoo.com/api/book/${bookId}/nav`;
        const navData = await fetchJson(navUrl, { headers });
        if (!navData || navData.message !== "success") {
            return [];
        }
        const epubBase = `https://reader.readmoo.com${navData.base}`;
        const containerUrl = `${epubBase}META-INF/container.xml`;
        const containerText = await fetchText(containerUrl, headers);
        if (!containerText) {
            return [];
        }
        const containerXml = new DOMParser().parseFromString(containerText, "application/xml");
        const opfPath = containerXml.querySelector("rootfile")?.getAttribute("full-path");
        if (!opfPath) {
            return [];
        }
        const opfUrl = `${epubBase}${opfPath}`;
        const opfText = await fetchText(opfUrl, headers);
        if (!opfText) {
            return [];
        }
        const opfDom = new DOMParser().parseFromString(opfText, "application/xml");
        const title = opfDom.getElementsByTagName("dc:title")[0]?.textContent || null;
        const author = opfDom.getElementsByTagName("dc:creator")[0]?.textContent || null;
        this.readmooMeta = { title, author };
        const basePath = opfPath.split("/").slice(0, -1).join("/");
        const prefix = basePath ? `${basePath}/` : "";
        const manifestItems = {};
        opfDom.querySelectorAll("manifest > item").forEach(item => {
            const id = item.getAttribute("id");
            const href = item.getAttribute("href");
            if (id && href) {
                manifestItems[id] = href;
            }
        });
        const chapters = [];
        opfDom.querySelectorAll("spine > itemref").forEach((itemref, index) => {
            const idref = itemref.getAttribute("idref");
            const href = idref ? manifestItems[idref] : null;
            if (href) {
                const chapterUrl = `${epubBase}${prefix}${href}`;
                chapters.push({ sourceUrl: chapterUrl, title: href, newArc: null });
            }
        });
        return chapters;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom) || dom.body;
    }

    extractTitleImpl(dom) {
        return this.readmooMeta?.title || dom.querySelector("h1") || null;
    }

    extractAuthor(dom) {
        if (this.readmooMeta?.author) {
            return this.readmooMeta.author.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    async fetchChapter(url) {
        const response = await fetch(url, { credentials: "include" });
        if (!response.ok) {
            return (await HttpClient.wrapFetch(url)).responseXML;
        }
        const text = await response.text();
        const chapterDom = new DOMParser().parseFromString(text, "text/html");
        const newDoc = Parser.makeEmptyDocForContent(url);
        const body = chapterDom.body;
        if (body) {
            for (const child of Array.from(body.childNodes)) {
                newDoc.content.appendChild(newDoc.dom.importNode(child, true));
            }
        }
        return newDoc.dom;
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }
}

async function fetchJson(url, init) {
    const response = await fetch(url, { ...init, credentials: "include" });
    if (!response.ok) {
        return null;
    }
    return response.json();
}

async function fetchText(url, headers) {
    const response = await fetch(url, { headers, credentials: "include" });
    if (!response.ok) {
        return null;
    }
    return response.text();
}
