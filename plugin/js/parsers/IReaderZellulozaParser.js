"use strict";

parserFactory.register("zelluloza.ru", () => new IReaderZellulozaParser());

class IReaderZellulozaParser extends Parser {
    constructor() {
        super();
        this.baseUrl = "https://zelluloza.ru";
    }

    async getChapterUrls(dom) {
        let chapters = [];
        let index = 0;
        for (let element of [...dom.querySelectorAll("ul.g0 div.w800_m")]) {
            let isFree = element.querySelector("div.chaptfree") != null;
            if (!isFree) {
                continue;
            }
            let link = element.querySelector("a.chptitle");
            let name = link?.textContent?.trim() ?? "";
            let href = link?.getAttribute("href") ?? "";
            let path = IReaderZellulozaParser.extractChapterPath(href);
            if (!util.isNullOrEmpty(name) && !util.isNullOrEmpty(path)) {
                chapters.push({
                    sourceUrl: `${this.baseUrl}/${path}`,
                    title: name,
                    number: index + 1
                });
                index += 1;
            }
        }
        return chapters;
    }

    static extractChapterPath(href) {
        if (util.isNullOrEmpty(href)) {
            return "";
        }
        let match = href.match(/\/books\/(\d+)\/(\d+)/);
        if (match?.[1] && match?.[2]) {
            return `books/${match[1]}/${match[2]}`;
        }
        let parts = href.split("/").filter(Boolean);
        if (parts.length >= 3) {
            return parts.slice(-2).join("/");
        }
        return "";
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom) || dom.body || dom.documentElement;
    }

    extractTitleImpl(dom) {
        const selector = "h2.bookname";
        return selector ? dom.querySelector(selector) : super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        const selector = ".author_link";
        let author = selector ? dom.querySelector(selector)?.textContent?.trim() : null;
        return util.isNullOrEmpty(author) ? super.extractAuthor(dom) : author;
    }

    extractDescription(dom) {
        let full = dom.querySelector("#bann_full")?.textContent?.trim();
        if (!util.isNullOrEmpty(full)) {
            return full;
        }
        return dom.querySelector("#bann_short")?.textContent?.trim() ?? "";
    }

    extractSubject(dom) {
        return [...dom.querySelectorAll(".gnres span[itemprop=genre]")]
            .map(e => e.textContent?.trim())
            .filter(t => !util.isNullOrEmpty(t))
            .join(", ");
    }

    findCoverImageUrl(dom) {
        const selector = "img.shadow";
        let img = selector ? dom.querySelector(selector) : null;
        let src = img?.getAttribute("src");
        if (util.isNullOrEmpty(src)) {
            return super.findCoverImageUrl(dom);
        }
        return src.startsWith("http") ? src : `${this.baseUrl}${src}`;
    }

    async fetchChapter(url) {
        let parts = new URL(url).pathname.split("/").filter(Boolean);
        if (parts.length < 3) {
            return (await HttpClient.wrapFetch(url)).responseXML;
        }
        let bookId = parts[1];
        let chapterId = parts[2];
        let params = new URLSearchParams();
        params.append("op", "getbook");
        params.append("par1", bookId);
        params.append("par2", chapterId);
        let response = await HttpClient.wrapFetchImpl(`${this.baseUrl}/ajaxcall/`, {
            responseHandler: new FetchTextResponseHandler(),
            fetchOptions: {
                method: "POST",
                credentials: "include",
                body: params
            }
        });

        let encryptedLines = response.split("<END>")[0]?.split("\n") ?? [];
        let decrypted = encryptedLines
            .map(line => line.trim())
            .filter(line => !util.isNullOrEmpty(line))
            .map(line => IReaderZellulozaParser.decrypt(line))
            .join("")
            .replace(/\r/g, "")
            .trim();

        let formatted = decrypted
            .replace(/\[\*]([\s\S]*?)\[\/]/g, "<b>$1</b>")
            .replace(/\[_]([\s\S]*?)\[\/]/g, "<u>$1</u>")
            .replace(/\[-]([\s\S]*?)\[\/]/g, "<s>$1</s>")
            .replace(/\[~]([\s\S]*?)\[\/]/g, "<i>$1</i>");

        let newDoc = Parser.makeEmptyDocForContent(url);
        util.parseHtmlAndInsertIntoContent(formatted, newDoc.content);
        return newDoc.dom;
    }

    static decrypt(encrypted) {
        if (util.isNullOrEmpty(encrypted)) {
            return "";
        }
        let hexArray = [];
        for (let i = 0; i < encrypted.length - 1; i += 2) {
            let first = IReaderZellulozaParser.alphabet[encrypted[i]];
            let second = IReaderZellulozaParser.alphabet[encrypted[i + 1]];
            if (first == null || second == null) {
                return "";
            }
            hexArray.push(first + second);
        }
        let decoded = hexArray.map(hex => {
            let code = parseInt(hex, 16);
            if (Number.isNaN(code)) {
                return "";
            }
            return String.fromCharCode(code);
        }).join("");
        return `<p>${decoded}</p>`;
    }
}

IReaderZellulozaParser.alphabet = {
    "~": "0",
    "H": "1",
    "^": "2",
    "@": "3",
    "f": "4",
    "0": "5",
    "5": "6",
    "n": "7",
    "r": "8",
    "=": "9",
    "W": "a",
    "L": "b",
    "7": "c",
    " ": "d",
    "u": "e",
    "c": "f"
};
