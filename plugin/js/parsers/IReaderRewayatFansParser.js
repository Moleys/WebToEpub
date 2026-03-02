"use strict";

parserFactory.register("rewayatfans.com", () => new IReaderRewayatFansParser());
parserFactory.register("rewayahfans.net", () => new IReaderRewayatFansParser());

class IReaderRewayatFansParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        const selector = ".has-huge-font-size a, .has-medium-font-size a";
        if (!selector) {
            return util.hyperlinksToChapterList(dom.body || dom.documentElement);
        }
        let nodes = [...dom.querySelectorAll(selector)];
        let links = nodes.map(node => (node.tagName === "A") ? node : node.querySelector("a"))
            .filter(a => a && a.href);
        let chapters = links.map(a => util.hyperLinkToChapter(a));
        return chapters.reverse();
    }

    findContent(dom) {
        const selector = ".entry-content .wp-block-spacer ~ p";
        if (selector) {
            let nodes = [...dom.querySelectorAll(selector)];
            if (nodes.length > 0) {
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
        const selector = ".has-tertiary-background-color font, h1";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    findCoverImageUrl(dom) {
        const selector = ".size-full img";
        let img = selector ? dom.querySelector(selector) : null;
        return img?.getAttribute("src") || super.findCoverImageUrl(dom);
    }

    extractDescription(dom) {
        let description = IReaderRewayatFansParser.descriptionBetweenH2(dom);
        if (!util.isNullOrEmpty(description)) {
            return description;
        }
        description = IReaderRewayatFansParser.descriptionBetweenMarkers(dom);
        return description ?? "";
    }

    static descriptionBetweenH2(dom) {
        let entry = dom.querySelector("div.entry-content");
        if (!entry) {
            return "";
        }
        let paragraphs = [];
        let foundFirst = false;
        for (let element of entry.children) {
            if (element.tagName.toLowerCase() === "h2") {
                if (foundFirst) {
                    break;
                }
                foundFirst = true;
                continue;
            }
            if (foundFirst && element.tagName.toLowerCase() === "p") {
                let text = element.textContent?.trim();
                if (!util.isNullOrEmpty(text)) {
                    paragraphs.push(text);
                }
            }
        }
        return paragraphs.join("\n\n");
    }

    static descriptionBetweenMarkers(dom) {
        let entry = dom.querySelector("div.entry-content");
        if (!entry) {
            return "";
        }
        let paragraphs = [];
        let collecting = false;
        for (let element of entry.children) {
            if (element.classList.contains("has-large-font-size")) {
                collecting = true;
                continue;
            }
            if (element.classList.contains("crowdsignal-vote-wrapper")) {
                break;
            }
            if (collecting && element.tagName.toLowerCase() === "p") {
                let text = element.textContent?.trim();
                if (!util.isNullOrEmpty(text)) {
                    paragraphs.push(text);
                }
            }
        }
        return paragraphs.join("\n\n");
    }
}
