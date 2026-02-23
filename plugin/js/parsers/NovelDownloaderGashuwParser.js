"use strict";

parserFactory.register("gashuw.com", () => new NovelDownloaderGashuwParser());

class NovelDownloaderGashuwParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("#list") || dom.querySelector(".listmain") || dom.querySelector(".book-item");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("#info h1, .info h2, .info h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("#info > p:nth-child(2), #info > div:nth-child(2), .info .author, .small > span:nth-child(1), .info .fix > p:nth-child(1)");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("#intro, .intro, .book-intro, .desc");
        if (introDom != null) {
            let introClone = introDom.cloneNode(true);
            this.applyIntroPatch(introClone);
            return introClone.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#fmimg > img, .info > .cover > img, .book-boxs > .img > img, .imgbox > img");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            this.applyContentPatch(element);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    applyIntroPatch(introDom) {
        rms([/\u5982\u679c\u60a8\u559c\u6b22.+\uff0c\u522b\u5fd8\u8bb0\u5206\u4eab\u7ed9\u670b\u53cb/g], introDom);
        rm('a[href^="http://down.gebiqu.com"]', false, introDom);
        return introDom;
    }

    applyContentPatch(content) {
        rms([/\"www\\.gashuw\\.com\"/g], content);
        return content;
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
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
