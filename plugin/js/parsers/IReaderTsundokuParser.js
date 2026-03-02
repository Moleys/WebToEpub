"use strict";

parserFactory.register("tsundoku.com.br", () => new IReaderTsundokuParser());

class IReaderTsundokuParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        const selector = "#chapterlist ul > li";
        if (!selector) {
            return util.hyperlinksToChapterList(dom.body || dom.documentElement);
        }
        let items = [...dom.querySelectorAll(selector)];
        let chapters = items.map(item => {
            let link = item.querySelector("a[href]");
            if (!link) {
                return null;
            }
            let chapter = util.hyperLinkToChapter(link);
            let num = item.querySelector(".chapternum")?.textContent?.trim();
            if (!util.isNullOrEmpty(num)) {
                chapter.title = num;
            }
            return chapter;
        }).filter(c => c != null);
        return chapters.reverse();
    }

    findContent(dom) {
        const selector = "#readerarea";
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
            const selector = ".headpost .entry-title";
            return selector ? dom.querySelector(selector) : null;
        })();
        return title ?? (webPage ? webPage.title : null);
    }

    extractTitleImpl(dom) {
        const selector = "h1.entry-title";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        let label = [...dom.querySelectorAll(".tsinfo .imptdt")]
            .find(el => (el.textContent || "").includes("Autor"));
        let author = label?.textContent?.replace("Autor", "")?.replace(":", "")?.trim();
        return util.isNullOrEmpty(author) ? super.extractAuthor(dom) : author;
    }

    findCoverImageUrl(dom) {
        const selector = ".main-info .thumb img";
        let img = selector ? dom.querySelector(selector) : null;
        return img?.getAttribute("src") || super.findCoverImageUrl(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        const selector = ".entry-content.entry-content-single div";
        return selector ? [...dom.querySelectorAll(selector)] : [];
    }
}
