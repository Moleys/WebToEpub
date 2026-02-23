"use strict";

parserFactory.register("www.17k.com", () => new NovelDownloader17kParser());

class NovelDownloader17kParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let sections = dom.querySelectorAll("dl.Volume");
        let chapters = [];
        let currentArc = null;
        for (const section of Array.from(sections)) {
            let sectionName = section.querySelector("dt > span.tit")?.textContent?.trim() || null;
            let newArc = (sectionName && sectionName !== currentArc) ? sectionName : null;
            if (sectionName) {
                currentArc = sectionName;
            }
            let links = section.querySelectorAll("dd > a");
            for (const link of Array.from(links)) {
                let span = link.querySelector("span") || link;
                let title = span.textContent?.trim() || "";
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
        return dom.querySelector("#readArea .readAreaBox.content .p");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.Title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.Author > a");
        if (authorLabel && authorLabel.textContent) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("#bookInfo p.intro > a");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#bookCover img.book, .bookCover img");
    }

    extractLanguage() {
        return "zh";
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "p.copy, #banner_content, div.qrcode, div.chapter_text_ad");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom, webPage) {
        let title = dom.querySelector("#readArea .readAreaBox.content > h1");
        if (title) {
            return title;
        }
        return super.findChapterTitle(dom, webPage) ?? (webPage ? webPage.title : null);
    }
}
