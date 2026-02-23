"use strict";

parserFactory.register("beqege.cc", () => new NovelDownloaderBeqegeCcParser());

class NovelDownloaderBeqegeCcParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("#list > dl > dd > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("#info > p");
        if (authorLabel != null && authorLabel.textContent != null) {
            let text = authorLabel.textContent;
            let parts = text.split(/\u4f5c\u8005[\uff1a:]/);
            if (parts.length > 1) {
                return parts[1].trim();
            }
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("#intro > p");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#fmimg > img");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            this.applyContentPatch(element);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    applyContentPatch(content) {
        rms(["zw443sx"], content);
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
