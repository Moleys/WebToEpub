"use strict";

parserFactory.register("www.fdhxs.com", () => new NovelDownloaderWwwFdhxsComParser());

class NovelDownloaderWwwFdhxsComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let indexUrls = await this.getIndexUrls(dom);
        let chapters = [];
        for (const url of indexUrls) {
            let tocDom = (await HttpClient.wrapFetch(url)).responseXML;
            let links = [...tocDom.querySelectorAll("ul.chapter > li > a")]
                .filter(link => link.querySelector("span") != null);
            chapters.push(...links.map(link => util.hyperLinkToChapter(link)));
        }
        return chapters;
    }

    async getIndexUrls(dom) {
        let chapterListLink = dom.querySelector("a.chapterlist");
        let firstPageUrl = chapterListLink?.href;
        if (!firstPageUrl) {
            const allLinks = Array.from(dom.querySelectorAll("a"));
            const catalogLink = allLinks.find(link =>
                link.textContent?.includes("??") ||
                link.textContent?.includes("??") ||
                link.textContent?.includes("????")
            );
            firstPageUrl = catalogLink?.href;
        }
        if (!firstPageUrl) {
            return [];
        }
        let doc = (await HttpClient.wrapFetch(firstPageUrl)).responseXML;
        let pageLinks = Array.from(doc.querySelectorAll("div.page a"));
        let lastPageLink = pageLinks.find(link => link.textContent?.trim() === "??")
            || pageLinks.find(link => link.textContent?.trim() === "????");
        if (!lastPageLink) {
            return [firstPageUrl];
        }
        let lastPageUrl = lastPageLink.href;
        let pageMatch = lastPageUrl.match(/_(\d+)\/$/);
        if (!pageMatch) {
            return [firstPageUrl];
        }
        let totalPages = parseInt(pageMatch[1], 10);
        if (isNaN(totalPages) || totalPages < 1) {
            return [firstPageUrl];
        }
        let baseUrlMatch = firstPageUrl.match(/^(.+)_1\/$/);
        if (!baseUrlMatch) {
            return [firstPageUrl];
        }
        let baseUrl = baseUrlMatch[1];
        let urls = [];
        for (let page = 1; page <= totalPages; page++) {
            urls.push(`${baseUrl}_${page}/`);
        }
        return urls;
    }

    findContent(dom) {
        return dom.querySelector("#nr1");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h2");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.block_txt2 > p:nth-of-type(3) > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("div.intro_info");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.block_img2 > img");
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }
}
