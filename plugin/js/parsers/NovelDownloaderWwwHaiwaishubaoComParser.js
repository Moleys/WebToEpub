"use strict";

parserFactory.register("www.haiwaishubao.com", () => new NovelDownloaderWwwHaiwaishubaoComParser());

class NovelDownloaderWwwHaiwaishubaoComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let indexUrls = await this.getIndexUrls(dom);
        let chapters = [];
        for (const url of indexUrls) {
            let tocDom = (await HttpClient.wrapFetch(url)).responseXML;
            let links = [...tocDom.querySelectorAll("li.BCsectionTwo-top-chapter > a")];
            chapters.push(...links.map(link => util.hyperLinkToChapter(link)));
        }
        return chapters;
    }

    async getIndexUrls(dom) {
        let chapterListLink = dom.querySelector("div.BGsectionOne-bottom > ul > li:nth-of-type(2) > a");
        if (!chapterListLink) {
            return [];
        }
        let chapterListUrl = chapterListLink.href;
        let tocDom = (await HttpClient.wrapFetch(chapterListUrl)).responseXML;
        let options = [...tocDom.querySelectorAll("p.CGsectionTwo-right-bottom-btn > select > option")];
        return options
            .map(o => o.getAttribute("value"))
            .filter(v => !util.isNullOrEmpty(v))
            .map(v => document.location.origin + v);
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".BGsectionOne-top-right > p.author > span > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("#intro > div.BGsectionTwo-bottom");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".BGsectionOne-top-left > img");
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
        let lastParagraphIndex = [];
        let totalParagraphs = 0;
        if (content) {
            lastParagraphIndex.push(totalParagraphs + content.children.length - 1);
            totalParagraphs += content.children.length;
        }
        let nextUrl = this.getNextPageUrl(chapterDom);
        while (nextUrl != null && nextUrl !== "" && this.shouldContinueNextPage(nextUrl)) {
            let nextDom = (await HttpClient.wrapFetch(nextUrl)).responseXML;
            let nextContent = this.findContent(nextDom);
            if (nextContent != null) {
                lastParagraphIndex.push(totalParagraphs + nextContent.children.length - 1);
                totalParagraphs += nextContent.children.length;
                content.appendChild(chapterDom.createElement("hr"));
                for (const child of Array.from(nextContent.childNodes)) {
                    content.appendChild(chapterDom.importNode(child, true));
                }
            }
            nextUrl = this.getNextPageUrl(nextDom);
        }
        // merge last paragraph of each page with next page first paragraph
        if (content && lastParagraphIndex.length > 1) {
            for (let i = 0; i < lastParagraphIndex.length - 1; i++) {
                const idx = lastParagraphIndex[i] - i;
                const lastParagraph = content.children[idx];
                if (lastParagraph && lastParagraph.nextElementSibling) {
                    lastParagraph.innerHTML += lastParagraph.nextElementSibling.innerHTML;
                    lastParagraph.nextElementSibling.remove();
                }
            }
        }
    }

    getNextPageUrl(dom) {
        let nextPageLink = dom.querySelector("section.RBGsectionTwo li.RBGsectionTwo-right a");
        if (nextPageLink && nextPageLink.textContent && nextPageLink.textContent.includes("???")) {
            return nextPageLink.href;
        }
        return "";
    }

    shouldContinueNextPage(nextUrl) {
        return nextUrl !== "" && !nextUrl.includes("index.html");
    }

    applyContentPatch(content) {
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
