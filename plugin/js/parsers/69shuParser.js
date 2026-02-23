"use strict";

parserFactory.registerUrlRule(
    url => (util.extractHostName(url).includes("69shu")),
    () => new ShuParser()
);
parserFactory.register("69yuedu.net", () => new _69yueduParser());

class ShuParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 1000;
    }

    async getChapterUrls(dom) {
        let tocUrl = dom.querySelector("a.more-btn").href;
        let toc = (await HttpClient.wrapFetch(tocUrl, this.makeOptions())).responseXML;
        let menu = toc.querySelector("#catalog ul");
        return util.hyperlinksToChapterList(menu).reverse();
    }

    findContent(dom) {
        return dom.querySelector("div.txtnav");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.booknav2 h1").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.bookbox");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelectorAll(".booknav2 a")[1];
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractLanguage() {
        return "zh";
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".txtinfo, #txtright, .bottom-ad");
        super.removeUnwantedElementsFromContentElement(element);
    }

    async fetchChapter(url) {
        // site does not tell us gb18030 is used to encode text
        return (await HttpClient.wrapFetch(url, this.makeOptions())).responseXML;
    }

    makeOptions() {
        return ({
            makeTextDecoder: () => new TextDecoder("gb18030")
        });
    }
}

class _69yueduParser extends ShuParser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocUrl = this.findTocUrl(dom);
        if (util.isNullOrEmpty(tocUrl)) {
            return [];
        }
        let toc = (await HttpClient.wrapFetch(tocUrl, this.makeOptions())).responseXML;
        let menu = toc.querySelector("#chapters ul");
        if (menu != null) {
            return util.hyperlinksToChapterList(menu);
        }
        menu = toc.querySelector("#catalog ul");
        if (menu != null) {
            return util.hyperlinksToChapterList(menu).reverse();
        }
        return [];
    }

    findTocUrl(dom) {
        let tocLink = dom.querySelector(".addbtn a.btn[href^='/chapters/']")
            || dom.querySelector(".addbtn a.btn[href]")
            || dom.querySelector("a.btn[href]")
            || dom.querySelector("a.more-btn[href]");
        return tocLink ? tocLink.href : null;
    }

    makeOptions() {
        return ({
            makeTextDecoder: () => new TextDecoder("gbk")
        });
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findContent(dom) {
        return dom.querySelector("div.content") || dom.querySelector("div.txtnav");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            util.removeChildElementsMatchingSelector(element, ".txtright, .bottom-ad");
            wrapTextNodesInParagraphs(element);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }
}

function wrapTextNodesInParagraphs(content) {
    let walker = content.ownerDocument.createTreeWalker(
        content,
        NodeFilter.SHOW_TEXT,
        null
    );
    let nodesToReplace = [];
    while (walker.nextNode()) {
        let node = walker.currentNode;
        if (node.parentNode && node.parentNode.nodeName !== "P") {
            let text = node.textContent || "";
            if (text.trim() !== "") {
                nodesToReplace.push(node);
            }
        }
    }
    nodesToReplace.forEach(node => {
        let p = content.ownerDocument.createElement("p");
        p.textContent = node.textContent || "";
        node.parentNode.replaceChild(p, node);
    });
}
