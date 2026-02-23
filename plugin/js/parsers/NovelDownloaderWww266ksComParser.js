"use strict";

parserFactory.register("www.266ks.com", () => new NovelDownloaderWww266ksComParser());

class NovelDownloaderWww266ksComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let options = [...dom.querySelectorAll('select[name="pageselect"] > option')];
        let indexUrls = options
            .map(option => option.getAttribute("value"))
            .filter(value => !util.isNullOrEmpty(value))
            .map(value => new URL(value, dom.baseURI).href);
        if (indexUrls.length === 0) {
            indexUrls = [dom.baseURI];
        }

        let seen = new Set();
        let chapters = [];
        for (const indexUrl of indexUrls) {
            let tocDom = (await HttpClient.wrapFetch(indexUrl)).responseXML;
            let sectionLists = [...tocDom.querySelectorAll("ul.section-list.fix, ul.list")];
            let sectionList = sectionLists.slice(-1)[0];
            if (!sectionList) {
                continue;
            }
            let links = [...sectionList.querySelectorAll("li > a")];
            for (const link of links) {
                let chapter = util.hyperLinkToChapter(link);
                let key = util.normalizeUrlForCompare(chapter.sourceUrl);
                if (!seen.has(key)) {
                    seen.add(key);
                    chapters.push(chapter);
                }
            }
        }
        return chapters;
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
        let nextUrl = this.getNextPageUrl(chapterDom);
        while (nextUrl != null && nextUrl !== "" && this.shouldContinueNextPage(nextUrl)) {
            let nextDom = (await HttpClient.wrapFetch(nextUrl)).responseXML;
            let nextContent = this.findContent(nextDom);
            if (nextContent != null) {
                content.appendChild(chapterDom.createElement("hr"));
                for (const child of Array.from(nextContent.childNodes)) {
                    content.appendChild(chapterDom.importNode(child, true));
                }
            }
            nextUrl = this.getNextPageUrl(nextDom);
        }
    }

    getNextPageUrl(dom) {
        return dom.querySelector("section.g-content-nav > a:nth-child(3)")?.href || "";
    }

    shouldContinueNextPage(nextUrl) {
        return new URL(nextUrl).pathname.includes("_");
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }
}

