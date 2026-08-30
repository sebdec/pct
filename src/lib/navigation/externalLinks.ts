export function configureExternalLinks(root: ParentNode) {
  root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
    const url = new URL(link.href, window.location.href);

    if (!isExternalHttpUrl(url)) return;

    link.target = "_blank";
    link.relList.add("noopener", "noreferrer");
  });
}

function isExternalHttpUrl(url: URL) {
  return (
    (url.protocol === "http:" || url.protocol === "https:") &&
    url.origin !== window.location.origin
  );
}
