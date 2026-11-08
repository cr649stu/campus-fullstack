import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { padNumber } from "../lib/format";

export function Avatar({
  name,
  size = 34,
  variant = "solid",
}: {
  name: string;
  size?: number;
  variant?: "solid" | "outline";
}) {
  return (
    <span
      className={`avatar avatar--${variant}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-hidden="true"
    >
      {name.slice(0, 1)}
    </span>
  );
}

export function Tag({ name, to, onClick }: { name: string; to?: string; onClick?: () => void }) {
  if (to) {
    return (
      <Link className="tag" to={to}>
        #{name}
      </Link>
    );
  }
  return (
    <button type="button" className="tag" onClick={onClick}>
      #{name}
    </button>
  );
}

export function PageHead({
  index,
  latin,
  title,
  description,
  meta,
  action,
}: {
  index: string | number;
  latin: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  const numericIndex = typeof index === "number" ? index : Number(index);
  const displayIndex = Number.isFinite(numericIndex) ? padNumber(numericIndex) : String(index);

  return (
    <header className="page-head">
      <div className="page-head__mark">
        <span className="page-head__index">{displayIndex}</span>
        <span className="page-head__latin">{latin}</span>
      </div>
      <div className="page-head__body">
        <h1>{title}</h1>
        {description && <p className="page-head__desc">{description}</p>}
        {meta && <div className="page-head__meta">{meta}</div>}
      </div>
      {action && <div className="page-head__action">{action}</div>}
    </header>
  );
}

export function SectionHead({
  index,
  latin,
  title,
  link,
  linkLabel = "查看全部",
}: {
  index: string | number;
  latin: string;
  title: string;
  link?: string;
  linkLabel?: string;
}) {
  return (
    <div className="section-head">
      <div className="section-head__left">
        <span className="section-head__index">{padNumber(Number(index))}</span>
        <div>
          <p className="eyebrow">{latin}</p>
          <h2>{title}</h2>
        </div>
      </div>
      {link && (
        <Link to={link} className="arrow-link">
          {linkLabel}
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}

export function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  if (pages <= 1) return null;
  const numbers = Array.from({ length: pages }, (_, index) => index + 1);
  return (
    <nav className="pagination" aria-label="分页">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        上一页
      </button>
      <div className="pagination__numbers">
        {numbers.map((number) => (
          <button
            key={number}
            type="button"
            className={number === page ? "is-current" : ""}
            onClick={() => onChange(number)}
          >
            {padNumber(number)}
          </button>
        ))}
      </div>
      <button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        下一页
      </button>
    </nav>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty__rule" />
      <p className="empty__title">{title}</p>
      {description && <p className="empty__desc">{description}</p>}
      {action}
    </div>
  );
}

export function Loading({ label = "正在载入" }: { label?: string }) {
  return (
    <div className="loading">
      <span className="loading__bar" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return <p className="form-error">{message}</p>;
}

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
