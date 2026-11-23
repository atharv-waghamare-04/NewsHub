import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import toast, { Toaster } from "react-hot-toast";
import Navbar from "../../components/dashboard/Navbar";
import NewsCard from "../../components/dashboard/NewsCard";
import NewsEditorModal from "./NewsEditorModal";
import "./News.css";
import "./NewsDialogs.css";
import { apiRequest, handleAdminAuthError, getAdminToken } from "../../lib/api";

const PAGE_SIZE = 100;

const News = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState(false);
  const [filters, setFilters] = useState({ category_name: "", search: "" });
  const [searchInput, setSearchInput] = useState("");
  const [skip, setSkip] = useState(0);
  const [articles, setArticles] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const nextPagePending = useRef(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!deleteTarget) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event) => {
      if (event.key === "Escape" && !deleting) setDeleteTarget(null);
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [deleteTarget, deleting]);

  useEffect(() => {
    const controller = new AbortController();

    const loadCategories = async () => {
      try {
        const result = await apiRequest("/api/category/fetch-all-categories", {
          signal: controller.signal,
        });
        setCategories(Array.isArray(result.data) ? result.data : []);
      } catch {
        if (!controller.signal.aborted) setCategoryError(true);
      }
    };

    loadCategories();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadArticles = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await apiRequest("/api/news/fetch-all-news", {
          method: "POST",
          token: getAdminToken(),
          body: { ...filters, skip },
          signal: controller.signal,
        });
        if (!Array.isArray(result.data)) {
          throw new Error("The server returned an unexpected article list.");
        }

        if (controller.signal.aborted) return;
        setArticles((current) => skip === 0 ? result.data : [...current, ...result.data]);
        // The API count covers all articles, so page length tracks filtered pagination.
        setHasMore(result.data.length === PAGE_SIZE);
      } catch (cause) {
        if (!controller.signal.aborted) {
          if (!handleAdminAuthError(cause, navigate)) {
            setError(cause.message || "Could not load articles.");
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          nextPagePending.current = false;
          setLoading(false);
        }
      }
    };

    loadArticles();
    return () => controller.abort();
  }, [filters, skip, retryKey, navigate]);

  useEffect(() => {
    const handleScroll = () => {
      if (loading || nextPagePending.current || !hasMore || error || articles.length === 0) return;
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200) {
        nextPagePending.current = true;
        setSkip((current) => current + PAGE_SIZE);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, hasMore, error, articles.length]);

  const applyFilters = (nextFilters) => {
    if (nextFilters.category_name === filters.category_name && nextFilters.search === filters.search) return;
    setArticles([]);
    setHasMore(true);
    nextPagePending.current = false;
    setSkip(0);
    setFilters(nextFilters);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    applyFilters({ ...filters, search: searchInput.trim() });
  };

  const clearFilters = () => {
    setSearchInput("");
    applyFilters({ category_name: "", search: "" });
  };

  const refreshArticles = () => {
    setArticles([]);
    setHasMore(true);
    nextPagePending.current = false;
    setSkip(0);
    setRetryKey((current) => current + 1);
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await apiRequest("/api/news/delete-specific-news", {
        method: "DELETE",
        token: getAdminToken(),
        body: { _id: deleteTarget._id },
      });
      setDeleteTarget(null);
      refreshArticles();
      toast.success("Article deleted.");
    } catch (cause) {
      if (!handleAdminAuthError(cause, navigate)) {
        setDeleteError(cause.message || "Could not delete the article. Please try again.");
      }
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters = Boolean(filters.category_name || filters.search);

  return (
    <>
      <Navbar activeItem="Articles" />
      <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
      <main className="news-page">
        <div className="news-page-inner">
          <div className="news-breadcrumb"><span>Workspace</span><span aria-hidden="true">/</span><strong>Articles</strong></div>

          <div className="news-hero">
            <div className="news-hero-copy">
              <span className="news-page-kicker"><span className="news-kicker-dot" /> YOUR NEWSROOM</span>
              <h1>Stories worth <em>sharing.</em></h1>
              <p>Explore your content library. Find the right story in just a few clicks.</p>
              <button className="news-create-button" type="button" onClick={() => setEditTarget({ __create: true })}>+ Create article</button>
            </div>
            <div className="news-hero-card" aria-label="Articles loaded">
              <span className="news-hero-card-label">IN YOUR LIBRARY</span>
              <strong>{loading && articles.length === 0 ? "—" : articles.length.toString().padStart(2, "0")}</strong>
              <span className="news-hero-card-caption">{articles.length === 1 ? "article loaded" : "articles loaded"}</span>
              <div className="news-hero-card-decoration" aria-hidden="true">N</div>
            </div>
          </div>

          <section className="news-filters" aria-label="Article filters">
            <div className="news-filters-heading">
              <div>
                <span className="news-section-kicker">EXPLORE CONTENT</span>
                <h2>Find your next story<span>.</span></h2>
              </div>
              {hasFilters && <button className="news-clear-filters" type="button" onClick={clearFilters}>Clear filters <span aria-hidden="true">×</span></button>}
            </div>
            <div className="news-filter-controls">
            <div className="news-filter-field">
              <label htmlFor="news-category">Category</label>
              <select
                id="news-category"
                value={filters.category_name}
                onChange={(event) => applyFilters({ category_name: event.target.value, search: searchInput.trim() })}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category._id || category.name} value={category.name}>{category.name}</option>
                ))}
              </select>
            </div>

            <form className="news-search-form" onSubmit={handleSearch} role="search">
              <label htmlFor="news-search">Search articles</label>
              <div className="news-search-controls">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10.8" cy="10.8" r="6.5" /><path d="m16 16 4.2 4.2" /></svg>
                <input
                  id="news-search"
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search titles, authors, and more..."
                />
                <button type="submit">Search <span aria-hidden="true">→</span></button>
              </div>
            </form>
            </div>
          </section>

          {categoryError && <p className="news-category-error" role="status">Categories could not be loaded. You can still search all articles.</p>}

          <div className="news-results-heading">
            <div>
              <span className="news-section-kicker">THE COLLECTION</span>
              <h2>{filters.category_name || "Latest articles"}<span>.</span></h2>
            </div>
            <span className="news-results-count">{articles.length} {articles.length === 1 ? "story" : "stories"} loaded</span>
          </div>

          {error && (
            <div className="news-error" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => setRetryKey((current) => current + 1)}>Try again</button>
            </div>
          )}

          {articles.length > 0 && (
            <div className="news-container">
              {articles.map((article) => <NewsCard key={article._id} ele={article} onEdit={setEditTarget} onDelete={(target) => { setDeleteError(""); setDeleteTarget(target); }} />)}
            </div>
          )}

          {loading && articles.length === 0 && (
            <div className="news-skeleton-grid" role="status" aria-label="Loading articles">
              <span className="news-skeleton-card" /><span className="news-skeleton-card" /><span className="news-skeleton-card" />
            </div>
          )}
          {loading && articles.length > 0 && <p className="news-feedback" role="status">Loading more articles...</p>}
          {!loading && !error && articles.length === 0 && (
            <div className="news-empty">
              <div className="news-empty-mark" aria-hidden="true">✦</div>
              <h2>{hasFilters ? "No matching articles" : "No articles yet"}</h2>
              <p>{hasFilters ? "Try another category or search term." : "Articles will appear here when they are published."}</p>
              {hasFilters && <button type="button" onClick={clearFilters}>Clear filters</button>}
            </div>
          )}
        </div>
      </main>
      {editTarget && (
        <NewsEditorModal
          article={editTarget.__create ? null : editTarget}
          categories={categories}
          onClose={() => setEditTarget(null)}
          onDetailsSaved={refreshArticles}
          onSaved={() => {
            const wasCreate = Boolean(editTarget.__create);
            setEditTarget(null);
            refreshArticles();
            toast.success(wasCreate ? "Article published." : "Article updated.");
          }}
        />
      )}
      {deleteTarget && (
        <div className="news-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setDeleteTarget(null); }}>
          <div className="news-dialog news-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="news-delete-title" aria-describedby="news-delete-description">
            <span className="news-delete-icon" aria-hidden="true">×</span>
            <h2 id="news-delete-title">Delete article?</h2>
            <p id="news-delete-description">Are you sure you want to delete <strong>{deleteTarget.title}</strong>? This action cannot be undone.</p>
            {deleteError && <p className="news-dialog-error" role="alert">{deleteError}</p>}
            <div className="news-dialog-actions"><button type="button" className="news-dialog-cancel" onClick={() => setDeleteTarget(null)} disabled={deleting} autoFocus>Cancel</button><button type="button" className="news-dialog-danger" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete article"}</button></div>
          </div>
        </div>
      )}
    </>
  );
};

export default News;
