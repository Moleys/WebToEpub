"use strict";

parserFactory.register("pandamanga.xyz", () => new LightNovelCrawlerPandaMangaxyzParser());


class LightNovelCrawlerPandaMangaxyzParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll(".eplister li a")];
        let firstLi = dom.querySelector(".eplister li");
        let dataNum = firstLi?.getAttribute("data-num") ?? "0";
        let liClass = firstLi?.getAttribute("class") ?? "";
        if (!(dataNum === "1" || String(liClass).includes("tseplsfrst"))) {
            chapters = chapters.reverse();
        }

        return chapters.map(a => {
            let titleNode = a.querySelector(".epl-title") || a.querySelector("span") || a;
            return {
                sourceUrl: a.href,
                title: titleNode.textContent.trim(),
            };
        });
    }

    findContent(dom) {
        return dom.querySelector("#readernovel, #readerarea, .entry-content");
    }

    findChapterTitle(dom, webPage) {
        return webPage ? webPage.title : null;
    }
    extractTitleImpl(dom) {
        return dom.querySelector("h1.entry-title");
    }

    extractAuthor(dom) {
        let authors = [...dom.querySelectorAll(".spe a[href*='/writer/']")]
            .map(e => e.textContent.trim())
            .filter(t => !util.isNullOrEmpty(t));
        return authors.length > 0 ? authors.join(", ") : super.extractAuthor(dom);
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll(".bottom.tags a[href*='/tag/']")]
            .map(e => e.textContent.trim())
            .filter(t => !util.isNullOrEmpty(t));
        return tags.join(", ");
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector(".thumbook img, .sertothumb img");
        if (img) {
            return img.getAttribute("data-src") || img.src || img.getAttribute("src");
        }
        let meta = dom.querySelector("meta[property='og:image']");
        return meta?.getAttribute("content") ?? super.findCoverImageUrl(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".entry-content")];
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

