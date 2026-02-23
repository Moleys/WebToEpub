"use strict";

parserFactory.register("www.biquge66.com", () => new NovelDownloaderWwwBiquge66ComParser());

class NovelDownloaderWwwBiquge66ComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("#list dd > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("#info > h1:nth-child(1)");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("#info > p:nth-child(2)");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("#intro");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#fmimg > img");
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        decryptXkzwChapter(chapterDom);
        return chapterDom;
    }

    findChapterTitle(dom, webPage) {
        let title = dom.querySelector(".bookname > h1:nth-child(1)");
        if (title != null) {
            return title;
        }
        return super.findChapterTitle(dom, webPage) ?? (webPage ? webPage.title : null);
    }
}

function decryptXkzwChapter(dom) {
    const obj = dom.getElementById("other");
    if (!obj) {
        return;
    }
    let content = (obj.innerHTML || "").trim();
    if (content.length === 0) {
        return;
    }
    const type = parseInt(content.substring(0, 1), 10);
    let key;
    let iv;
    let body;
    if (type === 1) {
        key = content.substring(1, 9);
        iv = content.substring(9, 17);
        body = content.substring(17);
        obj.innerHTML = decryptDes(body, key, iv);
    } else if (type === 2) {
        key = content.substring(1, 33);
        iv = content.substring(33, 49);
        body = content.substring(49);
        obj.innerHTML = decryptAes(body, key, iv);
    } else if (type === 3) {
        key = content.substring(1, 9);
        iv = content.substring(9, 17);
        body = content.substring(17);
        obj.innerHTML = decryptRc4(body, key, iv);
    } else {
        key = content.substring(1, 25);
        iv = content.substring(25, 33);
        body = content.substring(33);
        obj.innerHTML = decryptTripleDes(body, key, iv);
    }
    obj.style.display = "block";
    const tips = dom.getElementById("contenttips");
    if (tips) {
        tips.remove();
    }
}

function decryptDes(str, keyStr, ivStr) {
    const key = CryptoJS.enc.Utf8.parse(keyStr);
    const iv = CryptoJS.enc.Utf8.parse(ivStr);
    const encryptedHexStr = CryptoJS.enc.Hex.parse(str);
    const srcs = CryptoJS.enc.Base64.stringify(encryptedHexStr);
    const decrypt = CryptoJS.DES.decrypt(srcs, key, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return decrypt.toString(CryptoJS.enc.Utf8);
}

function decryptAes(str, keyStr, ivStr) {
    const key = CryptoJS.enc.Utf8.parse(keyStr);
    const iv = CryptoJS.enc.Utf8.parse(ivStr);
    const encryptedHexStr = CryptoJS.enc.Hex.parse(str);
    const srcs = CryptoJS.enc.Base64.stringify(encryptedHexStr);
    const decrypt = CryptoJS.AES.decrypt(srcs, key, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return decrypt.toString(CryptoJS.enc.Utf8);
}

function decryptRc4(str, keyStr, ivStr) {
    const key = CryptoJS.enc.Utf8.parse(keyStr);
    const iv = CryptoJS.enc.Utf8.parse(ivStr);
    const encryptedHexStr = CryptoJS.enc.Hex.parse(str);
    const srcs = CryptoJS.enc.Base64.stringify(encryptedHexStr);
    const decrypt = CryptoJS.RC4.decrypt(srcs, key, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return decrypt.toString(CryptoJS.enc.Utf8);
}

function decryptTripleDes(str, keyStr, ivStr) {
    const key = CryptoJS.enc.Utf8.parse(keyStr);
    const iv = CryptoJS.enc.Utf8.parse(ivStr);
    const encryptedHexStr = CryptoJS.enc.Hex.parse(str);
    const srcs = CryptoJS.enc.Base64.stringify(encryptedHexStr);
    const decrypt = CryptoJS.TripleDES.decrypt(srcs, key, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return decrypt.toString(CryptoJS.enc.Utf8);
}

