"use strict";

parserFactory.register("www.sudugu.com", () => new NovelDownloaderWwwSuduguComParser());

class NovelDownloaderWwwSuduguComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapters = [];
        let seen = new Set();
        let pageDom = dom;
        while (pageDom != null) {
            let links = [...pageDom.querySelectorAll("div#list > ul > li > a")];
            for (const link of links) {
                let chapter = util.hyperLinkToChapter(link);
                let key = util.normalizeUrlForCompare(chapter.sourceUrl);
                if (!seen.has(key)) {
                    seen.add(key);
                    chapters.push(chapter);
                }
            }
            let nextUrl = this.getNextIndexUrl(pageDom);
            if (util.isNullOrEmpty(nextUrl)) {
                break;
            }
            pageDom = (await HttpClient.wrapFetch(nextUrl)).responseXML;
        }
        return chapters;
    }

    getNextIndexUrl(dom) {
        let links = [...dom.querySelectorAll("div#pages > a")];
        let lastLink = links.length > 0 ? links[links.length - 1] : null;
        if (lastLink && (lastLink.textContent || "").trim() === "???") {
            return lastLink.href;
        }
        return "";
    }

    findContent(dom) {
        return dom.querySelector("div.con");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.itemtxt > h1 > a, div.itemtxt > h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.itemtxt > p > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("div.des");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.item img");
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        await this.appendNextPages(chapterDom);
        return chapterDom;
    }

    async appendNextPages(chapterDom) {
        let content = this.findContent(chapterDom);
        if (content == null) {
            return;
        }
        let nextUrl = this.getNextPageUrl(chapterDom);
        while (!util.isNullOrEmpty(nextUrl)) {
            let nextDom = (await HttpClient.wrapFetch(nextUrl)).responseXML;
            let nextContent = this.findContent(nextDom);
            if (nextContent != null) {
                content.appendChild(chapterDom.createElement("hr"));
                for (const child of Array.from(nextContent.childNodes)) {
                    content.appendChild(chapterDom.importNode(child, true));
                }
            }
            nextUrl = this.getNextPageUrl(nextDom);
        }
    }

    getNextPageUrl(dom) {
        let links = [...dom.querySelectorAll("div.prenext > span > a")];
        let lastLink = links.length > 0 ? links[links.length - 1] : null;
        if (lastLink && (lastLink.textContent || "").trim() === "???") {
            return lastLink.href;
        }
        return "";
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }
}
