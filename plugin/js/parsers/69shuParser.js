"use strict";

parserFactory.registerUrlRule(
    url => (util.extractHostName(url).includes("69shu")),
    () => new ShuParser()
);
parserFactory.register("69shuba.tw", () => new _69shuTwParser());
parserFactory.registerDeadSite("69yuedu.net", () => new _69yueduParser());

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

    extractSubject(dom) {
        let genres = [...dom.querySelectorAll(".booknav2 > p:nth-child(3) a")];

        let tagHeader = dom.querySelector(".tagtitle");
        if (tagHeader?.textContent == "标签") { 
            let tags = [...dom.querySelectorAll("#tagul a")];
            return [...genres, ...tags].map(e => e.textContent).join(", ");
        }

        return genres.map(e => e.textContent).join(", ");
    }

    extractDescription(dom) { // We only take the first p element that holds the description, the second one holds the story keywords.
        return dom.querySelector(".navtxt > p:nth-child(1)").textContent.trim(); 
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

class _69shuTwParser extends ShuParser {

    async getChapterUrls(dom) {
        // We need to access the href value from the book page `.book-op > tbody tr td:nth-child(2) a`, 
        // we then need to add it to our website url `https://69shuba.tw` + `/indexlist/344710/`, 
        // we then need to get the Toc, grab the list of Toc pages from `#indexselect-top` get the values from the options and add it to our base website url `https://69shuba.tw` + `/indexlist/344710/`, 
        // we then need to move through all the Toc pages and grab the list of chapters under `.last9 li` without including `.title`, 
        // and then build their urls too `/read/344710/1368690`.   
        let base = "https://69shuba.tw";
        
        let tocRel = dom.querySelector(".book-op > tbody tr td:nth-child(2) a").getAttribute("href");
        let tocUrl = new URL(tocRel, base).href;

        let tocDom = (await HttpClient.wrapFetch(tocUrl)).responseXML;

        let pageUrls = [...tocDom.querySelectorAll("#indexselect-top option")]
            .map(o => new URL(o.value, base).href);

        let chapters = [];

        for (let pageUrl of pageUrls) {
            let pageDom = (await HttpClient.wrapFetch(pageUrl)).responseXML;

            let links = [...pageDom.querySelectorAll(".last9 li:not(.title) a")];

            chapters.push(...links.map(a => util.hyperLinkToChapter(a)));
        }

        return chapters;
    }
}
