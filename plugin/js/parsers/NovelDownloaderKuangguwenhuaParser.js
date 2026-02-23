"use strict";

parserFactory.register("m.kuangguwenhua.com", () => new NovelDownloaderKuangguwenhuaParser());

class NovelDownloaderKuangguwenhuaParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let chapters = [];
        let indexUrls = this.getIndexUrls(dom);
        for (const url of indexUrls) {
            await this.rateLimitDelay();
            let tocDom = (await HttpClient.wrapFetch(url)).responseXML;
            let partial = this.extractChapterList(tocDom);
            if (chapterUrlsUI) {
                chapterUrlsUI.showTocProgress(partial);
            }
            chapters = chapters.concat(partial);
        }
        return chapters;
    }

    getIndexUrls(dom) {
        let options = [...dom.querySelectorAll('select[name="pageselect"] > option')];
        return options.map(o => new URL(o.getAttribute("value"), dom.baseURI).href);
    }

    extractChapterList(dom) {
        let sectionLists = [...dom.querySelectorAll("ul.section-list.fix, ul.list")];
        let sectionList = sectionLists.slice(-1)[0];
        if (!sectionList) {
            return [];
        }
        let links = [...sectionList.querySelectorAll("li > a")];
        return links.map(link => util.hyperLinkToChapter(link));
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
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("#intro, .intro, .book-intro, .desc");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#fmimg > img, .info > .cover > img, .book-boxs > .img > img, .imgbox > img");
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
        return dom.querySelector("div.section-opt:nth-child(1) > a:nth-child(5)")?.href ?? "";
    }

    shouldContinueNextPage(nextUrl) {
        if (nextUrl === "") {
            return false;
        }
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
        rm("div", true, content);
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
