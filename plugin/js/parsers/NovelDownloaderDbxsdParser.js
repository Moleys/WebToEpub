"use strict";

parserFactory.register("www.dbxsd.com", () => new NovelDownloaderDbxsdParser());

class NovelDownloaderDbxsdParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("#all-chapter > div.panel > div.panel-body > div.row > div.item > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("#cont-body");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.media-body > div.row > div > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("div.book-detail");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("img.book-img-middel");
        let src = img ? img.getAttribute("src") : null;
        return src ? new URL(src, dom.baseURI).href : null;
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        await this.appendNextPages(chapterDom);
        return chapterDom;
    }

    async appendNextPages(chapterDom) {
        let content = this.findContent(chapterDom);
        if (content == null) {
            return;
        }
        this.applyContentPatch(content);
        let nextUrl = this.getNextPageUrl(chapterDom);
        while (nextUrl != null && nextUrl !== "" && this.shouldContinueNextPage(nextUrl)) {
            let nextDom = (await HttpClient.wrapFetch(nextUrl)).responseXML;
            let nextContent = this.findContent(nextDom);
            if (nextContent != null) {
                this.applyContentPatch(nextContent);
                content.appendChild(chapterDom.createElement("hr"));
                for (const child of Array.from(nextContent.childNodes)) {
                    content.appendChild(chapterDom.importNode(child, true));
                }
            }
            nextUrl = this.getNextPageUrl(nextDom);
        }
    }

    getNextPageUrl(dom) {
        let nextPageLink = dom.querySelector("#content > div.row > div.text-center > a:last-of-type");
        if (nextPageLink != null && nextPageLink.textContent != null && nextPageLink.textContent.includes("\u4e0b\u4e00\u9875")) {
            return nextPageLink.href;
        }
        return "";
    }

    shouldContinueNextPage(nextUrl) {
        return nextUrl.includes(".html");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            this.applyContentPatch(element);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    applyContentPatch(content) {
        rm("script", true, content);
        rm("div", true, content);
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
