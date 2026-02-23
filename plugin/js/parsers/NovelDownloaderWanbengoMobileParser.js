"use strict";

parserFactory.register("m.wanbengo.com", () => new NovelDownloaderWanbengoMobileParser());

class NovelDownloaderWanbengoMobileParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapterListLink = dom.querySelector("a.chapterlist");
        if (chapterListLink == null) {
            return [];
        }
        let tocDom = (await HttpClient.wrapFetch(chapterListLink.href)).responseXML;
        let links = [...tocDom.querySelectorAll("div.booklist ul > li > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("#chaptercontent");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("h2 > span > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("div.intro > p");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.cover > img");
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
        let nextUrl = this.getNextPageUrl(chapterDom, content);
        while (nextUrl != null && nextUrl !== "" && this.shouldContinueNextPage(chapterDom, content, nextUrl)) {
            let nextDom = (await HttpClient.wrapFetch(nextUrl)).responseXML;
            let nextContent = this.findContent(nextDom);
            if (nextContent != null) {
                content.appendChild(chapterDom.createElement("hr"));
                for (const child of Array.from(nextContent.childNodes)) {
                    content.appendChild(chapterDom.importNode(child, true));
                }
            }
            nextUrl = this.getNextPageUrl(nextDom, nextContent);
        }
    }

    getNextPageUrl(dom) {
        let nextPage = dom.querySelector("div.read-page > a:last-of-type");
        let linkText = nextPage?.textContent?.trim();
        if (linkText === "\u4e0b\u4e00\u9875") {
            return nextPage.href;
        }
        return "";
    }

    shouldContinueNextPage(dom, content, nextLink) {
        let indexLink = content?.querySelector('div.read-page > a[rel="index"]')?.href;
        return nextLink !== "" && nextLink !== indexLink && nextLink.includes("_");
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }
}

