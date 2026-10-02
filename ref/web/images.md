# Images on a web page

Read when adding or reviewing images, backgrounds or animated media on a page. Source:
[Dr. Lex, Web graphics and animations](https://www.dr-lex.be/info-stuff/web-graphics-animations.html).
The page's GIF-era and Internet Explorer sections are left out as dated. Where a rule is the
author's judgment, it says so.

## Format and weight

- **Choose the format by content.** Few colours or large uniform areas go to indexed PNG or
  GIF; photographs and other many-colour images go to JPEG. A 24-bit PNG of a photo is unsuitable:
  the page's example was 76 KiB as PNG against about 11 KiB as JPEG.
- **Never export a web JPEG at maximum quality.** Use the strongest compression that still looks
  good. Keep a lossless master, because re-saving a JPEG always loses quality.
- **Strip colour profiles, previews and EXIF data from web images.** The page's example: 60 KB of
  image data carried 600 KB of metadata.
- **Use colour profiles on every image or on none.** Mixed handling leaves some images visibly
  off; with none, assume sRGB. This is the author's judgment.
- **SVG is the author's preferred format for everything but photographs.**
- **Do not use an animated GIF for video.** In the page's single test, an H.264 re-encode was 22
  times smaller with no visible loss.

## Size and layout

- **Put `width` and `height` on every `<img>` in the markup.** Without them the browser needs
  each image's header before it can lay the page out, and a failed image scrambles the layout.
- **Do not serve a bitmap larger than it is displayed.** Use small copies for thumbnails.
- **For high-DPI screens use `srcset` with several sizes.** For a tiny icon, the author finds a
  2x file shown at half its width and height enough.
- **Give a background image a fallback colour** matching its dominant colour. If the image fails
  to load, light text on a dark image becomes white on white.
