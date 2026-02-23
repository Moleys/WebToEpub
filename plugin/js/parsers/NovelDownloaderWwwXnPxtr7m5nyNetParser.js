"use strict";

parserFactory.register("www.xn--pxtr7m5ny.net", () => new NovelDownloaderWwwXnPxtr7m5nyNetParser());

class NovelDownloaderWwwXnPxtr7m5nyNetParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        if (this.isLoginRequired(dom)) {
            throw new Error("\u672c\u5c0f\u8bf4\u9700\u8981\u767b\u5f55\u540e\u6d4f\u89c8\uff01");
        }
        let links = [...dom.querySelectorAll(".table > tbody:nth-child(2) > tr > th:nth-child(1) > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    isLoginRequired(dom) {
        let mainDom = dom.querySelector(".col-xs-12 > .main-text.no-selection");
        if (!mainDom || mainDom.textContent == null) {
            return false;
        }
        return mainDom.textContent.trim() === "\u4e3b\u697c\u9690\u85cf\uff0c\u8bf7\u767b\u5f55\u540e\u67e5\u770b";
    }

    findContent(dom) {
        return dom.querySelector(".main-text.no-selection > span[id^=full]");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".font-1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.h5:nth-child(1) > div:nth-child(1) > a:nth-child(1)");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.trim();
        }
        return "\u533f\u540d\u54b8\u9c7c";
    }

    extractDescription(dom) {
        if (this.isLoginRequired(dom)) {
            throw new Error("\u672c\u5c0f\u8bf4\u9700\u8981\u767b\u5f55\u540e\u6d4f\u89c8\uff01");
        }
        let introDom = this.buildIntroDom(dom);
        return introDom != null ? introDom.textContent : super.extractDescription(dom);
    }

    buildIntroDom(dom) {
        let introDom = dom.createElement("div");
        let shortIntroDom = dom.querySelector("div.article-title div.h5");
        if (shortIntroDom != null) {
            let p = dom.createElement("p");
            p.textContent = shortIntroDom.textContent || "";
            introDom.appendChild(p);
        }
        let longIntroDom = dom.querySelector(".col-xs-12 > .main-text.no-selection");
        if (longIntroDom != null) {
            let clone = longIntroDom.cloneNode(true);
            for (const elem of Array.from(clone.children)) {
                introDom.appendChild(elem);
            }
        }
        return introDom;
    }

    customRawDomToContentStep(webPage, content) {
        if (!webPage || !webPage.rawDom || content == null) {
            return;
        }
        let authorSay = webPage.rawDom.querySelector(".main-text.no-selection > .grayout");
        if (authorSay != null) {
            let hr = webPage.rawDom.createElement("hr");
            content.appendChild(hr);
            content.appendChild(authorSay.cloneNode(true));
        }
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }
}

