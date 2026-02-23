"use strict";

parserFactory.register("101kanshu.com", () => new NovelDownloader101kanshuParser());

class NovelDownloader101kanshuParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocUrl = this.buildTocUrl(dom.baseURI);
        if (!tocUrl) {
            return [];
        }
        let tocDom = (await HttpClient.wrapFetch(tocUrl)).responseXML;
        let links = [...tocDom.querySelectorAll("a")]
            .filter(a => a.href && /\/book\/\d+\/\d+\.html/.test(a.href));
        if (links.length === 0) {
            return util.hyperlinksToChapterList(tocDom.body);
        }
        return links.map(link => util.hyperLinkToChapter(link));
    }

    buildTocUrl(url) {
        let match = url.match(/\/book\/(\d+)\.html/);
        if (!match) {
            return null;
        }
        return `https://101kanshu.com/ajax_novels/chapterlist/${match[1]}.html`;
    }

    findContent(dom) {
        return dom.querySelector("div#txtcontent");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.bookbox h1, h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.booknav2 p");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("div.navtxt p");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.bookimg2 img");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            this.applyContentPatch(element);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    applyContentPatch(content) {
        rm("div.txtad", true, content);
        rm("script", true, content);
        content.innerHTML = content.innerHTML.replace(/<br><br>/g, "<br>");
        htmlTrim(content);
        return content;
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }
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

function htmlTrim(dom) {
    let nodes = Array.from(dom.childNodes);
    trimNodes(nodes);
    let reversed = Array.from(dom.childNodes).reverse();
    trimNodes(reversed);

    function trimNodes(list) {
        for (const node of list) {
            if (node.nodeType === Node.TEXT_NODE) {
                if ((node.textContent || "").trim() === "") {
                    node.remove();
                    continue;
                } else {
                    break;
                }
            }
            if (node.nodeName === "BR") {
                node.remove();
                continue;
            }
            if (node.nodeName === "P" && (node.textContent || "").trim() === "") {
                node.remove();
                continue;
            }
            if (node.nodeType === Node.ELEMENT_NODE) {
                break;
            }
        }
    }
}
