"use strict";

parserFactory.register("lmebooks.com", () => new NovelDownloaderKanunu8LmebooksParser());

class NovelDownloaderKanunu8LmebooksParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let list = getChapterList(dom);
        let links = list.links;
        let sections = list.sections;
        let currentArc = null;
        return links.map(link => {
            let arc = getSectionNameForLink(link, sections);
            let newArc = (arc && arc !== currentArc) ? arc : null;
            currentArc = arc || currentArc;
            return util.hyperLinkToChapter(link, newArc);
        });
    }

    findContent(dom) {
        let content = findContentBySelectors(dom, [
            "#content",
            "#htmlContent",
            "#booktxt",
            "#txtContent",
            ".content",
            ".chapter-content",
            ".article-content"
        ]);
        if (content) {
            return content;
        }
        return findLargestTextElement(dom, ["div", "td", "article", "section"]);
    }

    extractTitleImpl(dom) {
        let title = dom.title ? dom.title.split(" ")[0] : null;
        if (title && title.trim().length > 0) {
            let h1 = dom.createElement("h1");
            h1.textContent = title.trim();
            return h1;
        }
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLinks = [...dom.querySelectorAll("a")].filter(a =>
            (a.href.includes("writer") || a.href.includes("/zj/")) && a.href.includes(".html")
        );
        let authorLabel = authorLinks[0];
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent
                .replace("\u4f5c\u54c1\u96c6", "")
                .replace("\u2192", "")
                .replace("\u4f5c\u8005: ", "")
                .replace("\u4f5c\u8005\uff1a", "")
                .trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = findLargestTextElement(dom, ["td", "p"]);
        if (introDom) {
            rm("a", true, introDom);
            return introDom.textContent.trim();
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        let host = new URL(dom.baseURI).hostname;
        let images = [...dom.querySelectorAll("img")]
            .filter(img => {
                try {
                    return new URL(img.src, dom.baseURI).hostname === host;
                } catch (error) {
                    return false;
                }
            });
        if (images.length === 1) {
            return images[0].src;
        }
        return util.getFirstImgSrc(dom, "img");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            rm("a", true, element);
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

function getChapterList(dom) {
    function aListFilter(a) {
        const filters1 = ["writer", "/zj/", "index.html"];
        const filters2 = [".html"];
        for (const f of filters1) {
            if ((a.href || "").includes(f)) {
                return false;
            }
        }
        for (const f of filters2) {
            if (!(a.href || "").includes(f)) {
                return false;
            }
        }
        return true;
    }

    if (dom.querySelector(".mulu-list ul > li > a")) {
        return {
            links: [...dom.querySelectorAll(".mulu-list ul > li > a")].filter(aListFilter),
            sections: [...dom.querySelectorAll(".mulu-title > h2")]
        };
    }

    if (dom.querySelector("div.book")) {
        return {
            links: [...dom.querySelectorAll("div.book a")].filter(aListFilter),
            sections: [...dom.querySelectorAll("div.book dl > dt, div.book td > strong")]
        };
    }

    let tables = [...dom.querySelectorAll("table")];
    let best = null;
    let bestCount = 0;
    for (const table of tables) {
        let count = [...table.querySelectorAll("a")].filter(aListFilter).length;
        if (count > bestCount) {
            bestCount = count;
            best = table;
        }
    }
    if (best) {
        return {
            links: [...best.querySelectorAll("a")].filter(aListFilter),
            sections: [...best.querySelectorAll('td[align="center"]')]
        };
    }

    return { links: [], sections: [] };
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

function findContentBySelectors(dom, selectors) {
    for (const selector of selectors) {
        let element = dom.querySelector(selector);
        if (element) {
            return element;
        }
    }
    return null;
}

function findLargestTextElement(dom, selectors) {
    let best = null;
    let bestLen = 0;
    for (const selector of selectors) {
        for (const elem of dom.querySelectorAll(selector)) {
            let text = (elem.textContent || "").trim();
            if (text.length > bestLen) {
                best = elem;
                bestLen = text.length;
            }
        }
    }
    return best;
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
