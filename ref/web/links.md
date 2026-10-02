# Links, URLs and referrers

Read when writing links, resolving relative URLs, setting a referrer policy, or reviewing a page
for the basics that break without JavaScript. Sources are named per section. Items that are only
the author's opinion are left out.

## Links on a page

From [Dr. Lex, Top 13 Things Not to Do When Designing a Website](https://www.dr-lex.be/info-stuff/top13not2do.html)
(2023 edition, which calls itself "my personal opinions"; only the checkable items are kept):

- **Make links real `<a href>` elements, not click handlers on other elements.** The page's
  stated cost: no context menu, no open-in-new-tab, no crawling, no assistive-technology support.
- **Check the page with JavaScript disabled.** The author's test is that the most basic things
  must still work.
- **Keep links distinguishable from the surrounding text.** Dropping the underline or the colour
  is acceptable, never both (the author's rule).
- **Show absolute dates beside relative ones**, for example "2019-12-24 (8 days ago)", and make a
  hidden absolute date visible in the print stylesheet.
- **Remember a dismissed pop-up or cookie choice** instead of showing it again in the same
  session.
- **Make a directory URL resolve to a page** (an `index.html`), not a 403, 404 or 500.
- **Use `rel="ugc"` for user-generated links and `rel="sponsored"` for paid ones**, and
  `nofollow` only for links that fit neither. The page notes that some dispute its argument for
  this.
- **Keep moving page elements small, stable and switchable.** The author's figure is under about
  20% of the area, kept in place and easy to turn off. Replacing an element on a live page must
  not move anything else.

## Resolving relative URLs

From [Dr. Lex, Relative URL paths 101](https://www.dr-lex.be/info-stuff/relative-paths.html).
This matters most to crawler, URL-rewriter and link-checker code.

- **Resolve a relative URL against the URL of the document it appears in**, which after a
  redirect is the redirect target, not the original request URL.
- **Resolve a URL inside a CSS file against the CSS file's URL**, not the page that links to it.
- **`./` is the current directory, `../` goes up one level, and a leading `/` is the domain
  root.** A path for a file must not end with a slash; a directory path should.
- **Use the language's standard URL library** (the page names Python's `urllib.parse.urljoin`)
  rather than hand-written path logic. Worked example: `../d/r.html` from
  `https://www.stuffthings.com/a/b/q.html` is `https://www.stuffthings.com/a/d/r.html`.

## Referrer policy

From [Dr. Lex, A Plea to Preserve Meaningful Referrer Headers](https://www.dr-lex.be/info-stuff/referrer-policy.html).
The page's argument is opinion and its account of Google's motives is speculation; only the
mechanics are kept.

- **Chrome's default with no header is `strict-origin-when-cross-origin`**, which sends the
  full URL for same-domain links and only the origin for cross-domain links. The earlier default
  was `no-referrer-when-downgrade`.
- **Set the `Referrer-Policy` header explicitly in server config** instead of relying on a
  browser default.
- **Override per page with `<meta name="referrer" content="…">` and per link with the
  `referrerpolicy` attribute.** Both take the header's values. `rel="noreferrer"` removes the
  referrer entirely.
- **Never put credentials in a URL.** A stricter policy then only hides the problem.
- **To keep attribution where a platform blocks the referrer**, add a unique query parameter to
  the links you place.
