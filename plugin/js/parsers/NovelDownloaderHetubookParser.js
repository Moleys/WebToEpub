"use strict";

parserFactory.register("hetubook.com", () => new NovelDownloaderHetubookParser());

class NovelDownloaderHetubookParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 500;
    }

    async getChapterUrls(dom) {
        let dir = dom.querySelector("#dir");
        if (!dir) {
            return [];
        }
        let nodes = Array.from(dir.childNodes);
        let chapters = [];
        let pendingArc = null;
        for (const node of nodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) {
                continue;
            }
            if (node.nodeName === "DT") {
                pendingArc = (node.textContent || "").trim();
                let a = node.querySelector("a");
                if (a) {
                    chapters.push(util.hyperLinkToChapter(a, pendingArc));
                    pendingArc = null;
                }
            } else if (node.nodeName === "DD") {
                let a = node.firstElementChild;
                if (a && a.tagName === "A") {
                    chapters.push(util.hyperLinkToChapter(a, pendingArc));
                    pendingArc = null;
                }
            }
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".book_info > h2");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".book_info > div:nth-child(3) > a:nth-child(1)");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector(".intro");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".book_info > img");
    }

    async fetchChapter(url) {
        let doc = (await HttpClient.wrapFetch(url)).responseXML;
        await this.sortChapter(doc, url);
        return doc;
    }

    async sortChapter(doc, chapterUrl) {
        if (!chapterUrl.match(/\/(book[0-9]?)\/(\d+)\/(\d+)\.html/)) {
            return;
        }
        let path = RegExp.$1;
        let bid = RegExp.$2;
        let sid = RegExp.$3;
        let origin = new URL(chapterUrl).origin;
        let tokenUrl = `${origin}/${path}/${bid}/r${sid}.json`;
        let response = await fetch(tokenUrl, {
            headers: {
                accept: "*/*",
                "cache-control": "no-cache",
                "content-type": "application/x-www-form-urlencoded",
                pragma: "no-cache",
                "x-requested-with": "XMLHttpRequest"
            },
            referrer: chapterUrl,
            method: "GET",
            mode: "cors",
            credentials: "include"
        });
        let token = response.headers.get("token");
        if (!token) {
            return;
        }
        let tokenDict = atob(token)
            .split(/[A-Z]+%/)
            .map(v => parseInt(v, 10));

        let body = doc.querySelector("#content");
        if (!body) {
            return;
        }
        rm(".mask.mask2", false, body);
        let startIndex = 0;
        for (let i = 0; i < body.childNodes.length; i++) {
            if (body.childNodes[i].nodeName === "H2") {
                startIndex = i + 1;
            }
            if (body.childNodes[i].nodeName === "DIV" && body.childNodes[i].className !== "chapter") {
                break;
            }
        }
        let thisChildNode = [];
        let b = 0;
        for (let i = 0; i < tokenDict.length; i++) {
            if (tokenDict[i] < 5) {
                thisChildNode[tokenDict[i]] = body.childNodes[i + startIndex];
                b++;
            } else {
                thisChildNode[tokenDict[i] - b] = body.childNodes[i + startIndex];
            }
        }
        for (const childNode of thisChildNode) {
            if (!childNode) {
                continue;
            }
            body.appendChild(childNode);
        }
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            let tags = "h2, acronym, bdo, big, cite, code, dfn, kbd, q, s, samp, strike, tt, u, var";
            tags.split(", ").forEach(tag => rm(tag, true, element));
            Array.from(element.querySelectorAll("div")).forEach(oldNode => {
                let p = element.ownerDocument.createElement("p");
                p.innerHTML = oldNode.innerHTML;
                oldNode.parentNode?.replaceChild(p, oldNode);
            });
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
