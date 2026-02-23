"use strict";

parserFactory.register("www.penana.com", () => new NovelDownloaderPenanaParser());

class NovelDownloaderPenanaParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("div#toclist a")];
        return links.map(link => this.linkToChapter(link));
    }

    linkToChapter(link) {
        let chapter = util.hyperLinkToChapter(link);
        let name = link.querySelector("div.toc1")?.textContent?.trim();
        if (!util.isNullOrEmpty(name)) {
            chapter.title = name;
        }
        return chapter;
    }

    findContent(dom) {
        return dom.querySelector("article");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".booktitlewrap");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.fontbold");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("div.readtext");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "img.bookcover");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            rm("span", true, element);
            rm('p[style="display:none"]', true, element);
            rm(".displaynone", true, element);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }
}

function rm(selector, all, dom) {
    if (all) {
        dom.querySelectorAll(selector).forEach(e => e.remove());
    } else {
        let element = dom.querySelector(selector);
        if (element != null) {
            element.remove();
        }
    }
}
