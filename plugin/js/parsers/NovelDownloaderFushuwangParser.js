"use strict";

parserFactory.register("fushuwang.org", () => new NovelDownloaderFushuwangParser());

class NovelDownloaderFushuwangParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 500;
    }

    async getChapterUrls(dom) {
        let options = [...dom.querySelectorAll("p.pageLink > select > option")];
        let chapters = options.map((option, index) => {
            let value = option.getAttribute("value") || "";
            let url = util.isNullOrEmpty(value) ? "" : new URL(value, dom.baseURI).href;
            return {
                sourceUrl: url,
                title: `page${index + 1}`
            };
        });
        return chapters.filter(ch => !util.isNullOrEmpty(ch.sourceUrl));
    }

    findContent(dom) {
        return dom.querySelector("#text");
    }

    extractTitleImpl(dom) {
        let titleDom = dom.querySelector(".title_info h1");
        if (titleDom && titleDom.textContent) {
            let bookName = titleDom.textContent.split("\u2014\u2014")[0].trim();
            let h1 = dom.createElement("h1");
            h1.textContent = bookName;
            return h1;
        }
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let titleDom = dom.querySelector(".title_info h1");
        if (titleDom && titleDom.textContent) {
            let parts = titleDom.textContent.split("\u2014\u2014");
            if (parts.length > 1) {
                return parts[1].replace("\u4f5c\u8005: ", "").trim();
            }
        }
        return super.extractAuthor(dom);
    }

    extractLanguage() {
        return "zh";
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "span, p.pageLink, script");
        super.removeUnwantedElementsFromContentElement(element);
    }

    async fetchChapter(url) {
        return (await HttpClient.wrapFetch(url, this.makeOptions())).responseXML;
    }

    makeOptions() {
        return ({
            makeTextDecoder: () => new TextDecoder("gbk")
        });
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }
}
