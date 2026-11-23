import { useEffect, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router";
import Navbar from "../../components/dashboard/Navbar";
import "./Categories.css";
import { apiRequest, getAdminToken, handleAdminAuthError } from "../../lib/api";

const Icon = ({ name, size = 18 }) => {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="10.8" cy="10.8" r="6.5" /><path d="m16 16 4.2 4.2" /></>,
    tag: <><path d="M3.5 4.5h8l9 9-7 7-10-10v-6Z" /><circle cx="8" cy="8" r="1.2" /></>,
    edit: <><path d="m4 16.5-.5 4 4-.5L19 8.5 15.5 5 4 16.5Z" /><path d="m13.7 6.8 3.5 3.5" /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5" /></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    close: <path d="M5 5 19 19M19 5 5 19" />,
    refresh: <><path d="M20 11a8 8 0 1 1-2.3-5.7" /><path d="M20 4v6h-6" /></>,
  };

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

const Categories = () => {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ _id: "", name: "" });
  const [query, setQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (!sessionStorage.getItem("token")) {
      navigate("/dashboard/signin");
      return;
    }

    const controller = new AbortController();
    const loadCategories = async () => {
      try {
        const result = await apiRequest("/api/category/fetch-all-categories", {
          method: "GET",
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          if (result.success) {
            setCategories(Array.isArray(result.data) ? result.data : []);
            setLoadError("");
          } else {
            setLoadError(result.message || "Categories could not be loaded.");
          }
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          if (!handleAdminAuthError(cause, navigate)) {
            setLoadError(cause.message || "Categories could not be loaded.");
          }
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadCategories();
    return () => controller.abort();
  }, [navigate, refreshKey]);

  useEffect(() => {
    if (!deleteTarget) return;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !deleting) setDeleteTarget(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [deleteTarget, deleting]);

  const reload = () => {
    setLoading(true);
    setLoadError("");
    setRefreshKey((current) => current + 1);
  };

  const resetForm = () => setForm({ _id: "", name: "" });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name || saving) return;

    const editing = Boolean(form._id);
    setSaving(true);
    try {
      const result = await apiRequest(
        `/api/category/${editing ? "edit-specfic-category" : "create-new-category"}`,
        {
          method: editing ? "PUT" : "POST",
          token: getAdminToken(),
          body: editing ? { _id: form._id, name } : { name },
        }
      );
      toast.success(result.message || (editing ? "Category updated." : "Category created."));
      resetForm();
      reload();
    } catch (cause) {
      if (!handleAdminAuthError(cause, navigate)) {
        toast.error(cause.message || "Could not save the category. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category) => {
    setForm({ _id: category._id, name: category.name });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    formRef.current?.querySelector("input")?.focus({ preventScroll: true });
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await apiRequest("/api/category/delete-specific-category", {
        method: "DELETE",
        token: getAdminToken(),
        body: { _id: deleteTarget._id },
      });
      toast.success("Category deleted.");
      if (form._id === deleteTarget._id) resetForm();
      setDeleteTarget(null);
      reload();
    } catch (cause) {
      if (!handleAdminAuthError(cause, navigate)) {
        toast.error(cause.message || "Could not delete the category. Please try again.");
      }
    } finally {
      setDeleting(false);
    }
  };

  const filteredCategories = categories.filter((category) =>
    category.name?.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const isEditing = Boolean(form._id);

  return (
    <>
      <Navbar activeItem="Categories" />
      <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
      <main className="categories-page">
        <div className="categories-container">
          <div className="categories-breadcrumb"><span>Workspace</span><span aria-hidden="true">/</span><strong>Categories</strong></div>

          <div className="categories-hero">
            <div className="categories-hero-copy">
              <div className="categories-eyebrow"><span className="categories-eyebrow-dot" /> CONTENT ORGANIZATION</div>
              <h1>Make every story <em>easy to find.</em></h1>
              <p>Create and manage the categories that keep your newsroom organized.</p>
            </div>
            <div className="categories-count-card">
              <span className="categories-count-icon"><Icon name="tag" size={23} /></span>
              <span className="categories-count-label">TOTAL CATEGORIES</span>
              <strong>{loading && categories.length === 0 ? "—" : categories.length.toString().padStart(2, "0")}</strong>
              <span className="categories-count-caption">In your content library</span>
            </div>
          </div>

          <div className="categories-layout">
            <section className="categories-form-card" ref={formRef} aria-labelledby="categories-form-title">
              <div className="categories-card-icon"><Icon name={isEditing ? "edit" : "plus"} size={21} /></div>
              <div className="categories-card-kicker">{isEditing ? "EDIT CATEGORY" : "NEW CATEGORY"}</div>
              <h2 id="categories-form-title">{isEditing ? "Update category" : "Create a category"}<span>.</span></h2>
              <p className="categories-card-description">{isEditing ? "Make a change to the category name below." : "Give your stories a clear place to live."}</p>

              <form className="categories-form" onSubmit={handleSubmit}>
                <label htmlFor="category-name">Category name</label>
                <input
                  id="category-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="e.g. Technology"
                  maxLength={80}
                  autoComplete="off"
                  required
                />
                <span className="categories-form-help">Use a short, descriptive name readers will recognize.</span>
                <button className="categories-primary-button" type="submit" disabled={saving}>
                  <span>{saving ? "Saving..." : isEditing ? "Save changes" : "Add category"}</span>
                  <Icon name={isEditing ? "arrow" : "plus"} size={18} />
                </button>
                {isEditing && <button className="categories-cancel-button" type="button" onClick={resetForm}>Cancel editing</button>}
              </form>
            </section>

            <section className="categories-list-card" aria-labelledby="categories-list-title">
              <div className="categories-list-heading">
                <div>
                  <span className="categories-card-kicker">YOUR LIBRARY</span>
                  <h2 id="categories-list-title">All categories<span>.</span></h2>
                  <p>Keep your content neatly grouped and easy to manage.</p>
                </div>
                <span className="categories-list-count">{categories.length} total</span>
              </div>

              <div className="categories-toolbar">
                <div className="categories-search">
                  <Icon name="search" size={18} />
                  <input
                    type="search"
                    aria-label="Search categories"
                    placeholder="Search categories..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
                <button className="categories-refresh" type="button" onClick={reload} disabled={loading} aria-label="Refresh categories" title="Refresh categories">
                  <Icon name="refresh" size={17} />
                </button>
              </div>

              {loadError && categories.length > 0 && (
                <div className="categories-error" role="alert">
                  <span>{loadError}</span>
                  <button type="button" onClick={reload}>Try again</button>
                </div>
              )}

              <div className="categories-table-heading"><span>CATEGORY NAME</span><span>ACTIONS</span></div>
              <div className="categories-list">
                {loading && categories.length === 0 ? (
                  <div className="categories-loading" aria-label="Loading categories">
                    <span /><span /><span /><span />
                  </div>
                ) : loadError && categories.length === 0 ? (
                  <div className="categories-empty">
                    <span className="categories-empty-icon"><Icon name="refresh" size={27} /></span>
                    <h3>Unable to load categories</h3>
                    <p>Please try again in a moment.</p>
                    <button type="button" onClick={reload}>Try again</button>
                  </div>
                ) : filteredCategories.length > 0 ? (
                  filteredCategories.map((category) => (
                    <div className="categories-row" key={category._id}>
                      <div className="categories-row-main">
                        <span className="categories-row-avatar" aria-hidden="true">{category.name?.charAt(0).toUpperCase() || "C"}</span>
                        <span className="categories-row-name">{category.name}</span>
                      </div>
                      <div className="categories-row-actions">
                        <button type="button" className="categories-action-button" onClick={() => handleEdit(category)} aria-label={`Edit ${category.name}`} title="Edit category"><Icon name="edit" size={17} /></button>
                        <button type="button" className="categories-action-button categories-action-delete" onClick={() => setDeleteTarget(category)} aria-label={`Delete ${category.name}`} title="Delete category"><Icon name="trash" size={17} /></button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="categories-empty">
                    <span className="categories-empty-icon"><Icon name={query ? "search" : "tag"} size={27} /></span>
                    <h3>{query ? "No matching categories" : "No categories yet"}</h3>
                    <p>{query ? "Try a different search term." : "Create your first category to start organizing your stories."}</p>
                    {query && <button type="button" onClick={() => setQuery("")}>Clear search</button>}
                  </div>
                )}
              </div>
              <div className="categories-list-footer">Showing {filteredCategories.length} of {categories.length} categories</div>
            </section>
          </div>
        </div>
      </main>

      {deleteTarget && (
        <div className="categories-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setDeleteTarget(null); }}>
          <div className="categories-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-category-title" aria-describedby="delete-category-description">
            <div className="categories-dialog-top">
              <span className="categories-dialog-icon"><Icon name="trash" size={21} /></span>
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} aria-label="Close dialog"><Icon name="close" size={18} /></button>
            </div>
            <h2 id="delete-category-title">Delete category?</h2>
            <p id="delete-category-description">Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.</p>
            <div className="categories-dialog-actions">
              <button type="button" className="categories-dialog-cancel" onClick={() => setDeleteTarget(null)} disabled={deleting} autoFocus>Cancel</button>
              <button type="button" className="categories-dialog-delete" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete category"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Categories;
