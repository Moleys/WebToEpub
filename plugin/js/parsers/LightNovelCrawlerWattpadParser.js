"use strict";

parserFactory.register("my.w.tt", () => new LightNovelCrawlerWattpadParser());


class LightNovelCrawlerWattpadParser extends Parser {
    constructor() {
        super();
        this.storyId = null;
        this.title = "";
        this.author = "";
        this.cover = null;
        this.chapterList = [];
    }

    async loadEpubMetaInfo(dom) {
        let match = dom.baseURI.match(/(\d+)/);
        if (!match) {
            return;
        }
        this.storyId = match[1];
        let info = (await HttpClient.fetchJson(`https://www.wattpad.com/api/v3/stories/${this.storyId}`)).json;
        this.title = info?.title ?? "";
        this.author = info?.user?.name ?? "";
        this.cover = info?.cover ?? null;
        this.chapterList = (info?.parts || []).map(part => ({
            sourceUrl: new URL(part.url, "https://www.wattpad.com/").href,
            title: part.title || ""
        }));
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
        return this.title || super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        return util.isNullOrEmpty(this.author) ? super.extractAuthor(dom) : this.author;
    }

    findCoverImageUrl(dom) {
        return this.cover || super.findCoverImageUrl(dom);
    }

    async fetchChapter(url) {
        let path = new URL(url).pathname;
        let chapterId = path.split("-")[0].replace("/", "");
        let infoUrl = `https://www.wattpad.com/v4/parts/${chapterId}?fields=id,title,pages,text_url&_=${Date.now()}`;
        let info = (await HttpClient.fetchJson(infoUrl)).json;
        let textUrl = info?.text_url?.text;
        let text = textUrl ? await HttpClient.fetchText(textUrl) : "";
        text = text.replace(/<p data-p-id=\"[a-f0-9]+\">/g, "<p>");
        return LightNovelCrawlerWattpadParser.textToDoc(text, url);
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

