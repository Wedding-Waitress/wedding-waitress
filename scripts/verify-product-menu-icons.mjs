const cdpPort = process.env.CDP_PORT || '9333';
const target = await fetch(`http://127.0.0.1:${cdpPort}/json/new?http://localhost:8080/products`, { method: 'PUT' }).then((response) => response.json());
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

const inspectMenu = async (width) => {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width <= 430 });
  await send('Page.navigate', { url: 'http://localhost:8080/products' });
  await new Promise((resolve) => setTimeout(resolve, 650));
  const expression = width >= 1320
    ? `(()=>{const trigger=document.querySelector('button[aria-label="Open products menu"]');trigger?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'mouse'}));return new Promise(resolve=>setTimeout(()=>{const links=[...document.querySelectorAll('.ww-product-menu-item')].filter(node=>node.offsetParent);const icons=links.map(node=>node.querySelector('svg'));const menu=links[0]?.closest('[role="menu"]');links[0]?.focus();const focused=links[0]?getComputedStyle(links[0]):null;resolve(JSON.stringify({width:${width},triggerState:trigger?.getAttribute('data-state'),links:links.length,icons:icons.filter(Boolean).length,iconWidths:[...new Set(icons.map(icon=>icon?.getBoundingClientRect().width))],columnGaps:[...new Set(links.map(node=>getComputedStyle(node).columnGap))],overflow:document.documentElement.scrollWidth>innerWidth,menuOverflow:menu?menu.scrollWidth>menu.clientWidth:null,focusedWeight:focused?.fontWeight,focusOutline:focused?.outlineStyle,allAriaHidden:icons.every(icon=>icon?.getAttribute('aria-hidden')==='true')}))},600))})()`
    : `(()=>{document.querySelector('button[aria-label="Open menu"]')?.click();return new Promise(resolve=>setTimeout(()=>{const products=[...document.querySelectorAll('button')].find(node=>node.textContent.trim()==='Products');products?.click();setTimeout(()=>{const links=[...document.querySelectorAll('header .ww-product-menu-item')].filter(node=>node.offsetParent);const icons=links.map(node=>node.querySelector('svg'));resolve(JSON.stringify({width:${width},links:links.length,icons:icons.filter(Boolean).length,iconWidths:[...new Set(icons.map(icon=>icon?.getBoundingClientRect().width))],minRowHeight:Math.min(...links.map(node=>node.getBoundingClientRect().height)),maxRowHeight:Math.max(...links.map(node=>node.getBoundingClientRect().height)),overflow:document.documentElement.scrollWidth>innerWidth,allAriaHidden:icons.every(icon=>icon?.getAttribute('aria-hidden')==='true')}))},250)},250))})()`;
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  console.log(result?.result?.value ?? JSON.stringify({ width, evaluationError: result?.exceptionDetails?.text ?? 'Unknown evaluation error' }));
};

for (const width of [1440, 1024, 768, 390]) await inspectMenu(width);

await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://localhost:8080/guest-list' });
await new Promise((resolve) => setTimeout(resolve, 650));
const active = await send('Runtime.evaluate', {
  expression: `(()=>{const trigger=document.querySelector('button[aria-label="Open products menu"]');trigger?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'mouse'}));return new Promise(resolve=>setTimeout(()=>{const link=[...document.querySelectorAll('a[href="/guest-list"].ww-product-menu-item')].find(node=>node.offsetParent);const style=link?getComputedStyle(link):null;resolve(JSON.stringify({current:link?.getAttribute('aria-current'),weight:style?.fontWeight,background:style?.backgroundColor,iconColor:link?getComputedStyle(link.querySelector('svg')).color:null}))},600))})()`,
  awaitPromise: true,
  returnByValue: true,
});
console.log(active?.result?.value ?? JSON.stringify({ activeStateEvaluationError: active?.exceptionDetails?.text ?? 'Unknown evaluation error' }));

await send('Runtime.evaluate', { expression: `[...document.querySelectorAll('a[href="/tables"].ww-product-menu-item')].find(node=>node.offsetParent)?.click()` });
await new Promise((resolve) => setTimeout(resolve, 650));
const navigation = await send('Runtime.evaluate', { expression: `JSON.stringify({path:location.pathname,menuOpen:[...document.querySelectorAll('.ww-product-menu-item')].some(node=>node.offsetParent)})`, returnByValue: true });
console.log(navigation.result.value);
console.log(JSON.stringify({ consoleErrors: errors.length }));

await fetch(`http://127.0.0.1:${cdpPort}/json/close/${target.id}`);
ws.close();
