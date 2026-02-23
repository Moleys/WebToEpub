"use strict";

parserFactory.register("www.bilinovel.com", () => new NovelDownloaderWwwBilinovelComParser());

class NovelDownloaderWwwBilinovelComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocDom = dom;
        if (!dom.baseURI.includes("/catalog")) {
            let tocUrl = dom.baseURI.replace(/\.html$/, "/catalog");
            tocDom = (await HttpClient.wrapFetch(tocUrl)).responseXML;
        }
        let links = [...tocDom.querySelectorAll(".chapter-li-a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("#acontent");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.book-title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".book-rand-a > span");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("#bookSummary");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".book-cover");
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
        const params = getReadParams(dom);
        if (params && params.url_next) {
            return document.location.origin + params.url_next;
        }
        return dom.querySelector(".mlfy_page > a:nth-child(5)")?.href ?? "";
    }

    shouldContinueNextPage(nextUrl) {
        if (nextUrl === "") {
            return false;
        }
        return new URL(nextUrl).pathname.includes("_");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            this.applyContentPatch(element);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    applyContentPatch(content) {
        rm(".cgo", true, content);
        rm("script", true, content);
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

function getReadParams(dom) {
    let script = [...dom.querySelectorAll("script")].find(s => s.textContent && s.textContent.includes("ReadParams"));
    if (!script || !script.textContent) {
        return null;
    }
    try {
        return new Function(`${script.textContent}; return ReadParams;`)();
    } catch (e) {
        return null;
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
