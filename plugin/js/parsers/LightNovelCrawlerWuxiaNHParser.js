"use strict";

parserFactory.register("wuxianovelhub.com", () => new LightNovelCrawlerWuxiaNHParser());


class LightNovelCrawlerWuxiaNHParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 1400;
        this._curTime = Date.now();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let chapters = [...dom.querySelectorAll("ul.chapter-list li a")]
            .map(a => ({ sourceUrl: a.href, title: a.querySelector(".chapter-title")?.textContent?.trim() ?? a.textContent.trim() }));

        let pagination = [...dom.querySelectorAll("#chapters .pagination li a")];
        if (pagination.length === 0) {
            return chapters;
        }

        let lastLink = pagination[pagination.length - 1];
        let url = new URL(lastLink.href);
        let maxPage = parseInt(url.searchParams.get("page") || "0", 10);
        let wjm = url.searchParams.get("wjm") || "";

        for (let i = 0; i <= maxPage; ++i) {
            let params = new URLSearchParams({
                page: String(i),
                wjm: wjm,
                "_": String(this._curTime),
                "X-Requested-With": "XMLHttpRequest",
            });
            let pageUrl = `${url.origin}/e/extend/fy.php?${params.toString()}`;
            let pageDom = (await HttpClient.wrapFetch(pageUrl)).responseXML;
            let partial = [...pageDom.querySelectorAll("ul.chapter-list li a")]
                .map(a => ({ sourceUrl: a.href, title: a.querySelector(".chapter-title")?.textContent?.trim() ?? a.textContent.trim() }));
            if (chapterUrlsUI) {
                chapterUrlsUI.showTocProgress(partial);
            }
            chapters = chapters.concat(partial);
        }
        
        if (chapters.length === 0) {
            chapters = await this.fetchChapterUrlsFromAjax(dom, false);
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector(".chapter-content");
    }

    findChapterTitle(dom, webPage) {
        return webPage ? webPage.title : null;
    }
    extractTitleImpl(dom) {
        return dom.querySelector(".novel-info .novel-title");
    }

    extractAuthor(dom) {
        let authors = [...dom.querySelectorAll('.novel-info .author span[itemprop="author"]')]
            .map(e => e.textContent.trim())
            .filter(t => !util.isNullOrEmpty(t));
        return authors.length > 0 ? authors.join(", ") : super.extractAuthor(dom);
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll(".categories a")]
            .map(e => e.textContent.trim())
            .filter(t => !util.isNullOrEmpty(t));
        return tags.join(", ");
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("#novel figure.cover img");
        if (img) {
            return img.getAttribute("data-src") || img.src || img.getAttribute("src");
        }
        return super.findCoverImageUrl(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".summary .content")];
    }


    removeUnwantedElementsFromContentElement(element) {
        const removeSelectors = [];
        const removeTags = [];
        for (let selector of removeSelectors) {
            util.removeChildElementsMatchingSelector(element, selector);
        }
        for (let tag of removeTags) {
            util.removeElements(element.querySelectorAll(tag));
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

}

