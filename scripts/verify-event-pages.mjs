const cdpPort = process.env.CDP_PORT || '9333';
const target = await fetch(`http://127.0.0.1:${cdpPort}/json/new?http://localhost:8080/events`, { method: 'PUT' }).then((response) => response.json());
const ws = new WebSocket(target.webSocketDebuggerUrl);
let nextId = 0;
const pending = new Map();
const errors = [];
const send = (method, params = {}) => new Promise((resolve) => {
  const id = ++nextId;
  pending.set(id, resolve);
  ws.send(JSON.stringify({ id, method, params }));
});

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message.result);
    pending.delete(message.id);
  } else if (message.method === 'Runtime.exceptionThrown' || (message.method === 'Log.entryAdded' && message.params.entry.level === 'error')) {
    errors.push(message.params);
  }
};

await new Promise((resolve) => { ws.onopen = resolve; });
await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');

const pages = [
  '/events', '/events/weddings', '/events/engagements', '/events/birthdays-parties',
  '/events/corporate-events', '/events/christmas-seasonal-events', '/events/memorials-celebrations-of-life',
];

for (const path of pages) {
  await send('Page.navigate', { url: `http://localhost:8080${path}` });
  await new Promise((resolve) => setTimeout(resolve, 700));
  const result = await send('Runtime.evaluate', {
    expression: `JSON.stringify({path:location.pathname,title:document.title,h1s:[...document.querySelectorAll('h1')].map(node=>node.textContent.trim()),canonicals:[...document.querySelectorAll('link[rel="canonical"]')].map(node=>node.href),ogUrl:[...document.querySelectorAll('meta[property="og:url"]')].map(node=>node.content),hasHeader:!!document.querySelector('header'),hasFooter:!!document.querySelector('footer'),schema:[...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(node=>{try{const json=JSON.parse(node.textContent);return (Array.isArray(json)?json:[json]).map(item=>item['@type'])}catch{return ['INVALID']}}),overflow:document.documentElement.scrollWidth>innerWidth})`,
    returnByValue: true,
  });
  console.log(result.result.value);
}

for (const width of [1440, 1280, 1024, 768, 390]) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
  await send('Page.navigate', { url: 'http://localhost:8080/events' });
  await new Promise((resolve) => setTimeout(resolve, 700));
  const expression = width >= 1320
    ? `(()=>{document.querySelector('button[aria-label="Open event types menu"]')?.click();return new Promise(resolve=>setTimeout(()=>resolve(JSON.stringify({width:${width},overflow:document.documentElement.scrollWidth>innerWidth,eventLinks:[...document.querySelectorAll('a[href^="/events/"]')].filter(node=>node.offsetParent).length})),250))})()`
    : `(()=>{const menu=document.querySelector('button[aria-label="Open menu"]')||document.querySelector('button[aria-label="Close menu"]');menu?.click();return new Promise(resolve=>setTimeout(()=>{const button=[...document.querySelectorAll('button')].find(node=>node.textContent.trim()==='Events');button?.click();setTimeout(()=>{const links=[...document.querySelectorAll('a[href^="/events/"]')].filter(node=>node.offsetParent);resolve(JSON.stringify({width:${width},overflow:document.documentElement.scrollWidth>innerWidth,eventLinks:links.length,menuButton:!!button,eventButtonHeight:button?.getBoundingClientRect().height||0,minEventLinkHeight:links.length?Math.min(...links.map(node=>node.getBoundingClientRect().height)):0}))},250)},250))})()`;
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  console.log(result.result.value);
}

await send('Emulation.clearDeviceMetricsOverride');
await send('Page.navigate', { url: 'http://localhost:8080/' });
await new Promise((resolve) => setTimeout(resolve, 700));
const homepage = await send('Runtime.evaluate', {
  expression: `JSON.stringify((()=>{const text=[...document.querySelectorAll('h2')].map(node=>node.textContent.trim());return {eventSectionIndex:text.indexOf('One platform for every kind of gathering'),productSectionIndex:text.indexOf('Every tool your plan needs'),connectedSectionIndex:text.indexOf('Connected planning feels calmer'),eventLinks:[...document.querySelectorAll('main a[href^="/events/"]')].length,overflow:document.documentElement.scrollWidth>innerWidth}})())`,
  returnByValue: true,
});
console.log(homepage.result.value);

await send('Page.navigate', { url: 'http://localhost:8080/guest-list' });
await new Promise((resolve) => setTimeout(resolve, 700));
const productPage = await send('Runtime.evaluate', {
  expression: `JSON.stringify({path:location.pathname,eventCrossLinks:[...document.querySelectorAll('main a[href^="/events/"]')].map(node=>node.getAttribute('href')),overflow:document.documentElement.scrollWidth>innerWidth})`,
  returnByValue: true,
});
console.log(productPage.result.value);

await send('Page.navigate', { url: 'http://localhost:8080/dashboard' });
await new Promise((resolve) => setTimeout(resolve, 700));
const dashboard = await send('Runtime.evaluate', {
  expression: `JSON.stringify({path:location.pathname,hasPublicFooter:!!document.querySelector('footer'),hasPublicEventsNav:[...document.querySelectorAll('a')].some(node=>node.textContent.trim()==='Event Types'),bodyText:document.body.innerText.slice(0,120)})`,
  returnByValue: true,
});
console.log(dashboard.result.value);

console.log(JSON.stringify({ consoleErrors: errors.length }));
await fetch(`http://127.0.0.1:${cdpPort}/json/close/${target.id}`);
ws.close();
