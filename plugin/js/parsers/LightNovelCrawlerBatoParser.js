"use strict";

parserFactory.register("bato.to", () => new LightNovelCrawlerBatoParser());
parserFactory.register("batocc.com", () => new LightNovelCrawlerBatoParser());
parserFactory.register("batotoo.com", () => new LightNovelCrawlerBatoParser());
parserFactory.register("batotwo.com", () => new LightNovelCrawlerBatoParser());
parserFactory.register("battwo.com", () => new LightNovelCrawlerBatoParser());
parserFactory.register("comiko.net", () => new LightNovelCrawlerBatoParser());
parserFactory.register("dto.to", () => new LightNovelCrawlerBatoParser());
parserFactory.register("hto.to", () => new LightNovelCrawlerBatoParser());
parserFactory.register("mangatoto.com", () => new LightNovelCrawlerBatoParser());
parserFactory.register("mangatoto.net", () => new LightNovelCrawlerBatoParser());
parserFactory.register("mangatoto.org", () => new LightNovelCrawlerBatoParser());
parserFactory.register("mto.to", () => new LightNovelCrawlerBatoParser());
parserFactory.register("wto.to", () => new LightNovelCrawlerBatoParser());


class LightNovelCrawlerBatoParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        const selector = ".main a.chapt";
        if (!selector) {
            return util.hyperlinksToChapterList(dom.body || dom.documentElement);
        }
        let nodes = [...dom.querySelectorAll(selector)];
        let links = nodes.map(node => (node.tagName === "A") ? node : node.querySelector("a"))
            .filter(a => a && a.href);
        let chapters = links.map(a => util.hyperLinkToChapter(a));
        if (true) {
            chapters = chapters.reverse();
        }
        
        if (chapters.length === 0) {
            chapters = await this.fetchChapterUrlsFromAjax(dom, true);
        }
        return chapters;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    findChapterTitle(dom, webPage) {
        let title = (() => {
            const selector = null;
            return selector ? dom.querySelector(selector) : null;
                        
        })();
        return title ?? (webPage ? webPage.title : null);
    }

    extractTitleImpl(dom) {
        const selector = "h3.item-title";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        let authorLabel = [...dom.querySelectorAll("b")]
            .find(e => (e.textContent || "").trim() === "Authors:");
        if (authorLabel?.parentElement?.querySelector("span")) {
            return authorLabel.parentElement.querySelector("span").textContent.trim();
        }
        return super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector(".attr-cover img");
        if (img) {
            return img.getAttribute("data-src") || img.src || img.getAttribute("src");
        }
        return super.findCoverImageUrl(dom);
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        let script = [...chapterDom.querySelectorAll("script")]
            .find(s => /const imgHttps = \[/.test(s.textContent || ""));
        if (!script) {
            return chapterDom;
        }
        let text = script.textContent || "";
        let imgMatch = /const imgHttps = ([\s\S]*?);/.exec(text);
        let passMatch = /const batoPass = ([\s\S]*?);/.exec(text);
        let wordMatch = /const batoWord = ([\s\S]*?);/.exec(text);
        if (!imgMatch || !passMatch || !wordMatch) {
            return chapterDom;
        }
        let imgList = JSON.parse(imgMatch[1]);
        let batoPass = LightNovelCrawlerBatoParser.decodePass(passMatch[1]);
        let batoWord = wordMatch[1].trim();
        if ((batoWord.startsWith("\"") && batoWord.endsWith("\"")) ||
            (batoWord.startsWith("'") && batoWord.endsWith("'"))) {
            batoWord = batoWord.slice(1, -1);
        }

        let queryArgs = [];
        try {
            let decrypted = LightNovelCrawlerBatoParser.decrypt(batoWord, batoPass);
            queryArgs = JSON.parse(decrypted);
        } catch (error) {
            queryArgs = [];
        }

        let imageUrls;
        if (queryArgs.length === imgList.length) {
            imageUrls = imgList.map((img, index) => `<img src="${img}?${queryArgs[index]}" alt="img">`);
        } else {
            imageUrls = imgList.map(img => `<img src="${img}" alt="img">`);
        }
        let html = "<p>" + imageUrls.join("</p><p>") + "</p>";
        return LightNovelCrawlerBatoParser.textToDoc(html, url);
    }

    static decodePass(code) {
        let cleaned = code.trim();
        if ((cleaned.startsWith("\"") && cleaned.endsWith("\"")) ||
            (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
            cleaned = cleaned.slice(1, -1);
        }
        cleaned = cleaned.replace("!+[]", "1").replace("!![]", "1").replace("[]", "0");
        while (cleaned.startsWith("+")) {
            cleaned = cleaned.slice(1);
        }
        cleaned = cleaned.replace("(+", "(").split(" ").join("");
        cleaned = cleaned.replace("+((1+[+1]+(1+0)[1+1+1]+[1+1]+[+0])+0)[+1]+", ".");
        cleaned = cleaned.replace("]+[", " ").replace("[", "").replace("]", "");
        let res = "";
        for (let numPart of cleaned.split(".")) {
            for (let num of numPart.split(" ")) {
                if (num.length > 0) {
                    res += String(num.split("1").length - 1);
                }
            }
            res += ".";
        }
        return res.replace(/\.$/, "");
    }

    static decrypt(encrypted, passphrase) {
        let decrypted = CryptoJS.AES.decrypt(encrypted, passphrase);
        return decrypted.toString(CryptoJS.enc.Utf8);
    }

    static textToDoc(html, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        newDoc.content.innerHTML = html || "";
        return newDoc.dom;
    }

    getInformationEpubItemChildNodes(dom) {
        const selector = null;
        return selector ? [...dom.querySelectorAll(selector)] : [];
    }

    removeUnwantedElementsFromContentElement(element) {
        const removeSelectors = [];
        const removeTags = [];
        for (let selector of removeSelectors) {
            util.removeChildElementsMatchingSelector(element, selector);
        }
        for (let tag of removeTags) {
            util.removeElements(element.querySelectorAll(tag));
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

}

