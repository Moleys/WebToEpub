"use strict";

parserFactory.register("www.doufuyuedu.com", () => new NovelDownloaderWwwDoufuyueduComParser());

class NovelDownloaderWwwDoufuyueduComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapters = [];
        let sections = dom.querySelectorAll("div.catelogue");
        for (const section of Array.from(sections)) {
            let sectionName = section.querySelector("div.catelogue_hd")?.textContent?.trim() || null;
            let links = section.querySelectorAll("div.catelogue_bd > ul > li > a[href]");
            let newArc = sectionName;
            for (const link of Array.from(links)) {
                let title = link.textContent?.trim() || link.href;
                chapters.push({
                    sourceUrl: link.href,
                    title: title,
                    newArc: newArc
                });
                newArc = null;
            }
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector("#J_chapterContent");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.book_tt");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.user_name");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("div.book_des");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "img.book_img");
    }

    async fetchChapter(url) {
        try {
            let iframeDom = await HttpClient.fetchIframeDom(url, {
                waitForSelector: "#J_chapterContent"
            });
            if (this.findContent(iframeDom) != null) {
                return iframeDom;
            }
        } catch {
            // ignore and fall back to wrapFetch
        }
        return (await HttpClient.wrapFetch(url)).responseXML;
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            util.removeChildElementsMatchingSelector(element, "span");
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
