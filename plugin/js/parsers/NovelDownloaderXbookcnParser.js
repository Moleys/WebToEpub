"use strict";

parserFactory.register("book.xbookcn.net", () => new NovelDownloaderXbookcnParser());

class NovelDownloaderXbookcnParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 1000;
    }

    async getChapterUrls(dom) {
        let indexPages = await this.fetchIndexPages(dom);
        let links = [];
        for (const page of indexPages) {
            links.push(...page.querySelectorAll("h3 > a"));
        }
        return links.map(link => util.hyperLinkToChapter(link));
    }

    async fetchIndexPages(dom) {
        let base = new URL(dom.baseURI);
        let baseUrl = base.origin + base.pathname;
        let pages = [];
        let nextUrl = baseUrl;
        while (nextUrl) {
            let nextDom = (await HttpClient.wrapFetch(nextUrl)).responseXML;
            pages.push(nextDom);
            let nextLink = nextDom.querySelector("#Blog1_blog-pager-older-link");
            nextUrl = nextLink ? nextLink.href : null;
        }
        return pages;
    }

    findContent(dom) {
        return dom.querySelector(".entry-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".status-msg-body") || dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLine = dom.querySelector(".entry-content > p:nth-child(1)");
        if (authorLine != null && authorLine.textContent != null) {
            return authorLine.innerText
                .replace("\u4f5c\u8005: ", "")
                .replace("\u4f5c\u8005\uff1a", "")
                .trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let content = dom.querySelector(".entry-content");
        return content?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return null;
    }

    extractLanguage() {
        return "zh";
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }
}
