"use strict";

parserFactory.register("www.xyb3.net", () => new NovelDownloaderBiqugeXyb3Parser());

class NovelDownloaderBiqugeXyb3Parser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("#list") || dom.querySelector(".listmain") || dom.querySelector(".book-item");
        let chapters = util.hyperlinksToChapterList(menu);
        
        return chapters;
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
            return authorLabel.textContent.replace(/作\s*者[：:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("#intro, .intro, .book-intro, .desc");
        if (introDom != null) {
            let introClone = introDom.cloneNode(true);
            this.applyIntroPatch(introClone, dom);
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

    applyIntroPatch(introDom, doc) {
        return;
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }

    applyContentPatch(content) {
        rm("script", true, content);
        rm("div[style]", true, content);
        rm("div[align]", true, content);
        rm2([
            "\u7531\u4e8e\u5404\u79cd\u95ee\u9898yb3.cc\u5730\u5740\u66f4\u6539\u4e3axyb3.net\u8bf7\u5927\u5bb6\u6536\u85cf\u65b0\u5730\u5740\u907f\u514d\u8ff7\u8def",
            "\u7f51\u9875\u7248\u7ae0\u8282\u5185\u5bb9\u6162\uff0c\u8bf7\u4e0b\u8f7d\u597d\u9605\u5c0f\u8bf4app\u9605\u8bfb\u6700\u65b0\u5185\u5bb9",
            "\u8bf7\u9000\u51fa\u8f6c\u7801\u9875\u9762\uff0c\u8bf7\u4e0b\u8f7d\u597d\u9605\u5c0f\u8bf4app \u9605\u8bfb\u6700\u65b0\u7ae0\u8282\u3002",
            "https://www.xyb3.net",
        ], content);
        return content;
    }
}

function rm(selector, all, dom) {
    if (all) {
        dom.querySelectorAll(selector).forEach(e => e.remove());
    } else {
        let element = dom.querySelector(selector);
        if (element != null) {
            element.remove();
        }
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


