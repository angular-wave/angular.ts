import { SanitizeUriProvider } from "./sanitize-uri.js";

describe("sanitizeUri", () => {
  let sanitizeHref;
  let sanitizeImg;
  let sanitizeUriProvider;
  let testUrl;
  let $$sanitizeUri;
  beforeEach(() => {
    sanitizeUriProvider = new SanitizeUriProvider();
    $$sanitizeUri = sanitizeUriProvider.$get[1](window);

    sanitizeHref = function (uri) {
      return $$sanitizeUri(uri, false);
    };
    sanitizeImg = function (uri) {
      return $$sanitizeUri(uri, true);
    };
  });

  function isEvilInCurrentBrowser(uri) {
    const a = document.createElement("a");
    a.setAttribute("href", uri);
    return a.href.substring(0, 4) !== "http";
  }

  describe("img[src] sanitization", () => {
    it("should sanitize javascript: urls", () => {
      testUrl = "javascript:doEvilStuff()";
      expect(sanitizeImg(testUrl)).toBe("unsafe:javascript:doEvilStuff()");
    });

    it("should sanitize javascript: urls with comments", () => {
      testUrl = "javascript:alert(1)//data:image/";
      expect(sanitizeImg(testUrl)).toBe(
        "unsafe:javascript:alert(1)//data:image/",
      );
    });

    it("should sanitize non-image data: urls", () => {
      testUrl = "data:application/javascript;charset=US-ASCII,alert('evil!');";
      expect(sanitizeImg(testUrl)).toBe(
        "unsafe:data:application/javascript;charset=US-ASCII,alert('evil!');",
      );

      testUrl = "data:,foo";
      expect(sanitizeImg(testUrl)).toBe("unsafe:data:,foo");
    });

    it("should sanitize mailto: urls", () => {
      testUrl = "mailto:foo@bar.com";
      expect(sanitizeImg(testUrl)).toBe("unsafe:mailto:foo@bar.com");
    });

    it("should sanitize obfuscated javascript: urls", () => {
      // case-sensitive
      testUrl = "JaVaScRiPt:doEvilStuff()";
      expect(sanitizeImg(testUrl)).toBe("unsafe:javascript:doEvilStuff()");

      // tab in protocol
      testUrl = "java\u0009script:doEvilStuff()";
      if (isEvilInCurrentBrowser(testUrl)) {
        expect(sanitizeImg(testUrl)).toEqual("unsafe:javascript:doEvilStuff()");
      }

      // space before
      testUrl = " javascript:doEvilStuff()";
      expect(sanitizeImg(testUrl)).toBe("unsafe:javascript:doEvilStuff()");

      // ws chars before
      testUrl = " \u000e javascript:doEvilStuff()";
      if (isEvilInCurrentBrowser(testUrl)) {
        expect(sanitizeImg(testUrl)).toEqual("unsafe:javascript:doEvilStuff()");
      }

      // post-fixed with proper url
      testUrl = "javascript:doEvilStuff(); http://make.me/look/good";
      expect(sanitizeImg(testUrl)).toBe(
        "unsafe:javascript:doEvilStuff(); http://make.me/look/good",
      );
    });

    it("should sanitize ng-src bindings as well", () => {
      testUrl = "javascript:doEvilStuff()";
      expect(sanitizeImg(testUrl)).toBe("unsafe:javascript:doEvilStuff()");
    });

    it("should not sanitize valid urls", () => {
      testUrl = "foo/bar";
      expect(sanitizeImg(testUrl)).toBe("foo/bar");

      testUrl = "/foo/bar";
      expect(sanitizeImg(testUrl)).toBe("/foo/bar");

      testUrl = "../foo/bar";
      expect(sanitizeImg(testUrl)).toBe("../foo/bar");

      testUrl = "#foo";
      expect(sanitizeImg(testUrl)).toBe("#foo");

      testUrl = "http://foo.com/bar";
      expect(sanitizeImg(testUrl)).toBe("http://foo.com/bar");

      testUrl = " http://foo.com/bar";
      expect(sanitizeImg(testUrl)).toBe(" http://foo.com/bar");

      testUrl = "https://foo.com/bar";
      expect(sanitizeImg(testUrl)).toBe("https://foo.com/bar");

      testUrl = "ftp://foo.com/bar";
      expect(sanitizeImg(testUrl)).toBe("ftp://foo.com/bar");

      testUrl = "file:///foo/bar.html";
      expect(sanitizeImg(testUrl)).toBe("file:///foo/bar.html");
    });

    it("should not sanitize blob urls", () => {
      testUrl = "blob:///foo/bar.html";
      expect(sanitizeImg(testUrl)).toBe("blob:///foo/bar.html");
    });

    it("should not sanitize data: URIs for images", () => {
      // image data uri
      // ref: http://probablyprogramming.com/2009/03/15/the-tiniest-gif-ever
      testUrl =
        "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
      expect(sanitizeImg(testUrl)).toBe(
        "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
      );
    });

    it("should allow reconfiguration of the src trusted URIs", () => {
      let returnVal;
      expect(
        sanitizeUriProvider.imgSrcSanitizationTrustedUrlList() instanceof
          RegExp,
      ).toBe(true);
      returnVal =
        sanitizeUriProvider.imgSrcSanitizationTrustedUrlList(/javascript:/);
      expect(returnVal).toBe(sanitizeUriProvider);

      testUrl = "javascript:doEvilStuff()";
      expect(sanitizeImg(testUrl)).toBe("javascript:doEvilStuff()");

      testUrl = "http://recon/figured";
      expect(sanitizeImg(testUrl)).toBe("unsafe:http://recon/figured");
    });
  });

  describe("a[href] sanitization", () => {
    it("should sanitize javascript: urls", () => {
      testUrl = "javascript:doEvilStuff()";
      expect(sanitizeHref(testUrl)).toBe("unsafe:javascript:doEvilStuff()");
    });

    it("should sanitize data: urls", () => {
      testUrl = "data:evilPayload";
      expect(sanitizeHref(testUrl)).toBe("unsafe:data:evilPayload");
    });

    it("should sanitize obfuscated javascript: urls", () => {
      // case-sensitive
      testUrl = "JaVaScRiPt:doEvilStuff()";
      expect(sanitizeHref(testUrl)).toBe("unsafe:javascript:doEvilStuff()");

      // tab in protocol
      testUrl = "java\u0009script:doEvilStuff()";
      if (isEvilInCurrentBrowser(testUrl)) {
        expect(sanitizeHref(testUrl)).toEqual(
          "unsafe:javascript:doEvilStuff()",
        );
      }

      // space before
      testUrl = " javascript:doEvilStuff()";
      expect(sanitizeHref(testUrl)).toBe("unsafe:javascript:doEvilStuff()");

      // ws chars before
      testUrl = " \u000e javascript:doEvilStuff()";
      if (isEvilInCurrentBrowser(testUrl)) {
        expect(sanitizeHref(testUrl)).toEqual(
          "unsafe:javascript:doEvilStuff()",
        );
      }

      // post-fixed with proper url
      testUrl = "javascript:doEvilStuff(); http://make.me/look/good";
      expect(sanitizeHref(testUrl)).toBe(
        "unsafe:javascript:doEvilStuff(); http://make.me/look/good",
      );
    });

    it("should sanitize ngHref bindings as well", () => {
      testUrl = "javascript:doEvilStuff()";
      expect(sanitizeHref(testUrl)).toBe("unsafe:javascript:doEvilStuff()");
    });

    it("should not sanitize valid urls", () => {
      testUrl = "foo/bar";
      expect(sanitizeHref(testUrl)).toBe("foo/bar");

      testUrl = "/foo/bar";
      expect(sanitizeHref(testUrl)).toBe("/foo/bar");

      testUrl = "../foo/bar";
      expect(sanitizeHref(testUrl)).toBe("../foo/bar");

      testUrl = "#foo";
      expect(sanitizeHref(testUrl)).toBe("#foo");

      testUrl = "http://foo/bar";
      expect(sanitizeHref(testUrl)).toBe("http://foo/bar");

      testUrl = " http://foo/bar";
      expect(sanitizeHref(testUrl)).toBe(" http://foo/bar");

      testUrl = "https://foo/bar";
      expect(sanitizeHref(testUrl)).toBe("https://foo/bar");

      testUrl = "ftp://foo/bar";
      expect(sanitizeHref(testUrl)).toBe("ftp://foo/bar");

      testUrl = "sftp://foo/bar";
      expect(sanitizeHref(testUrl)).toBe("sftp://foo/bar");

      testUrl = "mailto:foo@bar.com";
      expect(sanitizeHref(testUrl)).toBe("mailto:foo@bar.com");

      testUrl = "file:///foo/bar.html";
      expect(sanitizeHref(testUrl)).toBe("file:///foo/bar.html");
    });

    it("should allow reconfiguration of the href trusted URIs", () => {
      let returnVal;
      expect(
        sanitizeUriProvider.aHrefSanitizationTrustedUrlList() instanceof RegExp,
      ).toBe(true);
      returnVal =
        sanitizeUriProvider.aHrefSanitizationTrustedUrlList(/javascript:/);
      expect(returnVal).toBe(sanitizeUriProvider);

      testUrl = "javascript:doEvilStuff()";
      expect(sanitizeHref(testUrl)).toBe("javascript:doEvilStuff()");

      testUrl = "http://recon/figured";
      expect(sanitizeHref(testUrl)).toBe("unsafe:http://recon/figured");
    });
  });
});
