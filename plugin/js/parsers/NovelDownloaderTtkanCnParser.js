"use strict";

parserFactory.register("cn.ttkan.co", () => new NovelDownloaderTtkanCnParser());

class NovelDownloaderTtkanCnParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 500;
    }

    async getChapterUrls(dom) {
        let host = new URL(dom.baseURI).hostname;
        let novelId = this.extractNovelId(dom.baseURI);
        if (!novelId) {
            return [];
        }
        let language = host.split(".")[0] === "tw" ? "tw" : "cn";
        let tocUrl = `https://${host}/api/nq/amp_novel_chapters?language=${language}&novel_id=${novelId}&__amp_source_origin=https%3A%2F%2Fwww.ttkan.co`;
        let response = await HttpClient.fetchJson(tocUrl, {
            headers: {
                Accept: "application/json",
                "AMP-Same-Origin": "true"
            },
            credentials: "include"
        });
        let data = response.json;
        if (!data || !Array.isArray(data.items)) {
            return [];
        }
        return data.items.map(item => {
            let a = dom.createElement("a");
            a.href = `https://${host}/novel/user/page_direct?novel_id=${novelId}&page=${item.chapter_id}`;
            a.textContent = item.chapter_name;
            return util.hyperLinkToChapter(a);
        });
    }

    extractNovelId(url) {
        let parts = new URL(url).pathname.split("/").filter(a => a.length > 0);
        if (parts.length >= 3) {
            return parts[2];
        }
        if (parts.length >= 1) {
            return parts[parts.length - 1];
        }
        return null;
    }

    findContent(dom) {
        return dom.querySelector(".content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".novel_info h1") || dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let meta = dom.querySelector('meta[name="og:novel:author"]');
        if (meta) {
            return meta.getAttribute("content");
        }
        let authorLabel = dom.querySelector(".novel_info a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let desc = dom.querySelector(".description");
        return desc?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        let meta = dom.querySelector('meta[property="og:image"]');
        if (meta) {
            return meta.getAttribute("content");
        }
        return util.getFirstImgSrc(dom, ".novel_info img, .novel_info amp-img");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            rm("a", true, element);
            rm2([/ttkan/i], element);
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

function rm2(filters, dom) {
    function doRemove(nodes) {
        Array.from(nodes.childNodes).forEach(node => {
            let text = node.nodeName === "#text"
                ? (node.textContent || "")
                : (node.innerText || "");
            if (text.length < 200 || node.nodeName === "#text") {
                for (const filter of filters) {
                    if (filter instanceof RegExp) {
                        if (filter.test(text)) {
                            node.remove();
                        }
                    } else if (typeof filter === "string") {
                        if (text.includes(filter)) {
                            node.remove();
                        }
                    }
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                doRemove(node);
            }
        });
    }
    doRemove(dom);
}
