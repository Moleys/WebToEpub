"use strict";

parserFactory.register("www.shencou.com", () => new NovelDownloaderWwwShencouComParser());

class NovelDownloaderWwwShencouComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocLink = dom.querySelector("#content table table ul li a");
        let tocUrl = tocLink?.href;
        if (!tocUrl) {
            return [];
        }
        let tocDom = (await HttpClient.wrapFetch(tocUrl)).responseXML;
        let links = [...tocDom.querySelectorAll("div.zjbox ol > li > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        if (dom.body && dom.body.innerHTML) {
            dom.body.innerHTML = dom.body.innerHTML
                .replace('<script language="javascript">GetFont();</script>', '<div id="content" class="fonts_mesne">')
                .replace("<center>", "</div>");
        }
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("#content table table span a");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("#content table table tr:nth-child(2) > td:nth-child(2)");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("#content table table tr:nth-child(3) td:nth-child(2)");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#content table table tr:nth-child(3) td:nth-child(2) img");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            util.removeChildElementsMatchingSelector(element, "h1");
            util.removeChildElementsMatchingSelector(element, "div[id^='BookSee']");
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom, webPage) {
        let title = dom.querySelector("h1");
        if (title != null) {
            return title;
        }
        return super.findChapterTitle(dom, webPage) ?? (webPage ? webPage.title : null);
    }
}
