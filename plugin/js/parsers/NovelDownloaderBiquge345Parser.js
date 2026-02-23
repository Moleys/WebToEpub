"use strict";

parserFactory.register("www.biquge345.com", () => new NovelDownloaderBiquge345Parser());

class NovelDownloaderBiquge345Parser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.border > ul.info");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("#txt");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.xinxi > span.x1 > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/作\s*者[：:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("div.xinxi > div.x3");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.zhutu > img");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            this.applyContentPatch(element);
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

    applyContentPatch(content) {
        rm("p", true, content);
        return content;
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


