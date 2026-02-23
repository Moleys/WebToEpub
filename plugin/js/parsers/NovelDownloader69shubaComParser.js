"use strict";

parserFactory.register("www.69shuba.com", () => new NovelDownloader69shubaComParser());

class NovelDownloader69shubaComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocUrl = dom.querySelector("a.btn.more-btn[href]")?.href;
        if (util.isNullOrEmpty(tocUrl)) {
            return [];
        }
        let tocDom = (await HttpClient.wrapFetch(tocUrl, { makeTextDecoder: () => new TextDecoder("gbk") })).responseXML;
        let menu = tocDom.querySelector("#catalog ul");
        if (menu == null) {
            return [];
        }
        return util.hyperlinksToChapterList(menu).reverse();
    }

    findContent(dom) {
        return dom.querySelector(".txtnav");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".booknav2 > p:nth-child(3) > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector(".content");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".bookimg2 > img");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            rm(".hide720, .txtright, .bottom-ad", true, element);
            rm2([/^[\u4e00-\u9fa5]{0,1}$/gm], element);

            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
            const nodesToReplace = [];
            while (walker.nextNode()) {
                const node = walker.currentNode;
                if (node.parentNode && node.parentNode.nodeName !== "P" && node.textContent && node.textContent.trim() !== "") {
                    nodesToReplace.push(node);
                }
            }
            nodesToReplace.forEach((node) => {
                const p = document.createElement("p");
                p.textContent = node.textContent;
                if (node.parentNode) {
                    node.parentNode.replaceChild(p, node);
                }
            });

            const paragraphs = element.querySelectorAll("p");
            const brRegex = /<br\s*\/?>/i;
            paragraphs.forEach((p) => {
                if (brRegex.test(p.innerHTML)) {
                    const parts = p.innerHTML.split(brRegex);
                    const fragment = document.createDocumentFragment();
                    parts.forEach((part) => {
                        const newP = document.createElement("p");
                        newP.innerHTML = part.trim();
                        if (newP.innerHTML !== "") {
                            fragment.appendChild(newP);
                        }
                    });
                    if (p.parentNode) {
                        p.parentNode.replaceChild(fragment, p);
                    }
                }
            });
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    async fetchChapter(url) {
        return (await HttpClient.wrapFetch(url, { makeTextDecoder: () => new TextDecoder("gbk") })).responseXML;
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

