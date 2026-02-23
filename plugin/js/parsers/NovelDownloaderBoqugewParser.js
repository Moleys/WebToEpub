"use strict";

parserFactory.register("www.boqugew.com", () => new NovelDownloaderBoqugewParser());

class NovelDownloaderBoqugewParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div#list-chapterAll");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div#htmlContent");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.bookTitle");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("p.booktag > a:first-child");
        if (authorLabel != null) {
            return authorLabel.textContent.replace(/作\s*者[：:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("p#bookIntro");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "img.img-thumbnail");
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
        rms([
            "记住网址m.ｂｏｑｕgew．ｃｏｍ",
            "一秒记住ｈｔｔｐ://ｍ．boqugeｗ．ｃｏｍ",
            "首发网址ｈｔｔp://m.ｂｏｑｕｇｅｗ.com"
        ], content);
        rm("br", true, content);
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

function rms(filters, dom) {
    for (const ad of filters) {
        if (typeof ad === "string") {
            dom.innerHTML = dom.innerHTML.split(ad).join("");
        } else if (ad instanceof RegExp) {
            dom.innerHTML = dom.innerHTML.replace(ad, "");
        }
    }
    return dom;
}


