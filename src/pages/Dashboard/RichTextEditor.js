import React, { useEffect, useRef, useState } from "react";

// A small rich-text editor for post bodies, in place of react-quill: the
// browser's own editing (contentEditable) with a toolbar, plus an HTML view
// for anything the toolbar doesn't cover. It reads and writes the same HTML
// the posts already store. Pasted content is cleaned down to the tags posts
// use, so formatting from other sites doesn't come along.

const BLOCKS = [
  { tag: "p", label: "Text" },
  { tag: "h2", label: "H2" },
  { tag: "h3", label: "H3" },
  { tag: "blockquote", label: "Quote" },
  { tag: "pre", label: "Code" },
];

const INLINE = [
  { command: "bold", label: "B", title: "Bold (⌘B)", className: "is-bold" },
  { command: "italic", label: "I", title: "Italic (⌘I)", className: "is-italic" },
  { command: "underline", label: "U", title: "Underline (⌘U)", className: "is-underline" },
  { command: "strikeThrough", label: "S", title: "Strikethrough", className: "is-strike" },
];

const LISTS = [
  { command: "insertUnorderedList", label: "• List", title: "Bulleted list" },
  { command: "insertOrderedList", label: "1. List", title: "Numbered list" },
];

// --- paste clean-up: keep structure and basic formatting, drop the rest
const KEEP = {
  P: "p", DIV: "p", H1: "h2", H2: "h2", H3: "h3", H4: "h3", H5: "h3", H6: "h3",
  STRONG: "strong", B: "strong", EM: "em", I: "em", U: "u", S: "s", STRIKE: "s", DEL: "s",
  BLOCKQUOTE: "blockquote", PRE: "pre", CODE: "code", UL: "ul", OL: "ol", LI: "li",
  A: "a", IMG: "img", BR: "br",
};
const DROP = new Set(["SCRIPT", "STYLE", "META", "LINK", "TITLE", "HEAD", "NOSCRIPT", "IFRAME", "OBJECT", "SVG"]);
const safeUrl = (url) => (url && /^(https?:|mailto:|\/|#)/i.test(url.trim()) ? url.trim() : null);

const cleanNode = (node, doc) => {
  if (node.nodeType === Node.TEXT_NODE) return doc.createTextNode(node.textContent);
  if (node.nodeType !== Node.ELEMENT_NODE || DROP.has(node.tagName)) return null;
  const tag = KEEP[node.tagName];
  const children = Array.from(node.childNodes).map((child) => cleanNode(child, doc)).filter(Boolean);
  if (!tag) {
    // unknown wrapper (span, font, section...): keep what's inside it
    const frag = doc.createDocumentFragment();
    children.forEach((child) => frag.appendChild(child));
    return frag;
  }
  const el = doc.createElement(tag);
  if (tag === "a") {
    const href = safeUrl(node.getAttribute("href"));
    if (href) el.setAttribute("href", href);
  }
  if (tag === "img") {
    const src = safeUrl(node.getAttribute("src"));
    if (!src) return null;
    el.setAttribute("src", src);
    if (node.getAttribute("alt")) el.setAttribute("alt", node.getAttribute("alt"));
  }
  children.forEach((child) => el.appendChild(child));
  return el;
};

const cleanHtml = (html) => {
  const source = new DOMParser().parseFromString(html, "text/html");
  const out = document.implementation.createHTMLDocument("");
  const wrap = out.createElement("div");
  Array.from(source.body.childNodes).forEach((child) => {
    const clean = cleanNode(child, out);
    if (clean) wrap.appendChild(clean);
  });
  return wrap.innerHTML;
};

// Chrome's editing commands copy computed styles onto what they insert
// (pasted text takes on a code block's font, merged lines keep their old
// size). Posts carry no inline styles, so drop them: styled wrappers are
// unwrapped, other elements just lose the attribute. Links whose address
// was refused are unwrapped too.
const tidy = (root) => {
  root.querySelectorAll("[style]").forEach((el) => {
    if (el.tagName === "SPAN") el.replaceWith(...el.childNodes);
    else el.removeAttribute("style");
  });
  root.querySelectorAll("a:not([href])").forEach((el) => el.replaceWith(...el.childNodes));
};

const escapeHtml = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const RichTextEditor = ({ value, onChange, invalid, id }) => {
  const editorRef = useRef(null);
  const emitted = useRef(null); // the HTML we last reported, to tell our own edits from new values
  const [source, setSource] = useState(false); // HTML view
  const [active, setActive] = useState({});

  // load a new value (e.g. the post arriving) without disturbing typing
  useEffect(() => {
    const el = editorRef.current;
    if (!el || source) return;
    if (value !== emitted.current && el.innerHTML !== value) {
      el.innerHTML = value || "";
      emitted.current = value;
    }
  }, [value, source]);

  useEffect(() => {
    document.execCommand("defaultParagraphSeparator", false, "p");
    // reflect the formatting at the caret in the toolbar
    const onSelection = () => {
      const el = editorRef.current;
      const sel = document.getSelection();
      if (!el || !sel || !sel.anchorNode || !el.contains(sel.anchorNode)) return;
      const next = {};
      INLINE.concat(LISTS).forEach(({ command }) => {
        next[command] = document.queryCommandState(command);
      });
      next.block = String(document.queryCommandValue("formatBlock") || "").toLowerCase();
      setActive(next);
    };
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, []);

  const emit = () => {
    tidy(editorRef.current);
    const html = editorRef.current.innerHTML;
    emitted.current = html;
    onChange(html);
  };

  const run = (command, arg) => {
    editorRef.current.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const setBlock = (tag) => {
    // clicking the block you're in turns it back into plain text
    run("formatBlock", `<${active.block === tag && tag !== "p" ? "p" : tag}>`);
  };

  const addLink = () => {
    const url = safeUrl(window.prompt("Link to (https://…)", "https://"));
    if (!url) return;
    const sel = document.getSelection();
    if (sel && sel.isCollapsed) run("insertHTML", `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`);
    else run("createLink", url);
  };

  const addImage = () => {
    const url = safeUrl(window.prompt("Image address (https://… or /images/…)", "https://"));
    if (url) run("insertImage", url);
  };

  const onPaste = (e) => {
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    e.preventDefault();
    if (html) run("insertHTML", cleanHtml(html));
    else run("insertText", text);
  };

  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      addLink();
    }
  };

  const toggleSource = () => {
    if (source) {
      // back to the editor: it picks up the edited HTML
      setSource(false);
    } else {
      emit();
      setSource(true);
    }
  };

  const tool = (key, label, onClick, { title, on, className } = {}) => (
    <button
      key={key}
      type="button"
      className={`rte-tool${on ? " is-on" : ""}${className ? ` ${className}` : ""}`}
      title={title || label}
      aria-pressed={on === undefined ? undefined : !!on}
      disabled={source && key !== "source"}
      // keep the selection in the editor while clicking the toolbar
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );

  return (
    <div className={`rte holo-input${invalid ? " is-invalid" : ""}${source ? " is-source" : ""}`}>
      <div className="rte-toolbar" role="toolbar" aria-label="Formatting">
        <div className="rte-group">
          {BLOCKS.map(({ tag, label }) => tool(tag, label, () => setBlock(tag), { on: active.block === tag }))}
        </div>
        <div className="rte-group">
          {INLINE.map(({ command, label, title, className }) =>
            tool(command, label, () => run(command), { title, on: active[command], className }),
          )}
        </div>
        <div className="rte-group">
          {LISTS.map(({ command, label, title }) => tool(command, label, () => run(command), { title, on: active[command] }))}
        </div>
        <div className="rte-group">
          {tool("link", "Link", addLink, { title: "Link (⌘K)" })}
          {tool("image", "Image", addImage)}
          {tool("clear", "Clear", () => run("removeFormat"), { title: "Clear formatting" })}
        </div>
        <div className="rte-group">
          {tool("undo", "Undo", () => run("undo"), { title: "Undo (⌘Z)" })}
          {tool("redo", "Redo", () => run("redo"), { title: "Redo (⇧⌘Z)" })}
          {tool("source", "HTML", toggleSource, { title: "Edit the HTML", on: source })}
        </div>
      </div>
      {source ? (
        <textarea
          id={id}
          className="rte-source"
          value={value || ""}
          spellCheck="false"
          onChange={(e) => {
            emitted.current = null; // make the editor reload it on the way back
            onChange(e.target.value);
          }}
        />
      ) : (
        <div
          id={id}
          ref={editorRef}
          className="rte-content"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          onInput={emit}
          onBlur={emit}
          onPaste={onPaste}
          onKeyDown={onKeyDown}
        />
      )}
    </div>
  );
};

export default RichTextEditor;
