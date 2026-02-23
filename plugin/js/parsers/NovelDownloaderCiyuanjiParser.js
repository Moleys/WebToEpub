"use strict";

/* global CryptoJS */

parserFactory.register("www.ciyuanji.com", () => new NovelDownloaderCiyuanjiParser());

class NovelDownloaderCiyuanjiParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 500;
    }

    async getChapterUrls(dom) {
        let data = getNextData(dom);
        let book = data?.props?.pageProps?.book;
        let bookChapter = data?.props?.pageProps?.bookChapter;
        let bookId = book?.bookId;
        let chapterList = bookChapter?.chapterList || [];
        if (!bookId || chapterList.length === 0) {
            return [];
        }
        let chapters = [];
        let currentArc = null;
        for (const chapter of chapterList) {
            let sectionName = chapter.title || null;
            let newArc = (sectionName && sectionName !== currentArc) ? sectionName : null;
            if (sectionName) {
                currentArc = sectionName;
            }
            let chapterUrl = `${new URL(dom.baseURI).origin}/chapter/${bookId}_${chapter.chapterId}`;
            chapters.push({
                sourceUrl: chapterUrl,
                title: chapter.chapterName,
                newArc: newArc
            });
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        let data = getNextData(dom);
        let title = data?.props?.pageProps?.book?.bookName;
        return util.isNullOrEmpty(title) ? dom.querySelector("h1") : title;
    }

    extractAuthor(dom) {
        let data = getNextData(dom);
        let author = data?.props?.pageProps?.book?.authorName;
        if (!util.isNullOrEmpty(author)) {
            return author.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let data = getNextData(dom);
        let notes = data?.props?.pageProps?.book?.notes;
        if (!util.isNullOrEmpty(notes)) {
            return String(notes).trim();
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        let data = getNextData(dom);
        let cover = data?.props?.pageProps?.book?.imgUrl;
        return util.isNullOrEmpty(cover) ? util.getFirstImgSrc(dom, "img") : cover;
    }

    extractLanguage() {
        return "zh";
    }

    async fetchChapter(url) {
        let doc = (await HttpClient.wrapFetch(url)).responseXML;
        let dataElem = doc.querySelector("#__NEXT_DATA__");
        if (!dataElem || util.isNullOrEmpty(dataElem.textContent)) {
            return doc;
        }
        let data = JSON.parse(dataElem.textContent);
        let chapterObj = data?.props?.pageProps?.chapterContent?.chapter;
        let encrypted = chapterObj?.chapterContentFormat;
        if (util.isNullOrEmpty(encrypted)) {
            return doc;
        }

        let html = decryptChapterContent(encrypted);
        let content = doc.querySelector("#content");
        if (!content) {
            content = doc.createElement("div");
            content.id = "content";
            doc.body.appendChild(content);
        }
        content.innerHTML = html;
        return doc;
    }

    findChapterTitle(dom, webPage) {
        let title = dom.querySelector("h1");
        if (title) {
            return title;
        }
        return super.findChapterTitle(dom, webPage) ?? (webPage ? webPage.title : null);
    }
}

function getNextData(dom) {
    let dataElem = dom.querySelector("#__NEXT_DATA__");
    if (!dataElem || util.isNullOrEmpty(dataElem.textContent)) {
        return null;
    }
    try {
        return JSON.parse(dataElem.textContent);
    } catch (error) {
        return null;
    }
}

function decryptChapterContent(input) {
    let keyStr = "ZUreQN0Epkpxh3pooWOgixjTfPwumCTYWzYTQ7SMgDnqFLQ1s9tqpVhkGf02we89moQwhSQ07DVzc3LWupRgbVvm29aYeY7zyFN";
    let cleaned = input.replace(/\n/g, "");
    let key = CryptoJS.enc.Utf8.parse(keyStr);
    return CryptoJS.DES.decrypt(cleaned, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    }).toString(CryptoJS.enc.Utf8);
}
