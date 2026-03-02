"use strict";

parserFactory.register("truyenfull.io", () => new IReaderTruyenfullIoParser());

class IReaderTruyenfullIoParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let baseUrl = new URL(dom.baseURI);
        let basePath = baseUrl.pathname;
        if (!basePath.endsWith("/")) {
            basePath += "/";
        }
        let origin = baseUrl.origin;

        let lastPage = 1;
        for (let link of [...dom.querySelectorAll("ul.pagination.pagination-sm > li > a")]) {
            let match = link.href.match(/\/trang-(\d+)\//);
            if (match?.[1]) {
                let page = parseInt(match[1], 10);
                if (page > lastPage) {
                    lastPage = page;
                }
            }
        }

        let chapters = [];
        chapters = chapters.concat(IReaderTruyenfullIoParser.parseChaptersFromPage(dom, origin));
        chapterUrlsUI.showTocProgress(chapters);
        for (let page = 2; page <= lastPage; page++) {
            let pageUrl = `${origin}${basePath}trang-${page}/#list-chapter`;
            let pageDom = (await HttpClient.wrapFetch(pageUrl)).responseXML;
            let partial = IReaderTruyenfullIoParser.parseChaptersFromPage(pageDom, origin);
            chapterUrlsUI.showTocProgress(partial);
            chapters = chapters.concat(partial);
        }
        return chapters.map((chapter, index) => ({
            ...chapter,
            number: index + 1
        }));
    }

    static parseChaptersFromPage(dom, origin) {
        return [...dom.querySelectorAll("ul.list-chapter > li > a")].map(element => {
            let href = element.getAttribute("href");
            let name = element.textContent?.trim() ?? "";
            if (!util.isNullOrEmpty(href) && href.startsWith("/")) {
                href = origin + href;
            }
            return {
                sourceUrl: href,
                title: name
            };
        }).filter(c => !util.isNullOrEmpty(c.sourceUrl) && !util.isNullOrEmpty(c.title));
    }

    findContent(dom) {
        const selector = "#chapter-c";
        if (selector) {
            let content = dom.querySelector(selector);
            if (content) {
                return content;
            }
        }
        return dom.body || dom.documentElement;
    }

    findChapterTitle(dom, webPage) {
        let title = (() => {
            const selector = ".chapter-title";
            return selector ? dom.querySelector(selector) : null;
        })();
        return title ?? (webPage ? webPage.title : null);
    }

    extractTitleImpl(dom) {
        let img = dom.querySelector("div.book > img");
        let title = img?.getAttribute("alt");
        return util.isNullOrEmpty(title) ? super.extractTitleImpl(dom) : title;
    }

    extractAuthor(dom) {
        let header = [...dom.querySelectorAll("h3")]
            .find(h => (h.textContent || "").includes("T\u00e1c gi\u1ea3"));
        let author = header?.parentElement?.textContent?.replace("T\u00e1c gi\u1ea3:", "")?.trim();
        return util.isNullOrEmpty(author) ? super.extractAuthor(dom) : author;
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("div.book > img");
        return img?.getAttribute("src") || super.findCoverImageUrl(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        const selector = "div.desc-text";
        return selector ? [...dom.querySelectorAll(selector)] : [];
    }
}
