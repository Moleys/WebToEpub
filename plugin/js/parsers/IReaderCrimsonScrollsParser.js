"use strict";

parserFactory.register("crimsonscrolls.net", () => new IReaderCrimsonScrollsParser());

class IReaderCrimsonScrollsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let novelId = dom.querySelector("#chapter-list")?.getAttribute("data-novel");
        if (util.isNullOrEmpty(novelId)) {
            return [];
        }
        let origin = new URL(dom.baseURI).origin;
        let page = 1;
        let chapters = [];
        while (true) {
            let url = `${origin}/wp-json/cs/v1/novels/${novelId}/chapters?per_page=75&order=asc&page=${page}`;
            let json = (await HttpClient.fetchJson(url)).json;
            let items = json?.items ?? json;
            if (!Array.isArray(items) || items.length === 0) {
                break;
            }
            let partial = items.map(item => ({
                sourceUrl: item.url,
                title: item.title,
                isIncludeable: item.locked ? false : true
            }));
            chapterUrlsUI.showTocProgress(partial);
            chapters = chapters.concat(partial);
            if (items.length < 75) {
                break;
            }
            page += 1;
        }
        return chapters;
    }

    findContent(dom) {
        const selector = "#chapter-display";
        if (selector) {
            let content = dom.querySelector(selector);
            if (content) {
                return content;
            }
        }
        return dom.body || dom.documentElement;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".cs-attrib, .cs-divider");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom, webPage) {
        let title = (() => {
            const selector = "h1.chapter-title";
            return selector ? dom.querySelector(selector) : null;
        })();
        return title ?? (webPage ? webPage.title : null);
    }

    extractTitleImpl(dom) {
        const selector = "h1";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    findCoverImageUrl(dom) {
        const selector = ".single-novel-cover img";
        let img = selector ? dom.querySelector(selector) : null;
        return img?.getAttribute("data-src") || img?.getAttribute("src") || super.findCoverImageUrl(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        const selector = "#synopsis-full";
        return selector ? [...dom.querySelectorAll(selector)] : [];
    }
}
