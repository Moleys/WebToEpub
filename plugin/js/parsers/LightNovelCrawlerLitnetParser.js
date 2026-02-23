"use strict";

parserFactory.register("booknet.com", () => new LightNovelCrawlerLitnetParser());


class LightNovelCrawlerLitnetParser extends Parser {
    constructor() {
        super();
        this.csrfToken = null;
        this.csrfParam = null;
        this.chapterIdByUrl = new Map();
    }

    async getChapterUrls(dom) {
        this.csrfToken = dom.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? null;
        this.csrfParam = dom.querySelector('meta[name="csrf-param"]')?.getAttribute("content") ?? null;

        let chapters = [];
        let selector = dom.querySelector('select[name="chapter"]');
        if (selector) {
            let base = dom.baseURI.replace("/en/book/", "/en/reader/");
            let options = [...selector.querySelectorAll("option")].filter(o => o.value);
            chapters = options.map(option => {
                let url = `${base}?c=${option.value}`;
                this.chapterIdByUrl.set(url, option.value);
                return { sourceUrl: url, title: option.textContent.trim() };
            });
        } else {
            let links = [...dom.querySelectorAll(".collapsible-body a.collection-item")]
                .filter(a => a && a.href);
            chapters = links.map(a => {
                let url = a.href;
                let chapterId = new URL(url).searchParams.get("c");
                if (chapterId) {
                    this.chapterIdByUrl.set(url, chapterId);
                }
                return util.hyperLinkToChapter(a);
            });
        }
        return chapters;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    findChapterTitle(dom, webPage) {
        let title = (() => {
            const selector = null;
            return selector ? dom.querySelector(selector) : null;
                        
        })();
        return title ?? (webPage ? webPage.title : null);
    }

    extractTitleImpl(dom) {
        const selector = "h1.roboto";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        let author = dom.querySelector(".book-view-info a.author")
            || dom.querySelector(".book-head-content a.book-author");
        return author?.textContent?.trim() ?? super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector(".book-view-cover img") || dom.querySelector(".book-cover img");
        if (img) {
            return img.getAttribute("data-src") || img.src || img.getAttribute("src");
        }
        return super.findCoverImageUrl(dom);
    }

    async fetchChapter(url) {
        let chapterId = this.chapterIdByUrl.get(url) || new URL(url).searchParams.get("c");
        if (util.isNullOrEmpty(chapterId)) {
            return (await HttpClient.wrapFetch(url)).responseXML;
        }
        let page = 1;
        let data = await this.fetchChapterPage(chapterId, page);
        let content = data?.data ?? "";
        let totalPages = data?.totalPages ?? 1;
        for (page = 2; page <= totalPages; page++) {
            data = await this.fetchChapterPage(chapterId, page);
            content += data?.data ?? "";
        }
        return LightNovelCrawlerLitnetParser.textToDoc(content, url);
    }

    async fetchChapterPage(chapterId, page) {
        let params = new URLSearchParams();
        params.set("chapterId", parseInt(chapterId, 10));
        params.set("page", page);
        if (this.csrfParam && this.csrfToken) {
            params.set(this.csrfParam, this.csrfToken);
        }
        let headers = {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        };
        if (this.csrfToken) {
            headers["X-CSRF-Token"] = this.csrfToken;
        }
        let response = await HttpClient.fetchJson("https://booknet.com/reader/get-page", {
            method: "POST",
            headers: headers,
            body: params.toString()
        });
        return response.json;
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

