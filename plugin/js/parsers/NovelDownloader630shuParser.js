"use strict";

parserFactory.register("www.630shu.net", () => new NovelDownloader630shuParser());

class NovelDownloader630shuParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector(".zjlist");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("#info > h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.options > span.item:nth-child(1) > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/作\s*者[：:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("#intro");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".img_in > img");
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
        rms([/恋上你看书网 WWW.630SHU.NET ，最快更新.+最新章节！/], content);
        return content;
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


