import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading2,
  Heading3,
  Type,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RemoveFormatting,
  Undo,
  Redo,
  Highlighter,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  label?: string;
  helperText?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Type your content here...',
  minHeight = '180px',
  label,
  helperText,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Active formatting state for buttons
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    insertUnorderedList: false,
    insertOrderedList: false,
    blockquote: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
  });

  const updateActiveFormats = useCallback(() => {
    try {
      let inBlockquote = false;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && editorRef.current) {
        let node: Node | null = selection.anchorNode;
        while (node && node !== editorRef.current) {
          if (node.nodeName === 'BLOCKQUOTE') {
            inBlockquote = true;
            break;
          }
          node = node.parentNode;
        }
      }

      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        insertOrderedList: document.queryCommandState('insertOrderedList'),
        blockquote: inBlockquote,
        justifyLeft: document.queryCommandState('justifyLeft'),
        justifyCenter: document.queryCommandState('justifyCenter'),
        justifyRight: document.queryCommandState('justifyRight'),
      });
    } catch {
      // Ignore if document selection is unavailable
    }
  }, []);

  // Sync external value with contentEditable on load or external reset
  useEffect(() => {
    if (editorRef.current) {
      if (!isInternalChange.current) {
        if (editorRef.current.innerHTML !== (value || '')) {
          editorRef.current.innerHTML = value || '';
        }
      }
      isInternalChange.current = false;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      const html = editorRef.current.innerHTML;
      // If empty or just <br> / <p><br></p>, treat as empty string
      if (html === '<br>' || html === '<p><br></p>' || html.trim() === '') {
        onChange('');
      } else {
        onChange(html);
      }
      updateActiveFormats();
    }
  };

  // Prevent mousedown on buttons from stealing focus & collapsing the text selection
  const handleButtonMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const exec = (command: string, arg: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, arg);
    handleInput();
    updateActiveFormats();
  };

  const toggleList = (command: 'insertUnorderedList' | 'insertOrderedList') => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    const currentHtml = editorRef.current?.innerHTML.trim() || '';
    if (!currentHtml || currentHtml === '<br>' || currentHtml === '<p><br></p>') {
      const tag = command === 'insertUnorderedList' ? 'ul' : 'ol';
      if (editorRef.current) {
        editorRef.current.innerHTML = `<${tag}><li>List item 1</li></${tag}><p><br></p>`;
        handleInput();
        updateActiveFormats();
        return;
      }
    }

    try {
      document.execCommand(command, false);
    } catch {
      // Fallback
    }

    // Verify if list command worked; if not, wrap selection or insert list element
    const tag = command === 'insertUnorderedList' ? 'ul' : 'ol';
    const selection = window.getSelection();
    let insideList = false;
    if (selection && selection.rangeCount > 0 && editorRef.current) {
      let node: Node | null = selection.anchorNode;
      while (node && node !== editorRef.current) {
        if (node.nodeName === 'UL' || node.nodeName === 'OL') {
          insideList = true;
          break;
        }
        node = node.parentNode;
      }
    }

    if (!insideList && editorRef.current) {
      const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      if (range && editorRef.current.contains(range.commonAncestorContainer)) {
        const text = range.toString().trim();
        const listEl = document.createElement(tag);
        const li = document.createElement('li');
        li.textContent = text || 'List item';
        listEl.appendChild(li);
        range.deleteContents();
        range.insertNode(listEl);
      }
    }

    handleInput();
    updateActiveFormats();
  };

  const toggleQuoteBox = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    const selection = window.getSelection();
    let inBlockquote = false;
    let bqNode: HTMLElement | null = null;
    if (selection && selection.rangeCount > 0 && editorRef.current) {
      let node: Node | null = selection.anchorNode;
      while (node && node !== editorRef.current) {
        if (node.nodeName === 'BLOCKQUOTE') {
          inBlockquote = true;
          bqNode = node as HTMLElement;
          break;
        }
        node = node.parentNode;
      }
    }

    if (inBlockquote && bqNode) {
      // Revert from blockquote back to paragraph
      let reverted = false;
      try {
        reverted = document.execCommand('formatBlock', false, '<p>');
      } catch {
        // continue
      }
      if (!reverted) {
        try {
          reverted = document.execCommand('formatBlock', false, 'p');
        } catch {
          // continue
        }
      }
      if (bqNode.parentNode) {
        const p = document.createElement('p');
        p.innerHTML = bqNode.innerHTML || '<br>';
        bqNode.parentNode.replaceChild(p, bqNode);
      }
    } else {
      // Apply blockquote
      let applied = false;
      try {
        applied = document.execCommand('formatBlock', false, 'blockquote');
      } catch {
        // continue
      }
      if (!applied) {
        try {
          applied = document.execCommand('formatBlock', false, '<blockquote>');
        } catch {
          // continue
        }
      }

      // Check if current selection is now inside a blockquote
      let nowInBlockquote = false;
      if (selection && selection.rangeCount > 0 && editorRef.current) {
        let node: Node | null = selection.anchorNode;
        while (node && node !== editorRef.current) {
          if (node.nodeName === 'BLOCKQUOTE') {
            nowInBlockquote = true;
            break;
          }
          node = node.parentNode;
        }
      }

      // If formatBlock didn't wrap in blockquote, manually wrap selection or insert quote box
      if (!nowInBlockquote && editorRef.current) {
        const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        if (range && editorRef.current.contains(range.commonAncestorContainer)) {
          const selectedText = range.toString().trim();
          const bq = document.createElement('blockquote');
          if (selectedText) {
            bq.innerHTML = `<p>${selectedText}</p>`;
            range.deleteContents();
            range.insertNode(bq);
          } else {
            bq.innerHTML = '<p>Important note, key principle, or formula callout here...</p>';
            range.insertNode(bq);
          }
        } else {
          editorRef.current.innerHTML += '<blockquote><p>Important note, key principle, or formula callout here...</p></blockquote><p><br></p>';
        }
      }
    }
    handleInput();
    updateActiveFormats();
  };

  const applyHighlight = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    // Toggle highlight using hiliteColor
    try {
      document.execCommand('hiliteColor', false, '#fef08a'); // soft yellow highlight
    } catch {
      document.execCommand('backColor', false, '#fef08a');
    }
    handleInput();
  };

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold uppercase text-slate-700">
            {label}
          </label>
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
            Rich Visual Editor (No HTML Required)
          </span>
        </div>
      )}

      <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs focus-within:border-[#0F2A4A] focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        {/* Visual Formatting Toolbar */}
        <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 text-slate-700 select-none">
          {/* Quick Paragraph / Headings */}
          <div className="flex items-center bg-slate-200/60 p-0.5 rounded-lg mr-1">
            <button
              type="button"
              onMouseDown={handleButtonMouseDown}
              onClick={() => exec('formatBlock', '<p>')}
              className="px-2 py-1 rounded text-xs font-medium hover:bg-white text-slate-700 flex items-center gap-1 transition-all"
              title="Normal Paragraph text"
            >
              <Type className="w-3.5 h-3.5" /> Normal
            </button>
            <button
              type="button"
              onMouseDown={handleButtonMouseDown}
              onClick={() => exec('formatBlock', '<h2>')}
              className="px-2 py-1 rounded text-xs font-bold hover:bg-white text-[#0F2A4A] flex items-center gap-1 transition-all"
              title="Large Header"
            >
              <Heading2 className="w-3.5 h-3.5" /> Header
            </button>
            <button
              type="button"
              onMouseDown={handleButtonMouseDown}
              onClick={() => exec('formatBlock', '<h3>')}
              className="px-2 py-1 rounded text-xs font-bold hover:bg-white text-slate-700 flex items-center gap-1 transition-all"
              title="Subheading"
            >
              <Heading3 className="w-3.5 h-3.5" /> Subhead
            </button>
          </div>

          <div className="w-px h-5 bg-slate-300 mx-0.5" />

          {/* Primary Formatting: Bold, Underline, Italic */}
          <button
            type="button"
            onMouseDown={handleButtonMouseDown}
            onClick={() => exec('bold')}
            className={`p-1.5 rounded-md font-bold transition-all flex items-center gap-1 text-xs px-2 ${
              activeFormats.bold
                ? 'bg-[#0F2A4A] text-white shadow-2xs'
                : 'hover:bg-slate-200 text-slate-800'
            }`}
            title="Bold (Ctrl+B) - Make selected text bold"
          >
            <Bold className="w-4 h-4" />
            <span className="font-bold">Bold</span>
          </button>

          <button
            type="button"
            onMouseDown={handleButtonMouseDown}
            onClick={() => exec('underline')}
            className={`p-1.5 rounded-md underline transition-all flex items-center gap-1 text-xs px-2 ${
              activeFormats.underline
                ? 'bg-[#0F2A4A] text-white shadow-2xs'
                : 'hover:bg-slate-200 text-slate-800'
            }`}
            title="Underline (Ctrl+U) - Underline selected text"
          >
            <Underline className="w-4 h-4" />
            <span className="underline">Underline</span>
          </button>

          <button
            type="button"
            onMouseDown={handleButtonMouseDown}
            onClick={() => exec('italic')}
            className={`p-1.5 rounded-md italic transition-all ${
              activeFormats.italic
                ? 'bg-[#0F2A4A] text-white shadow-2xs'
                : 'hover:bg-slate-200 text-slate-700'
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            type="button"
            onMouseDown={handleButtonMouseDown}
            onClick={() => exec('strikeThrough')}
            className={`p-1.5 rounded-md transition-all ${
              activeFormats.strikeThrough
                ? 'bg-[#0F2A4A] text-white shadow-2xs'
                : 'hover:bg-slate-200 text-slate-700'
            }`}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <button
            type="button"
            onMouseDown={handleButtonMouseDown}
            onClick={applyHighlight}
            className="p-1.5 rounded-md hover:bg-yellow-100 text-yellow-800 transition-all flex items-center gap-1 text-xs px-2"
            title="Highlight Text with Yellow marker"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-600" />
            <span>Highlight</span>
          </button>

          <div className="w-px h-5 bg-slate-300 mx-0.5" />

          {/* Lists & Quote Box */}
          <button
            type="button"
            onMouseDown={handleButtonMouseDown}
            onClick={() => toggleList('insertUnorderedList')}
            className={`p-1.5 rounded-md transition-all flex items-center gap-1.5 text-xs px-2.5 ${
              activeFormats.insertUnorderedList
                ? 'bg-[#0F2A4A] text-white shadow-2xs font-semibold'
                : 'hover:bg-slate-200 text-slate-700'
            }`}
            title="Bulleted List (• item)"
          >
            <List className="w-4 h-4 text-emerald-600" />
            <span className="text-xs">Bulleted List</span>
          </button>

          <button
            type="button"
            onMouseDown={handleButtonMouseDown}
            onClick={() => toggleList('insertOrderedList')}
            className={`p-1.5 rounded-md transition-all flex items-center gap-1.5 text-xs px-2.5 ${
              activeFormats.insertOrderedList
                ? 'bg-[#0F2A4A] text-white shadow-2xs font-semibold'
                : 'hover:bg-slate-200 text-slate-700'
            }`}
            title="Numbered List (1, 2, 3...)"
          >
            <ListOrdered className="w-4 h-4 text-blue-600" />
            <span className="text-xs">Numbered List</span>
          </button>

          <button
            type="button"
            onMouseDown={handleButtonMouseDown}
            onClick={toggleQuoteBox}
            className={`p-1.5 rounded-md transition-all flex items-center gap-1.5 text-xs px-2.5 ${
              activeFormats.blockquote
                ? 'bg-[#0F2A4A] text-white shadow-2xs font-semibold'
                : 'hover:bg-slate-200 text-slate-700'
            }`}
            title="Quote Box / Callout Box (Highlights formulas, laws, or quotes in an emerald box)"
          >
            <Quote className="w-4 h-4 text-emerald-600" />
            <span className="text-xs">Quote Box</span>
          </button>

          <div className="w-px h-5 bg-slate-300 mx-0.5" />

          {/* Alignment */}
          <button
            type="button"
            onMouseDown={handleButtonMouseDown}
            onClick={() => exec('justifyLeft')}
            className={`p-1.5 rounded-md transition-all ${
              activeFormats.justifyLeft
                ? 'bg-[#0F2A4A] text-white'
                : 'hover:bg-slate-200 text-slate-700'
            }`}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onMouseDown={handleButtonMouseDown}
            onClick={() => exec('justifyCenter')}
            className={`p-1.5 rounded-md transition-all ${
              activeFormats.justifyCenter
                ? 'bg-[#0F2A4A] text-white'
                : 'hover:bg-slate-200 text-slate-700'
            }`}
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>

          <button
            type="button"
            onMouseDown={handleButtonMouseDown}
            onClick={() => exec('justifyRight')}
            className={`p-1.5 rounded-md transition-all ${
              activeFormats.justifyRight
                ? 'bg-[#0F2A4A] text-white'
                : 'hover:bg-slate-200 text-slate-700'
            }`}
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-300 mx-0.5" />

          {/* Clear & Undo/Redo */}
          <button
            type="button"
            onMouseDown={handleButtonMouseDown}
            onClick={() => exec('removeFormat')}
            className="p-1.5 rounded-md hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-all"
            title="Remove Formatting from Selection"
          >
            <RemoveFormatting className="w-4 h-4" />
          </button>

          <button
            type="button"
            onMouseDown={handleButtonMouseDown}
            onClick={() => exec('undo')}
            className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 transition-all"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>

          <button
            type="button"
            onMouseDown={handleButtonMouseDown}
            onClick={() => exec('redo')}
            className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 transition-all"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>

        {/* ContentEditable WYSIWYG Writing Canvas */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          style={{ minHeight }}
          className="p-4 text-sm text-slate-800 focus:outline-hidden rich-editor-canvas rich-text-content leading-relaxed"
          data-placeholder={placeholder}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <p>
          {helperText ||
            'Highlight text to format with Bold, Underline, Headings, or Lists. No technical HTML coding needed.'}
        </p>
        <span className="text-slate-400">Shortcuts: Ctrl+B (Bold) • Ctrl+U (Underline)</span>
      </div>
    </div>
  );
};
