"use strict";

parserFactory.register("markazriwayat.com", () => new IReaderMarkazRiwayatParser());

class IReaderMarkazRiwayatParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let mangaId = dom.querySelector("#manga-chapters-list")?.getAttribute("data-manga-id");
        if (util.isNullOrEmpty(mangaId)) {
            return [];
        }
        let origin = new URL(dom.baseURI).origin;
        let page = 1;
        let chapters = [];
        let hasMore = true;
        while (hasMore) {
            let url = `${origin}/wp-json/theam/v1/manga-chapters?manga_id=${mangaId}&order=DESC&page=${page}&per_page=30`;
            let json = (await HttpClient.fetchJson(url)).json;
            let items = json?.items ?? [];
            if (!Array.isArray(items) || items.length === 0) {
                break;
            }
            let partial = items.map(item => ({
                sourceUrl: item.url,
                title: item.label ?? item.title ?? item.name ?? ""
            })).filter(c => !util.isNullOrEmpty(c.sourceUrl));
            chapterUrlsUI.showTocProgress(partial);
            chapters = chapters.concat(partial);
            hasMore = json?.has_more === true;
            page += 1;
        }
        return chapters.reverse();
    }

    findContent(dom) {
        const selector = ".reading-content .text-right p";
        if (selector) {
            let nodes = [...dom.querySelectorAll(selector)];
            if (nodes.length > 0) {
                if (nodes.length === 1) {
                    return nodes[0];
                }
                let wrapper = dom.createElement("div");
                for (let node of nodes) {
                    wrapper.appendChild(node.cloneNode(true));
                }
                return wrapper;
            }
        }
        return dom.body || dom.documentElement;
    }

    findChapterTitle(dom, webPage) {
        let title = (() => {
            const selector = null;
            return selector ? dom.querySelector(selector) : null;
        })();
        return title ?? (webPage ? webPage.title : null);
    }

    extractTitleImpl(dom) {
        const selector = "h1.manga-title";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        const selector = ".manga-author";
        let author = selector ? dom.querySelector(selector)?.textContent?.trim() : null;
        return util.isNullOrEmpty(author) ? super.extractAuthor(dom) : author;
    }

    findCoverImageUrl(dom) {
        const selector = ".manga-cover-wrap img";
        let img = selector ? dom.querySelector(selector) : null;
        return img?.getAttribute("data-src") || img?.getAttribute("src") || super.findCoverImageUrl(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        const selector = ".manga-summary";
        return selector ? [...dom.querySelectorAll(selector)] : [];
    }
}
