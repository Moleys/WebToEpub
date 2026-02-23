"use strict";

parserFactory.register("www.linovelib.com", () => new NovelDownloaderWwwLinovelibComParser());

class NovelDownloaderWwwLinovelibComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocDom = dom;
        if (!dom.baseURI.includes("/catalog")) {
            let tocUrl = dom.baseURI.replace(/\.html$/, "/catalog");
            tocDom = (await HttpClient.wrapFetch(tocUrl)).responseXML;
        }
        let chapters = [];
        let volumes = tocDom.querySelectorAll("#volume-list > div.volume");
        if (volumes.length > 0) {
            for (const volume of Array.from(volumes)) {
                let newArc = volume.querySelector(".volume-info > h2")?.textContent?.trim() || null;
                let links = volume.querySelectorAll(".chapter-list li.col-4 > a");
                for (const link of Array.from(links)) {
                    chapters.push({
                        sourceUrl: link.href,
                        title: link.textContent?.trim() || link.title || link.href,
                        newArc: newArc
                    });
                    newArc = null;
                }
            }
            return chapters;
        }
        let links = [...tocDom.querySelectorAll(".chapter-list li.col-4 > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("#TextContent");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".book-meta > h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".book-meta > p:nth-child(2) > span:nth-child(1) > a:nth-child(1)");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector(".book-dec > p:nth-child(1)");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".book-img > img");
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
        return dom.querySelector(".mlfy_page > a:nth-child(5)")?.href ?? "";
    }

    shouldContinueNextPage(nextUrl) {
        let pathname = nextUrl.split("/").slice(-1)[0];
        return pathname.includes("_");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            this.applyContentPatch(element);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    applyContentPatch(content) {
        rm(".tp", true, content);
        rm(".bd", true, content);
        content.querySelectorAll("img.lazyload").forEach(e => {
            let dataSrc = e.getAttribute("data-src");
            if (dataSrc) {
                e.setAttribute("src", dataSrc);
            }
        });
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
