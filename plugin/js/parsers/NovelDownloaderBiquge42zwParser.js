"use strict";

parserFactory.register("www.42zw.la", () => new NovelDownloaderBiquge42zwParser());

class NovelDownloaderBiquge42zwParser extends Parser {
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
        rm("div#content > p:first-child", false, content);
        rms([
            "\u9996\u53d1\u7f51\u5740\uff08\uff48\uff54\uff54ps://m.42zw.la",
            "\u8bb0\u4f4f\u7f51\u5740m.42zw\uff0ela",
            "\u4e00\u79d2\u8bb0\u4f4f\uff48\uff54\uff54\uff50s://\uff4d\uff0e42zw.la",
        ], content);
        rm("br", true, content);
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


