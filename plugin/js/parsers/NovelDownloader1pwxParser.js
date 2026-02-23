"use strict";

parserFactory.register("www.1pwx.com", () => new NovelDownloader1pwxParser());

class NovelDownloader1pwxParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocLink = dom.querySelector(".viewalllinks");
        if (!tocLink) {
            return [];
        }
        let tocDom = (await HttpClient.wrapFetch(tocLink.href)).responseXML;
        let sections = [...tocDom.querySelectorAll("div.dirtitone > h2")];
        let links = [...tocDom.querySelectorAll("div.clearfix li > a")];
        let currentArc = null;
        return links.map(link => {
            let arc = getSectionNameForLink(link, sections);
            let newArc = (arc && arc !== currentArc) ? arc : null;
            currentArc = arc || currentArc;
            return util.hyperLinkToChapter(link, newArc);
        });
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".r420 > h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".author a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector(".bookintro");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".con_limg > img");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            rm("div", true, element);
            rm("script", true, element);
            element.innerHTML = element.innerHTML.replace(/\n/g, "<br/><br/>");
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }
}

function getSectionNameForLink(link, sections) {
    let name = null;
    for (const section of sections) {
        if (section.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING) {
            name = (section.textContent || "").trim();
        } else {
            break;
        }
    }
    return name;
}

function rm(selector, deep, dom) {
    if (!dom) {
        return;
    }
    let nodes = dom.querySelectorAll(selector);
    nodes.forEach(node => {
        if (deep) {
            node.remove();
        } else if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    });
}
