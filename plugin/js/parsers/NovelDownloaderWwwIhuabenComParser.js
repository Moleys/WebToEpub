"use strict";

parserFactory.register("www.ihuaben.com", () => new NovelDownloaderWwwIhuabenComParser());

class NovelDownloaderWwwIhuabenComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapters = [];
        let baseUrl = new URL(dom.baseURI);
        let links = Array.from(dom.querySelectorAll("div.chapter-list span.chapterTitle a[href]"));
        chapters.push(...links.map(link => util.hyperLinkToChapter(link)));

        let countText = dom.querySelector("div.chapters h2.hidden-xs a")?.textContent || "";
        let countMatch = countText.match(/\d+/);
        let chapterCount = countMatch ? parseInt(countMatch[0], 10) : 0;
        let pageCount = chapterCount > 0 ? Math.ceil(chapterCount / 40) : 1;

        for (let i = 2; i <= pageCount; i++) {
            baseUrl.searchParams.set("page", String(i));
            let pageDom = (await HttpClient.wrapFetch(baseUrl.href)).responseXML;
            let pageLinks = Array.from(pageDom.querySelectorAll("div.chapter-list span.chapterTitle a[href]"));
            chapters.push(...pageLinks.map(link => util.hyperLinkToChapter(link)));
        }

        return chapters;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom)
            || dom.querySelector("#contentsource")
            || dom.querySelector("div.nbcontent")
            || dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.text-danger");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("a.text-muted");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("div.aboutbook");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.cover img");
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        let content = this.findContent(chapterDom);
        if (content != null && (content.textContent?.length || 0) >= 10) {
            return chapterDom;
        }

        try {
            let iframeDom = await HttpClient.fetchIframeDom(url, {
                waitForSelector: "#contentsource, div.nbcontent",
                minTextLength: 10
            });
            if (this.findContent(iframeDom) != null) {
                return iframeDom;
            }
        } catch {
            // ignore and fall back to chapterDom
        }
        return chapterDom;
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            util.removeChildElementsMatchingSelector(element, "i");
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }
}
