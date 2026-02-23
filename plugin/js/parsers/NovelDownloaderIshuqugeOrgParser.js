"use strict";

parserFactory.register("ishuquge.org", () => new NovelDownloaderIshuqugeOrgParser());

class NovelDownloaderIshuqugeOrgParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("#list") || dom.querySelector(".listmain") || dom.querySelector(".book-item");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("#info h1, .info h2, .info h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("#info > p:nth-child(2), #info > div:nth-child(2), .info .author, .small > span:nth-child(1), .info .fix > p:nth-child(1)");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("#intro, .intro, .book-intro, .desc");
        if (introDom != null) {
            let introClone = introDom.cloneNode(true);
            this.applyIntroPatch(introClone);
            return introClone.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#fmimg > img, .info > .cover > img, .book-boxs > .img > img, .imgbox > img");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            this.applyContentPatch(element);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    applyIntroPatch(introDom) {
        let doc = introDom.ownerDocument || document;
        let noshow = doc.querySelector(".noshow");
        if (noshow) {
            noshow.classList.remove("noshow");
        }
        let showall = doc.querySelector(".showall");
        if (showall) {
            showall.innerHTML = "";
        }
        rms([
            new RegExp("\\u4f5c\\u8005\\uff1a.+\\u6240\\u5199\\u7684\\u300a.+\\u300b\\u65e0\\u5f39\\u7a97\\u514d\\u8d39\\u5168\\u6587\\u9605\\u8bfb\\u4e3a\\u8f6c\\u8f7d\\u4f5c\\u54c1,\\u7ae0\\u8282\\u7531\\u7f51\\u53cb\\u53d1\\u5e03\\u3002"),
            new RegExp("\\u63a8\\u8350\\u5730\\u5740\\uff1ahttps?:\\/\\/www\\.ishuquge\\.org\\/txt\\/\\d+\\/index\\.html", "g")
        ], introDom);
        return introDom;
    }

    applyContentPatch(content) {
        rm2(["\u8bf7\u8bb0\u4f4f\u672c\u4e66\u9996\u53d1\u57df\u540d\uff1a", "www.ishuquge.org"], content);
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

function rms(filters, dom) {
    for (const ad of filters) {
        if (typeof ad === "string") {
            dom.innerHTML = dom.innerHTML.split(ad).join("");
        } else if (ad instanceof RegExp) {
            dom.innerHTML = dom.innerHTML.replace(ad, "");
        }
    }
    return dom;
}
