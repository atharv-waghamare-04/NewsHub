import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getUserSession } from "./userSession";
import { API_BASE_URL, apiRequest } from "../../lib/api";
import "./NewsApiGuide.css";

const apiBase = API_BASE_URL;
const endpoint = `${apiBase}/api/news/fetch-all-paid-news`;
const requestExample = `const response = await fetch("${endpoint}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    token_id: "YOUR_TOKEN_ID",
    category_name: "",
    search: "",
    skip: 0
  })
});

const result = await response.json();
if (!response.ok || !result.success) {
  throw new Error(result.message || "Could not fetch news");
}
console.log(result.data);`;

const fields = [
  { name: "token_id", type: "string", detail: "Your subscription token. Required for every request." },
  { name: "category_name", type: "string", detail: "Filter by exact category name. Use an empty string for all categories." },
  { name: "search", type: "string", detail: "Search news text. Use an empty string to skip search." },
  { name: "skip", type: "integer", detail: "Number of results to skip. Start at 0, then use 100 for the next page." },
];

const NewsApiGuide = () => {
  const [{ token: sessionToken }] = useState(getUserSession);
  const [tokenId, setTokenId] = useState("");
  const [tokenLoading, setTokenLoading] = useState(Boolean(sessionToken));
  const [tokenError, setTokenError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [tokenVisible, setTokenVisible] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [filters, setFilters] = useState({ category_name: "", search: "", skip: "0" });
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestResult, setRequestResult] = useState(null);

  useEffect(() => {
    if (!sessionToken) return;
    const controller = new AbortController();

    const loadToken = async () => {
      setTokenLoading(true);
      setTokenError("");
      try {
        const result = await apiRequest("/api/subscription/get-my-token", {
          method: "POST",
          token: sessionToken,
          signal: controller.signal,
        });
        if (typeof result.token_id !== "string" || !result.token_id) {
          throw new Error("Could not load your API token.");
        }
        setTokenId(result.token_id);
      } catch (cause) {
        if (!controller.signal.aborted) setTokenError(cause.message || "Could not load your API token.");
      } finally {
        if (!controller.signal.aborted) setTokenLoading(false);
      }
    };

    loadToken();
    return () => controller.abort();
  }, [sessionToken, refreshKey]);

  useEffect(() => {
    if (!copyMessage) return;
    const timeout = window.setTimeout(() => setCopyMessage(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [copyMessage]);

  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`${label} copied to clipboard.`);
    } catch {
      setCopyMessage(`Could not copy ${label.toLowerCase()}. Select and copy it instead.`);
    }
  };

  const runExample = async (event) => {
    event.preventDefault();
    if (!tokenId || requestLoading) return;
    setRequestLoading(true);
    setRequestError("");
    setRequestResult(null);
    try {
      const result = await apiRequest("/api/news/fetch-all-paid-news", {
        method: "POST",
        body: {
          token_id: tokenId,
          category_name: filters.category_name.trim(),
          search: filters.search.trim(),
          skip: Number(filters.skip),
        },
      });
      if (!Array.isArray(result.data)) {
        throw new Error("The API returned an unexpected response.");
      }
      setRequestResult(result.data);
    } catch (cause) {
      setRequestError(cause.message || "Could not fetch news.");
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <main className="api-page">
      <header className="api-header">
        <Link className="api-brand" to="/" aria-label="NewsHub home"><img src="/newshub-mark.svg" alt="" /><span>NewsHub<span>.</span></span></Link>
        <nav aria-label="Main navigation"><Link to="/">Home</Link><Link to="/buy-now">Membership</Link><span aria-current="page">API guide</span></nav>
      </header>

      <div className="api-shell">
        <div className="api-breadcrumb"><Link to="/">Home</Link><span aria-hidden="true">/</span><strong>News API guide</strong></div>

        <section className="api-hero">
          <div><span className="api-eyebrow"><i /> DEVELOPER ACCESS</span><h1>News for<br /><em>what you build.</em></h1><p>Use your NewsHub subscription token to request stories, filter by category, and search the archive.</p><a className="api-hero-link" href="#quick-start">Start with the API <span aria-hidden="true">↗</span></a></div>
          <div className="api-hero-art" aria-hidden="true"><span className="api-art-tag">NEWSHUB API</span><div className="api-art-line"><b>POST</b> /fetch-all-paid-news</div><div className="api-art-code"><span>{"{"}</span><span>{'  "category_name": "",'}</span><span>{'  "search": "",'}</span><span>{'  "skip": 0'}</span><span>{"}"}</span></div><span className="api-art-footer">STORIES, ON DEMAND.</span></div>
        </section>

        <section className="api-token-section" aria-labelledby="api-token-heading">
          <div className="api-token-heading"><div><span className="api-section-label">YOUR ACCESS</span><h2 id="api-token-heading">Your token_id<span>.</span></h2><p>Use this value in the request body. Keep it private and avoid putting it in public code.</p></div><span className="api-token-icon" aria-hidden="true">{`{ }`}</span></div>
          {!sessionToken ? (
            <div className="api-token-empty"><p>Sign in to view the token for your subscription.</p><Link className="api-action" to="/login" state={{ returnTo: "/news-api" }}>Sign in <span aria-hidden="true">→</span></Link></div>
          ) : tokenLoading ? (
            <div className="api-token-placeholder" role="status">Loading your token...</div>
          ) : tokenError ? (
            <div className="api-token-empty"><p role="alert">{tokenError}</p><div className="api-token-links"><button type="button" onClick={() => setRefreshKey((key) => key + 1)}>Try again</button><Link to="/buy-now">View membership</Link></div></div>
          ) : (
            <div className="api-token-value"><div><span>SUBSCRIPTION TOKEN</span><code>{tokenVisible ? tokenId : `${tokenId.slice(0, 4)}••••••••••••${tokenId.slice(-4)}`}</code></div><div className="api-token-buttons"><button type="button" onClick={() => setTokenVisible((visible) => !visible)} aria-label={tokenVisible ? "Hide token" : "Show token"}>{tokenVisible ? "Hide" : "Show"}</button><button type="button" onClick={() => copy(tokenId, "Token")}>Copy token</button></div></div>
          )}
          {copyMessage && <p className="api-copy-status" role="status">{copyMessage}</p>}
        </section>

        <section id="quick-start" className="api-docs" aria-labelledby="api-docs-heading">
          <div className="api-docs-intro"><span className="api-section-label">QUICK START</span><h2 id="api-docs-heading">One endpoint. Flexible results<span>.</span></h2><p>Send a JSON POST request. The API returns an array of news articles in <code>data</code>, newest first, with up to 100 articles per request.</p></div>
          <div className="api-endpoint"><span>POST</span><code>{endpoint}</code><button type="button" onClick={() => copy(endpoint, "Endpoint")}>Copy URL</button></div>
          <div className="api-doc-grid"><div className="api-doc-main"><h3>Request body</h3><p>Include all four fields. Use empty strings when you do not want a category or search filter.</p><div className="api-field-table"><div className="api-field-table-head"><span>Field</span><span>Type</span><span>How to use it</span></div>{fields.map((field) => <div className="api-field-row" key={field.name}><code>{field.name}</code><span>{field.type}</span><span>{field.detail}</span></div>)}</div></div><aside className="api-doc-note"><span>01 / ACCESS</span><h3>Before you request</h3><p>Sign in, purchase an annual membership, then copy your <code>token_id</code> above. The paid news endpoint reads that token from the JSON body. An expired subscription cannot fetch stories.</p><Link to="/buy-now">Explore membership <span aria-hidden="true">→</span></Link></aside></div>
          <div className="api-example-heading"><div><span className="api-section-label">EXAMPLE REQUEST</span><h3>Try it in JavaScript</h3></div><button type="button" onClick={() => copy(requestExample, "Example")}>Copy code</button></div>
          <pre className="api-code"><code>{requestExample}</code></pre>
          <p className="api-example-note">Replace <code>YOUR_TOKEN_ID</code> with the token shown above. <code>skip</code> is an offset: use 0 for the first request, then 100 for the next batch.</p>
        </section>

        <section className="api-playground" aria-labelledby="api-playground-heading"><div className="api-playground-intro"><span className="api-section-label">TRY THE API</span><h2 id="api-playground-heading">Send a request<span>.</span></h2><p>This tester uses your subscription token in the browser and shows the returned articles.</p></div><form onSubmit={runExample}><label>Category<input value={filters.category_name} onChange={(event) => setFilters((current) => ({ ...current, category_name: event.target.value }))} placeholder="All categories" /></label><label>Search<input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Any keyword" /></label><label>Skip<input type="number" min="0" step="1" value={filters.skip} onChange={(event) => setFilters((current) => ({ ...current, skip: event.target.value }))} required /></label><button type="submit" disabled={!tokenId || requestLoading}>{requestLoading ? "Sending..." : "Send request"} <span aria-hidden="true">→</span></button></form>{!tokenId && <p className="api-playground-hint">A subscription token is needed to run the example.</p>}{requestError && <p className="api-playground-error" role="alert">{requestError}</p>}{requestResult && <div className="api-result" role="status"><strong>{requestResult.length} {requestResult.length === 1 ? "article" : "articles"} returned</strong><pre><code>{JSON.stringify({ success: true, data: requestResult }, null, 2)}</code></pre></div>}</section>
      </div>
      <footer className="api-footer"><span>© {new Date().getFullYear()} NewsHub</span><Link to="/">Back to home</Link></footer>
    </main>
  );
};

export default NewsApiGuide;
