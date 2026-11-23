import { useState } from "react";
import { newsImageUrl } from "../../pages/dashboard/newsImageUrl";
import "./NewsCard.css";

const NewsCard = ({ ele, onEdit, onDelete }) => {
  const [imageError, setImageError] = useState(false);
  const date = ele.createdAt && !Number.isNaN(new Date(ele.createdAt).getTime())
    ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(ele.createdAt))
    : null;

  return (
    <article className="news-card">
      <div className="news-card-image-wrap">
        {ele.image && !imageError ? (
          <img src={newsImageUrl(ele.image)} alt="" loading="lazy" onError={() => setImageError(true)} />
        ) : (
          <div className="news-card-image-fallback" aria-hidden="true"><span>N<i>.</i></span></div>
        )}
        <span className="news-card-category">{ele.category_name || "Uncategorized"}</span>
      </div>

      <div className="news-card-body">
        <div className="news-card-meta">
          <span className={`news-card-status${ele.status === "Active" ? " is-active" : ""}`}>
            <span className="news-card-status-dot" />{ele.status || "Unknown"}
          </span>
          {date && <time dateTime={ele.createdAt}>{date}</time>}
        </div>
        <h3>{ele.title}</h3>
        <p>{ele.description}</p>
        <div className="news-card-footer">
          <span className="news-card-author-avatar" aria-hidden="true">{ele.author?.trim().charAt(0).toUpperCase() || "N"}</span>
          <span className="news-card-author">By <strong>{ele.author || "NewsHub"}</strong></span>
          <div className="news-card-actions">
            <button type="button" className="news-card-action" onClick={() => onEdit(ele)} aria-label={`Edit ${ele.title}`} title="Edit article">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m4 16.5-.5 4 4-.5L19 8.5 15.5 5 4 16.5Z" /><path d="m13.7 6.8 3.5 3.5" /></svg>
            </button>
            <button type="button" className="news-card-action news-card-action-delete" onClick={() => onDelete(ele)} aria-label={`Delete ${ele.title}`} title="Delete article">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5" /></svg>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default NewsCard;
