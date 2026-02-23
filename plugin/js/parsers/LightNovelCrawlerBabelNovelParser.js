"use strict";

parserFactory.register("api.babelnovel.com", () => new LightNovelCrawlerBabelNovelParser());


class LightNovelCrawlerBabelNovelParser extends Parser {
    constructor() {
        super();
        this.novelHash = null;
        this.novelId = null;
        this.title = "";
        this.author = "";
        this.cover = null;
        this.chapterJsonByUrl = new Map();
        this.chapterList = [];
    }

    async loadEpubMetaInfo(dom) {
        let url = dom.baseURI.split("?")[0].replace(/\/$/, "");
        let pathParts = new URL(url).pathname.split("/").filter(Boolean);
        if (pathParts[0] === "books" && pathParts[1]) {
            this.novelHash = pathParts[1];
        } else {
            this.novelHash = pathParts[pathParts.length - 1];
        }
        if (util.isNullOrEmpty(this.novelHash)) {
            return;
        }
        let novelUrl = `https://api.babelnovel.com/v1/books/${this.novelHash}`;
        let data = (await HttpClient.fetchJson(novelUrl)).json?.data;
        if (!data) {
            return;
        }
        this.author = data?.author?.enName ?? "";
        this.novelId = data?.id ?? null;
        this.title = data?.name ?? "";
        this.cover = data?.cover ?? null;
        let chapterCount = parseInt(data?.releasedChapterCount ?? 0, 10);
        if (this.novelId != null && chapterCount > 0) {
            this.chapterList = await this.fetchChapterList(chapterCount);
        }
    }

    async fetchChapterList(chapterCount) {
        let chapters = [];
        let pages = 1 + Math.floor(chapterCount / 100);
        for (let page = 0; page < pages; page++) {
            let listUrl = `https://api.babelnovel.com/v1/books/${this.novelId}/chapters?bookId=${this.novelId}&page=${page}&pageSize=100&fields=id,name,canonicalName,isBought,isFree,isLimitFree`;
            let data = (await HttpClient.fetchJson(listUrl)).json?.data || [];
            for (let item of data) {
                if (!(item.isFree || item.isLimitFree || item.isBought)) {
                    continue;
                }
                let chapterUrl = `https://babelnovel.com/books/${this.novelHash}/chapters/${item.canonicalName}`;
                let jsonUrl = `https://api.babelnovel.com/v1/books/${this.novelHash}/chapters/${item.id}/content`;
                this.chapterJsonByUrl.set(chapterUrl, jsonUrl);
                chapters.push({
                    sourceUrl: chapterUrl,
                    title: item.name || item.canonicalName
                });
            }
        }
        return chapters;
    }

    async getChapterUrls() {
        return this.chapterList;
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
        return util.isNullOrEmpty(this.title) ? super.extractTitleImpl(dom) : this.title;
    }

    extractAuthor(dom) {
        return util.isNullOrEmpty(this.author) ? super.extractAuthor(dom) : this.author;
    }

    findCoverImageUrl(dom) {
        return this.cover || super.findCoverImageUrl(dom);
    }

    async fetchChapter(url) {
        let jsonUrl = this.chapterJsonByUrl.get(url);
        if (util.isNullOrEmpty(jsonUrl)) {
            jsonUrl = url.replace("//babelnovel.com/", "//api.babelnovel.com/v1/") + "/content";
        }
        let data = (await HttpClient.fetchJson(jsonUrl)).json?.data;
        let html = data?.content?.replace(/\n/g, "<br>") ?? "";
        let title = data?.name || data?.canonicalName || "";
        return LightNovelCrawlerBabelNovelParser.textToDoc(html, title, url);
    }

    static textToDoc(html, title, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        newDoc.content.innerHTML = html || "";
        if (!util.isNullOrEmpty(title)) {
            let header = newDoc.dom.createElement("h1");
            header.textContent = title;
            newDoc.content.insertBefore(header, newDoc.content.firstChild);
        }
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

