import { useEffect, useRef, useState } from "react";
import { newsImageUrl } from "./newsImageUrl";
import { apiRequest, getAdminToken } from "../../lib/api";

const NewsEditorModal = ({ article, categories, onClose, onSaved, onDetailsSaved }) => {
  const modalRef = useRef(null);
  const titleRef = useRef(null);
  const isCreate = !article;
  const [form, setForm] = useState(() => ({
    title: article?.title || "",
    description: article?.description || "",
    author: article?.author || "",
    category_name: article?.category_name || categories[0]?.name || "",
    status: article?.status || "Active",
    content: article?.content?.length
      ? article.content.map(({ headline, description }) => ({ headline: headline || "", description: description || "" }))
      : [{ headline: "", description: "" }],
  }));
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { titleRef.current?.focus(); }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) onClose();
      if (event.key !== "Tab") return;
      const focusable = modalRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, saving]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const setContentField = (index, field, value) => setForm((current) => ({
    ...current,
    content: current.content.map((section, sectionIndex) => sectionIndex === index ? { ...section, [field]: value } : section),
  }));

  

  const handleSave = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (form.title.trim().length < 5 || form.description.trim().length < 20 || form.author.trim().length < 3 || !form.category_name) {
      setError("Enter a title, description, author, and category before saving.");
      return;
    }
    if (form.content.some((section) => !section.headline.trim() || !section.description.trim())) {
      setError("Each content section needs a headline and content.");
      return;
    }
    if (isCreate && !imageFile) {
      setError("Choose a featured image before publishing.");
      return;
    }
    if (imageFile && !["image/jpeg", "image/png", "image/webp"].includes(imageFile.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (imageFile && imageFile.size > 5 * 1024 * 1024) {
      setError("Choose an image smaller than 5 MB.");
      return;
    }

    setSaving(true);
    setError("");
    let detailsSaved = false;

    try {
      const cleanContent = form.content.map((section) => ({
        headline: section.headline.trim(),
        description: section.description.trim(),
      }));

      if (isCreate) {
        const createBody = new FormData();
        createBody.append("title", form.title.trim());
        createBody.append("description", form.description.trim());
        createBody.append("author", form.author.trim());
        createBody.append("category_name", form.category_name);
        createBody.append("content", JSON.stringify(cleanContent));
        createBody.append("news-image", imageFile);
        await apiRequest("/api/news/create-new-news", {
          method: "POST",
          token: getAdminToken(),
          body: createBody,
        });
      } else {
        await apiRequest("/api/news/update-exist-news", {
          method: "PUT",
          token: getAdminToken(),
          body: {
            _id: article._id,
            ...form,
            title: form.title.trim(),
            description: form.description.trim(),
            author: form.author.trim(),
            content: cleanContent,
          },
        });
        detailsSaved = true;

        if (imageFile) {
          const imageBody = new FormData();
          imageBody.append("_id", article._id);
          imageBody.append("news-image", imageFile);
          await apiRequest("/api/news/update-specific-news-image", {
            method: "PUT",
            token: getAdminToken(),
            body: imageBody,
          });
        }
      }

      onSaved();
    } catch (cause) {
      if (detailsSaved) onDetailsSaved();
      setError(detailsSaved && imageFile
        ? `Article details were saved, but the image was not updated. ${cause.message || "Please try again."}`
        : cause.message || "Could not update the article. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const categoryOptions = categories.some((category) => category.name === form.category_name)
    ? categories
    : [{ _id: "current", name: form.category_name }, ...categories].filter((category) => category.name);

  return (
    <div className="news-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <div className="news-dialog news-edit-dialog" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="news-edit-title">
        <div className="news-dialog-header">
          <div><span className="news-section-kicker">ARTICLE DETAILS</span><h2 id="news-edit-title">{isCreate ? "Create article" : "Edit article"}<span>.</span></h2><p>{isCreate ? "Publish a new story with a featured image and structured content." : "Update the story, its details, and its publication status."}</p></div>
          <button className="news-dialog-close" type="button" onClick={onClose} disabled={saving} aria-label="Close edit form">×</button>
        </div>

        <form onSubmit={handleSave} className="news-edit-form">
          <div className="news-edit-grid">
            <div className="news-edit-field news-edit-field-wide">
              <label htmlFor="edit-news-title">Title</label>
              <input id="edit-news-title" ref={titleRef} value={form.title} onChange={(event) => setField("title", event.target.value)} required minLength={5} maxLength={150} />
            </div>
            <div className="news-edit-field news-edit-field-wide">
              <label htmlFor="edit-news-description">Description</label>
              <textarea id="edit-news-description" rows={3} value={form.description} onChange={(event) => setField("description", event.target.value)} required minLength={20} />
            </div>
            <div className="news-edit-field">
              <label htmlFor="edit-news-author">Author</label>
              <input id="edit-news-author" value={form.author} onChange={(event) => setField("author", event.target.value)} required minLength={3} maxLength={50} />
            </div>
            <div className="news-edit-field">
              <label htmlFor="edit-news-category">Category</label>
              <select id="edit-news-category" value={form.category_name} onChange={(event) => setField("category_name", event.target.value)} required>
                <option value="" disabled>Choose category</option>
                {categoryOptions.map((category) => <option key={category._id || category.name} value={category.name}>{category.name}</option>)}
              </select>
            </div>
            <div className="news-edit-field">
              <label htmlFor="edit-news-status">Status</label>
              <select id="edit-news-status" value={form.status} onChange={(event) => setField("status", event.target.value)}>
                <option value="Active">Active</option><option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className="news-edit-field">
              <label htmlFor="edit-news-image">{isCreate ? "Featured image" : "Replace image"} <span>({isCreate ? "required" : "optional"})</span></label>
              <input id="edit-news-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] || null)} />
            </div>
          </div>

          {article?.image && <div className="news-edit-current-image"><img src={newsImageUrl(article.image)} alt="Current article thumbnail" /><span>Current image{imageFile ? ` · Replacing with ${imageFile.name}` : ""}</span></div>}

          <div className="news-edit-sections-heading"><div><span className="news-section-kicker">STORY BODY</span><h3>Content sections</h3></div><button type="button" onClick={() => setForm((current) => ({ ...current, content: [...current.content, { headline: "", description: "" }] }))}>+ Add section</button></div>
          <div className="news-edit-sections">
            {form.content.map((section, index) => (
              <div className="news-edit-section" key={index}>
                <div className="news-edit-section-heading"><strong>Section {index + 1}</strong>{form.content.length > 1 && <button type="button" onClick={() => setForm((current) => ({ ...current, content: current.content.filter((_, sectionIndex) => sectionIndex !== index) }))}>Remove</button>}</div>
                <div className="news-edit-field"><label htmlFor={`edit-news-headline-${index}`}>Headline</label><input id={`edit-news-headline-${index}`} value={section.headline} onChange={(event) => setContentField(index, "headline", event.target.value)} required /></div>
                <div className="news-edit-field"><label htmlFor={`edit-news-content-${index}`}>Content</label><textarea id={`edit-news-content-${index}`} rows={4} value={section.description} onChange={(event) => setContentField(index, "description", event.target.value)} required /></div>
              </div>
            ))}
          </div>

          {error && <p className="news-dialog-error" role="alert">{error}</p>}
          <div className="news-dialog-actions"><button type="button" className="news-dialog-cancel" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className="news-dialog-primary" disabled={saving}>{saving ? (isCreate ? "Publishing..." : "Saving...") : (isCreate ? "Publish article" : "Save changes")}</button></div>
        </form>
      </div>
    </div>
  );
};

export default NewsEditorModal;
