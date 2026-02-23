"use strict";

parserFactory.register("www.quanzhifashi.com", () => new NovelDownloaderQuanzhifashiParser());

class NovelDownloaderQuanzhifashiParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("div.ml_list > ul > li > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector(".articlecontent");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.introduce > h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.introduce > p.bq > span:nth-child(2) > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("div.introduce > p.jj");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.pic > img");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            rms([/quanzhifashi/gi, /m\.quanzhifashi\.com/gi], element);
            rm("br", true, element);
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
