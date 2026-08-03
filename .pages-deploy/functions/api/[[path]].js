// The site is served from kohee.pages.dev and the API from a workers.dev host, so the
// session cookie was third-party. Safari blocks those outright, which is why login worked
// in Chrome and silently failed on iPhone and iPad. Both hosts are on the Public Suffix
// List, so no Domain attribute can bridge them -- the API has to answer on this origin.
//
// Everything is passed through untouched. Cookie and x-csrf-token must arrive at the API
// as sent, Origin must stay this site so the API's own origin check still recognises it,
// and the upstream response is returned as-is so Set-Cookie survives. The browser then
// stores that cookie against kohee.pages.dev, first-party, which is the entire point.
const API_ORIGIN = "https://kohee-list.gabefinder.workers.dev";

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const upstream = new URL(url.pathname.replace(/^\/api/, "") + url.search, API_ORIGIN);

  return fetch(new Request(upstream, request));
}
