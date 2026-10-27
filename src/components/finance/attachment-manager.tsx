"use client";

import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";
import { useModalA11y } from "@/shared/use-modal-a11y";
import { DOCUMENT_CATEGORY_LABELS, DOCUMENT_MAX_SIZE_BYTES } from "@/modules/documents/constants";
import type { DocumentView } from "@/modules/documents/service";

type AssociationType = "EXPENSE" | "VENDOR";
type Dialog = { type: "upload"; replace?: DocumentView } | { type: "edit"; document: DocumentView } | { type: "delete"; document: DocumentView } | null;

export function AttachmentManager({ weddingId, associationType, associationId, initialDocuments }: {
  weddingId: string;
  associationType: AssociationType;
  associationId: string;
  initialDocuments: DocumentView[];
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const filtered = useMemo(() => documents.filter((document) => {
    const categoryMatches = !category || document.category === category;
    const term = query.trim().toLowerCase();
    return categoryMatches && (!term || `${document.displayName} ${document.note}`.toLowerCase().includes(term));
  }), [category, documents, query]);

  const categories = associationType === "EXPENSE" ? ["RECEIPT", "BILL", "OTHER"] as const : ["CONTRACT", "QUOTATION", "OTHER"] as const;
  const heading = associationType === "EXPENSE" ? "Receipts & bills" : "Documents & contracts";
  const description = associationType === "EXPENSE" ? "Keep payment receipts, bills, and supporting proof with this expense." : "Keep contracts, quotations, and working documents with this vendor.";

  function notify(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 4500); }
  async function openDocument(document: DocumentView, preview: boolean) {
    const opened = preview ? window.open("about:blank", "_blank") : null;
    try {
      const data = await request<{ url: string; preview: boolean }>(`/api/v1/weddings/${weddingId}/documents/${document.id}/download?preview=${preview ? "1" : "0"}`);
      if (opened) { opened.opener = null; opened.location.href = data.url; }
      else { const link = window.document.createElement("a"); link.href = data.url; link.rel = "noopener"; link.click(); }
      if (preview && !data.preview) notify("This file type cannot be previewed, so it was downloaded instead.");
    } catch (error) { opened?.close(); notify(message(error)); }
  }

  async function remove(document: DocumentView) {
    try {
      await request(`/api/v1/weddings/${weddingId}/documents/${document.id}`, { method: "DELETE" });
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      setDialog(null); notify("Attachment deleted.");
    } catch (error) { notify(message(error)); }
  }

  async function update(document: DocumentView, form: HTMLFormElement) {
    const data = new FormData(form);
    try {
      const result = await request<{ document: DocumentView }>(`/api/v1/weddings/${weddingId}/documents/${document.id}`, {
        method: "PATCH", body: JSON.stringify({ displayName: data.get("displayName"), category: data.get("category"), note: data.get("note") }),
      });
      setDocuments((current) => current.map((item) => item.id === document.id ? result.document : item));
      setDialog(null); notify("Attachment details updated.");
    } catch (error) { notify(message(error)); }
  }

  return <section className="mt-7 rounded-xl bg-surface-container-low p-5 shadow-sm sm:p-6" aria-labelledby={`${associationType.toLowerCase()}-attachments-title`}>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-fixed text-primary"><WorkspaceIcon name="file" /></span><div><h2 id={`${associationType.toLowerCase()}-attachments-title`} className="font-serif text-headline-sm">{heading}</h2><p className="mt-1 text-body-sm text-on-surface-variant">{description}</p></div></div><p className="mt-4 inline-flex items-center gap-2 rounded-full bg-secondary-container px-3 py-1.5 text-label-sm font-semibold text-on-secondary-container"><WorkspaceIcon name="lock" />Private · Admins and Managers only</p></div><button onClick={() => setDialog({ type: "upload" })} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-body-sm font-semibold text-on-primary"><WorkspaceIcon name="upload" />Upload {associationType === "EXPENSE" ? "attachment" : "document"}</button></div>

    {documents.length > 0 && <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]"><label className="relative"><span className="sr-only">Search attachments</span><WorkspaceIcon name="search" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files and notes" className={inputClass + " pl-10"} /></label><label><span className="sr-only">Filter by document type</span><select value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}><option value="">All document types</option>{categories.map((value) => <option key={value} value={value}>{DOCUMENT_CATEGORY_LABELS[value]}</option>)}</select></label></div>}

    {filtered.length ? <div className="mt-5 space-y-3">{filtered.map((document) => <article key={document.id} className="rounded-xl border border-outline-variant/35 bg-surface p-4"><div className="flex items-start gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-xl text-primary"><WorkspaceIcon name={document.contentType.startsWith("image/") ? "gallery" : "file"} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="min-w-0 truncate text-body-md font-semibold">{document.displayName}</h3><span className="rounded-full bg-surface-container px-2.5 py-1 text-label-sm font-semibold text-on-surface-variant">{DOCUMENT_CATEGORY_LABELS[document.category]}</span></div><p className="mt-1 text-label-md text-on-surface-variant">{formatSize(document.sizeBytes)} · {formatDate(document.createdAt)} by {document.uploadedByName}</p>{document.note && <p className="mt-2 line-clamp-2 text-body-sm text-on-surface-variant">{document.note}</p>}</div></div><div className="mt-4 grid grid-cols-2 gap-2 border-t border-outline-variant/25 pt-3 sm:flex sm:justify-end"><button onClick={() => openDocument(document, true)} className={smallButton}><WorkspaceIcon name="eye" />Preview</button><button onClick={() => openDocument(document, false)} className={smallButton}><WorkspaceIcon name="download" />Download</button><button onClick={() => setDialog({ type: "edit", document })} className={smallButton}><WorkspaceIcon name="settings" />Rename</button><button onClick={() => setDialog({ type: "upload", replace: document })} className={smallButton}><WorkspaceIcon name="refresh" />Replace</button><button onClick={() => setDialog({ type: "delete", document })} aria-label={`Delete ${document.displayName}`} className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-label-md font-semibold text-error"><WorkspaceIcon name="trash" />Delete</button></div></article>)}</div> : <div className="mt-6 rounded-xl border border-dashed border-outline-variant bg-surface/70 px-5 py-10 text-center"><WorkspaceIcon name="file" className="mx-auto text-3xl text-primary" /><h3 className="mt-3 text-title-md">{documents.length ? "No attachments match" : "No private files yet"}</h3><p className="mx-auto mt-2 max-w-md text-body-sm leading-6 text-on-surface-variant">{documents.length ? "Adjust the search or document filter." : `Upload the first ${associationType === "EXPENSE" ? "receipt or bill" : "contract or quotation"} when it is ready.`}</p></div>}

    {dialog?.type === "upload" && <UploadDialog weddingId={weddingId} associationType={associationType} associationId={associationId} categories={categories} replace={dialog.replace} onClose={() => setDialog(null)} onComplete={async (document) => { if (dialog.replace) { await request(`/api/v1/weddings/${weddingId}/documents/${dialog.replace.id}`, { method: "DELETE" }); setDocuments((current) => [document, ...current.filter((item) => item.id !== dialog.replace!.id)]); } else setDocuments((current) => [document, ...current]); setDialog(null); notify(dialog.replace ? "Attachment replaced." : "Attachment uploaded."); }} />}
    {dialog?.type === "edit" && <EditDialog document={dialog.document} categories={categories} onClose={() => setDialog(null)} onSubmit={(form) => update(dialog.document, form)} />}
    {dialog?.type === "delete" && <ConfirmDialog title="Delete this attachment?" onClose={() => setDialog(null)} onConfirm={() => remove(dialog.document)}><p className="text-body-md leading-7 text-on-surface-variant"><strong>{dialog.document.displayName}</strong> will be permanently removed from this wedding workspace.</p></ConfirmDialog>}
    {notice && <div role="status" className="fixed bottom-5 right-5 z-[120] max-w-sm rounded-lg bg-inverse-surface px-4 py-3 text-body-sm font-semibold text-inverse-on-surface shadow-xl">{notice}</div>}
  </section>;
}

function UploadDialog({ weddingId, associationType, associationId, categories, replace, onClose, onComplete }: { weddingId: string; associationType: AssociationType; associationId: string; categories: readonly string[]; replace?: DocumentView; onClose: () => void; onComplete: (document: DocumentView) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!file) return setError("Choose a file to upload.");
    if (file.size > DOCUMENT_MAX_SIZE_BYTES) return setError("Files must be 10 MB or smaller.");
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const intent = await request<{ fileId: string; uploadUrl: string; requiredHeaders: Record<string, string> }>(`/api/v1/weddings/${weddingId}/documents/upload-intents`, { method: "POST", body: JSON.stringify({ associationType, associationId, category: form.get("category"), fileName: file.name, contentType: file.type, sizeBytes: file.size, displayName: String(form.get("displayName") ?? "") || undefined, note: form.get("note") }) });
      await uploadFile(intent.uploadUrl, file, intent.requiredHeaders, setProgress);
      const completed = await request<{ document: DocumentView }>(`/api/v1/weddings/${weddingId}/documents/uploads/${intent.fileId}/complete`, { method: "POST" });
      await onComplete(completed.document);
    } catch (cause) { setError(message(cause)); setBusy(false); }
  }
  return <DialogFrame title={replace ? "Replace attachment" : "Upload attachment"} eyebrow={replace ? `Replacing ${replace.displayName}` : "Private financial file"} onClose={busy ? undefined : onClose}><form onSubmit={submit} className="mt-6 space-y-5"><label className="block rounded-xl border border-dashed border-outline bg-surface-container-low p-6 text-center"><WorkspaceIcon name="upload" className="mx-auto text-3xl text-primary" /><span className="mt-3 block text-body-md font-semibold">{file ? file.name : "Choose a private file"}</span><span className="mt-1 block text-label-md text-on-surface-variant">PDF, JPG, PNG, WEBP, or DOCX · Maximum 10 MB</span><input type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.docx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-4 block w-full text-body-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:font-semibold file:text-on-primary" /></label><div className="grid gap-4 sm:grid-cols-2"><Field label="Document type"><select name="category" defaultValue={replace?.category ?? categories[0]} className={inputClass}>{categories.map((value) => <option key={value} value={value}>{DOCUMENT_CATEGORY_LABELS[value as keyof typeof DOCUMENT_CATEGORY_LABELS]}</option>)}</select></Field><Field label="Display name"><input name="displayName" maxLength={160} defaultValue={replace?.displayName ?? ""} placeholder="Optional; filename used by default" className={inputClass} /></Field></div><Field label="Note"><textarea name="note" maxLength={500} rows={3} defaultValue={replace?.note ?? ""} placeholder="Optional context for other planners" className={inputClass} /></Field>{busy && <div><div className="flex justify-between text-label-md"><span>Uploading securely…</span><strong>{progress}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container-highest"><div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${progress}%` }} /></div></div>}{error && <p role="alert" className="rounded-lg bg-error-container px-4 py-3 text-body-sm text-on-error-container">{error}</p>}<div className="flex flex-col-reverse gap-2 border-t border-outline-variant/30 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={busy} className="rounded-lg bg-surface-container px-5 py-3 text-body-sm font-semibold">Cancel</button><button disabled={busy} className="rounded-lg bg-primary px-5 py-3 text-body-sm font-semibold text-on-primary disabled:opacity-60">{busy ? "Uploading…" : replace ? "Upload replacement" : "Upload attachment"}</button></div></form></DialogFrame>;
}

function EditDialog({ document, categories, onClose, onSubmit }: { document: DocumentView; categories: readonly string[]; onClose: () => void; onSubmit: (form: HTMLFormElement) => void }) { return <DialogFrame title="Edit attachment" eyebrow="File details" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSubmit(event.currentTarget); }} className="mt-6 space-y-5"><Field label="Display name"><input autoFocus required name="displayName" minLength={1} maxLength={160} defaultValue={document.displayName} className={inputClass} /></Field><Field label="Document type"><select name="category" defaultValue={document.category} className={inputClass}>{categories.map((value) => <option key={value} value={value}>{DOCUMENT_CATEGORY_LABELS[value as keyof typeof DOCUMENT_CATEGORY_LABELS]}</option>)}</select></Field><Field label="Note"><textarea name="note" maxLength={500} rows={3} defaultValue={document.note} className={inputClass} /></Field><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-lg bg-surface-container px-5 py-3 text-body-sm font-semibold">Cancel</button><button className="rounded-lg bg-primary px-5 py-3 text-body-sm font-semibold text-on-primary">Save changes</button></div></form></DialogFrame>; }
function ConfirmDialog({ title, onClose, onConfirm, children }: { title: string; onClose: () => void; onConfirm: () => void; children: ReactNode }) { return <DialogFrame title={title} eyebrow="Private attachment" onClose={onClose}><div className="mt-5">{children}</div><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={onClose} className="rounded-lg bg-surface-container px-5 py-3 text-body-sm font-semibold">Keep attachment</button><button onClick={onConfirm} className="rounded-lg bg-error px-5 py-3 text-body-sm font-semibold text-on-error">Delete attachment</button></div></DialogFrame>; }
function DialogFrame({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose?: () => void; children: ReactNode }) { const dialogRef = useModalA11y(onClose); return <div className="fixed inset-0 z-[110] flex items-end justify-center bg-inverse-surface/45 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}><section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="attachment-dialog-title" className="max-h-[94svh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-surface p-6 shadow-2xl sm:rounded-xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-label-sm font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p><h2 id="attachment-dialog-title" className="mt-2 font-serif text-headline-md">{title}</h2></div>{onClose && <button onClick={onClose} aria-label="Close" className="rounded-full bg-surface-container p-2"><WorkspaceIcon name="close" /></button>}</div>{children}</section></div>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="mb-2 block text-label-md font-semibold">{label}</span>{children}</label>; }

async function request<T = unknown>(url: string, init?: RequestInit): Promise<T> { const response = await fetch(url, { ...init, headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error?.message ?? "The attachment request failed."); return payload.data as T; }
function uploadFile(url: string, file: File, headers: Record<string, string>, onProgress: (value: number) => void) { return new Promise<void>((resolve, reject) => { const xhr = new XMLHttpRequest(); xhr.open("PUT", url); Object.entries(headers).forEach(([name, value]) => xhr.setRequestHeader(name, value)); xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); }; xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("The storage provider rejected the upload.")); xhr.onerror = () => reject(new Error("The upload could not reach private storage. Check the R2 CORS configuration.")); xhr.send(file); }); }
function formatSize(bytes: number) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`; return `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)); }
function message(error: unknown) { return error instanceof Error ? error.message : "The attachment request failed."; }
const inputClass = "w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3.5 py-3 text-body-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";
const smallButton = "inline-flex items-center justify-center gap-2 rounded-lg bg-surface-container px-3 py-2 text-label-md font-semibold text-on-surface-variant hover:text-primary";
