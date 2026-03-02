"use strict";

parserFactory.register("cenele.com", () => new IReaderRiwyatParser());

class IReaderRiwyatParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        const selector = ".wp-manga-chapter a";
        if (!selector) {
            return util.hyperlinksToChapterList(dom.body || dom.documentElement);
        }
        let nodes = [...dom.querySelectorAll(selector)];
        let links = nodes.map(node => (node.tagName === "A") ? node : node.querySelector("a"))
            .filter(a => a && a.href);
        let chapters = links.map(a => {
            let chapter = util.hyperLinkToChapter(a);
            let title = a.getAttribute("title");
            if (!util.isNullOrEmpty(title)) {
                chapter.title = title.trim();
            }
            return chapter;
        });
        chapters = chapters.reverse();

        if (chapters.length === 0) {
            chapters = await this.fetchChapterUrlsFromAjax(dom, true);
        }
        return chapters;
    }

    findContent(dom) {
        const selector = ".reading-content p";
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
        const selector = ".manga-title h1";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    findCoverImageUrl(dom) {
        const selector = ".summary_image img";
        let img = selector ? dom.querySelector(selector) : null;
        return img?.getAttribute("data-src") || img?.getAttribute("src") || super.findCoverImageUrl(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        const selector = ".description-summary p";
        return selector ? [...dom.querySelectorAll(selector)] : [];
    }

    removeUnwantedElementsFromContentElement(element) {
        let paragraphs = [...element.querySelectorAll("p")];
        if (paragraphs.length > 15) {
            for (let i = paragraphs.length - 15; i < paragraphs.length; i++) {
                paragraphs[i].remove();
            }
        }
        super.removeUnwantedElementsFromContentElement(element);
    }
}
