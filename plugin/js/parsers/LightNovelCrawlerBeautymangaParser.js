"use strict";

parserFactory.register("beautymanga.com", () => new LightNovelCrawlerBeautymangaParser());
parserFactory.register("myreadingmanga.fit", () => new LightNovelCrawlerBeautymangaParser());


class LightNovelCrawlerBeautymangaParser extends Parser {
    constructor() {
        super();
        this.mangaId = null;
        this.title = "";
        this.author = "";
        this.cover = null;
    }

    async loadEpubMetaInfo(dom) {
        this.mangaId = dom.querySelector("#manga-chapters-holder[data-id]")?.getAttribute("data-id") ?? null;
        this.title = dom.querySelector(".post-title h1")?.textContent?.trim() ?? "";
        let img = dom.querySelector(".summary_image img");
        if (img) {
            this.cover = img.getAttribute("data-src") || img.src || img.getAttribute("src");
        }
        let authors = [...dom.querySelectorAll(".author-content a[href=\"/author/\"]")]
            .map(a => a.textContent.trim())
            .filter(a => !util.isNullOrEmpty(a));
        this.author = authors.join(", ");
    }

    async getChapterUrls(dom) {
        if (util.isNullOrEmpty(this.mangaId)) {
            this.mangaId = dom.querySelector("#manga-chapters-holder[data-id]")?.getAttribute("data-id") ?? null;
        }
        if (util.isNullOrEmpty(this.mangaId)) {
            return [];
        }
        let origin = new URL(dom.baseURI).origin;
        let chapterDom = (await HttpClient.wrapFetch(`${origin}/ajax-list-chapter?mangaID=${this.mangaId}`)).responseXML;
        let links = [...chapterDom.querySelectorAll(".wp-manga-chapter a")].filter(a => a && a.href);
        return links.map(a => util.hyperLinkToChapter(a)).reverse();
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom) ||
            dom.querySelector(".reading-content") ||
            dom.body || dom.documentElement;
    }

    findChapterTitle(dom, webPage) {
        let title = (() => {
            const selector = null;
            return selector ? dom.querySelector(selector) : null;
                        
        })();
        return title ?? (webPage ? webPage.title : null);
    }

    extractTitleImpl(dom) {
        return util.isNullOrEmpty(this.title) ? super.extractTitleImpl(dom) : this.title;
    }

    extractAuthor(dom) {
        return util.isNullOrEmpty(this.author) ? super.extractAuthor(dom) : this.author;
    }

    findCoverImageUrl(dom) {
        return this.cover || super.findCoverImageUrl(dom);
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        let arrayData = chapterDom.querySelector("#arraydata");
        if (arrayData) {
            let urls = arrayData.textContent.trim().split(",");
            let images = urls.filter(src => !util.isNullOrEmpty(src))
                .map(src => `<img src="${src}" />`);
            let html = images.join("");
            return LightNovelCrawlerBeautymangaParser.textToDoc(html, url);
        }
        return chapterDom;
    }

    static textToDoc(html, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        newDoc.content.innerHTML = html || "";
        return newDoc.dom;
    }

    getInformationEpubItemChildNodes(dom) {
        const selector = null;
        return selector ? [...dom.querySelectorAll(selector)] : [];
    }

    removeUnwantedElementsFromContentElement(element) {
        const removeSelectors = [];
        const removeTags = [];
        for (let selector of removeSelectors) {
            util.removeChildElementsMatchingSelector(element, selector);
        }
        for (let tag of removeTags) {
            util.removeElements(element.querySelectorAll(tag));
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

}
