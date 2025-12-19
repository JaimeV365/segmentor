import React, { useState, useRef, useEffect } from 'react';
import { SquarePen, Bold, Underline, Palette, Highlighter, X, Plus, Trash2 } from 'lucide-react';
import './EditableText.css';

interface EditableTextProps {
  content: string;
  id: string;
  isPremium: boolean;
  onSave: (id: string, content: string) => void;
  onDelete?: (id: string) => void; // Optional callback to delete entire component
  className?: string;
  tag?: 'p' | 'span' | 'div';
}

export const EditableText: React.FC<EditableTextProps> = ({
  content,
  id,
  isPremium,
  onSave,
  onDelete,
  className = '',
  tag = 'p'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [originalContent, setOriginalContent] = useState(content);
  const [originalBackgroundColor, setOriginalBackgroundColor] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string | null>(null);
  const [hexTextColor, setHexTextColor] = useState('');
  const [hexHighlightColor, setHexHighlightColor] = useState('');
  const [hexBackgroundColor, setHexBackgroundColor] = useState('');
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const paragraphRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Helper function to split content into paragraphs
  // Only split if there are actual separate <p> tags, otherwise treat as single container
  const splitIntoParagraphs = (html: string): string[] => {
    // Try to split by <p> tags - only if there are multiple distinct paragraphs
    const pMatches = html.match(/<p[^>]*>(.*?)<\/p>/gi);
    if (pMatches && pMatches.length > 1) {
      // Multiple paragraphs - split them
      return pMatches.map(p => {
        // Extract inner content, preserving any formatting
        const innerContent = p.replace(/<\/?p[^>]*>/gi, '').trim();
        return innerContent;
      }).filter(p => p.length > 0);
    }
    
    // Single container - don't split by sentences, treat as one editable block
    return [html];
  };

  // Load saved content from localStorage and initialize paragraphs
  useEffect(() => {
    const saved = localStorage.getItem(`editable-text-${id}`);
    let contentToUse = content;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.content) {
          contentToUse = parsed.content;
          setEditedContent(parsed.content);
          setOriginalContent(parsed.content);
        }
        if (parsed.backgroundColor) {
          setBackgroundColor(parsed.backgroundColor);
          setOriginalBackgroundColor(parsed.backgroundColor);
        }
      } catch (e) {
        // Ignore parse errors
      }
    } else {
      setEditedContent(content);
      setOriginalContent(content);
    }
    // Always split into paragraphs - if no <p> tags, treat entire content as one paragraph
    const parsed = splitIntoParagraphs(contentToUse);
    // If we got just one paragraph but it's the full content, that's fine - user can add more
    setParagraphs(parsed.length > 0 ? parsed : [contentToUse]);
  }, [id, content]);

  // Update editedContent when content prop changes
  useEffect(() => {
    if (!isEditing) {
      const saved = localStorage.getItem(`editable-text-${id}`);
      if (!saved) {
        setEditedContent(content);
        setOriginalContent(content);
      }
    }
  }, [content, id, isEditing]);

  // Save to localStorage when content changes
  useEffect(() => {
    if (editedContent !== content || backgroundColor) {
      localStorage.setItem(`editable-text-${id}`, JSON.stringify({
        content: editedContent,
        backgroundColor
      }));
    }
  }, [editedContent, backgroundColor, id, content]);

  const handleEdit = () => {
    setIsEditing(true);
    setOriginalContent(editedContent);
    setOriginalBackgroundColor(backgroundColor);
    setTimeout(() => {
      editorRef.current?.focus();
    }, 0);
  };

  const handleSave = () => {
    // Collect content from all paragraph editors if in paragraph mode
    let htmlContent: string;
    if (paragraphs.length > 0 && paragraphRefs.current.length > 0) {
      const allParagraphs = paragraphRefs.current
        .filter(ref => ref !== null)
        .map(ref => ref!.innerHTML.trim())
        .filter(html => html.length > 0);
      htmlContent = allParagraphs.length > 0 
        ? allParagraphs.map(p => `<p>${p}</p>`).join('')
        : (editorRef.current?.innerHTML || '');
    } else {
      htmlContent = editorRef.current?.innerHTML || '';
    }
    setEditedContent(htmlContent);
    onSave(id, htmlContent);
    setIsEditing(false);
    setHexTextColor('');
    setHexHighlightColor('');
    setHexBackgroundColor('');
  };

  const handleCancel = () => {
    // Restore original content and background color
    if (editorRef.current) {
      editorRef.current.innerHTML = originalContent;
      editorRef.current.style.backgroundColor = originalBackgroundColor || '';
    }
    setEditedContent(originalContent);
    setBackgroundColor(originalBackgroundColor);
    setIsEditing(false);
    setHexTextColor('');
    setHexHighlightColor('');
    setHexBackgroundColor('');
  };

  const handleReset = () => {
    // Reset to original content prop (remove all customizations)
    const parsed = splitIntoParagraphs(content);
    setParagraphs(parsed);
    if (editorRef.current) {
      editorRef.current.innerHTML = content;
      editorRef.current.style.backgroundColor = '';
    }
    setEditedContent(content);
    setOriginalContent(content);
    setBackgroundColor(null);
    setOriginalBackgroundColor(null);
    setIsEditing(false);
    setHexTextColor('');
    setHexHighlightColor('');
    setHexBackgroundColor('');
    // Remove from localStorage
    localStorage.removeItem(`editable-text-${id}`);
  };

  const handleDeleteParagraph = (index: number) => {
    if (paragraphs.length <= 1) {
      // Don't allow deleting the last paragraph
      return;
    }
    const newParagraphs = paragraphs.filter((_, i) => i !== index);
    setParagraphs(newParagraphs);
    paragraphRefs.current = paragraphRefs.current.filter((_, i) => i !== index);
  };

  const handleInsertParagraph = (index: number) => {
    const newParagraphs = [...paragraphs];
    newParagraphs.splice(index + 1, 0, '');
    setParagraphs(newParagraphs);
    // Focus the new paragraph after insertion
    setTimeout(() => {
      const newIndex = index + 1;
      if (paragraphRefs.current[newIndex]) {
        paragraphRefs.current[newIndex]?.focus();
      }
    }, 0);
  };

  const handleDeleteComponent = () => {
    if (onDelete) {
      setShowDeleteConfirm(true);
    }
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(id);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const applyFormat = (command: string, value?: string, targetRef?: HTMLDivElement | null) => {
    // Find the active editor - either the provided ref, editorRef, or the currently focused paragraph
    let target = targetRef;
    
    if (!target) {
      // Check if we're in paragraph mode and find the focused paragraph
      const activeElement = document.activeElement;
      if (activeElement && paragraphRefs.current.includes(activeElement as HTMLDivElement)) {
        target = activeElement as HTMLDivElement;
      } else {
        // Fall back to editorRef or first paragraph
        target = editorRef.current || paragraphRefs.current.find(ref => ref !== null) || null;
      }
    }
    
    if (!target) return;
    
    const selection = window.getSelection();
    
    // Check if there's a valid selection within the target
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const isSelectionInTarget = target.contains(range.commonAncestorContainer);
      
      if (isSelectionInTarget && !range.collapsed) {
        // Use existing non-empty selection
        document.execCommand(command, false, value);
        target.focus();
        return;
      }
    }
    
    // For color commands, if no selection, select all content in the target
    // For other commands (bold, underline), only apply if there's a selection
    const isColorCommand = command === 'foreColor' || command === 'backColor';
    
    if (isColorCommand) {
      // No valid selection, select all content in the target for color commands
      const range = document.createRange();
      range.selectNodeContents(target);
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.execCommand(command, false, value);
      target.focus();
    } else {
      // For bold/underline, ensure we have a selection first
      // If no selection, try to select the word at cursor or do nothing
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (range.collapsed) {
          // No selection - try to select the word at cursor
          range.selectNodeContents(target);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        document.execCommand(command, false, value);
        target.focus();
      } else {
        // Fallback: select all and apply
        const range = document.createRange();
        range.selectNodeContents(target);
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.execCommand(command, false, value);
        target.focus();
      }
    }
  };

  const applyTextColor = (color: string) => {
    applyFormat('foreColor', color);
  };

  const applyHighlight = (color: string) => {
    applyFormat('backColor', color);
  };

  const applyBackgroundColor = (color: string) => {
    setBackgroundColor(color);
    
    // In paragraph mode, apply to the focused paragraph or first paragraph
    const activeElement = document.activeElement;
    if (activeElement && paragraphRefs.current.includes(activeElement as HTMLDivElement)) {
      (activeElement as HTMLDivElement).style.backgroundColor = color;
    } else if (editorRef.current) {
      editorRef.current.style.backgroundColor = color;
    } else {
      // Fall back to first paragraph if available
      const firstParagraph = paragraphRefs.current.find(ref => ref !== null);
      if (firstParagraph) {
        firstParagraph.style.backgroundColor = color;
      }
    }
  };

  const handleHexColorSubmit = (type: 'text' | 'highlight' | 'background') => {
    let hex: string;
    if (type === 'text') {
      hex = hexTextColor.startsWith('#') ? hexTextColor : `#${hexTextColor}`;
      if (/^#[0-9A-F]{6}$/i.test(hex)) {
        applyTextColor(hex);
        setHexTextColor('');
      }
    } else if (type === 'highlight') {
      hex = hexHighlightColor.startsWith('#') ? hexHighlightColor : `#${hexHighlightColor}`;
      if (/^#[0-9A-F]{6}$/i.test(hex)) {
        applyHighlight(hex);
        setHexHighlightColor('');
      }
    } else {
      hex = hexBackgroundColor.startsWith('#') ? hexBackgroundColor : `#${hexBackgroundColor}`;
      if (/^#[0-9A-F]{6}$/i.test(hex)) {
        applyBackgroundColor(hex);
        setHexBackgroundColor('');
      }
    }
  };

  // Debug: Log premium status
  useEffect(() => {
    if (isPremium) {
      console.log(`[EditableText] Premium mode enabled for text ID: ${id}`);
    }
  }, [isPremium, id]);

  const Tag = tag;

  // Editing (add, edit, delete paragraphs) is TM-exclusive - only premium users can edit

  if (isEditing) {
    // Always use paragraph-based editing in edit mode for premium users
    // This allows adding/removing containers even with single paragraph content
    // If we have multiple paragraphs, use them; otherwise, treat the single content as one paragraph
    const useParagraphMode = true; // Always use paragraph mode when editing
    
    return (
      <div className={`editable-text-editor ${className}`} ref={containerRef}>
        <div className="editable-text-toolbar">
          <button
            type="button"
            className="toolbar-button"
            onClick={() => applyFormat('bold')}
            title="Bold"
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => applyFormat('underline')}
            title="Underline"
          >
            <Underline size={14} />
          </button>
          <div className="toolbar-separator" />
          
          {/* Text Color - TM Agent only */}
          {isPremium && (
          <div className="color-picker-wrapper">
            <button
              type="button"
              className="toolbar-button"
              title="Text Color"
            >
              <Palette size={14} />
            </button>
            <div className="color-picker-menu">
              {['#000000', '#374151', '#059669', '#dc2626', '#2563eb', '#7c3aed'].map(color => (
                <button
                  key={color}
                  type="button"
                  className="color-option"
                  style={{ backgroundColor: color }}
                  onClick={() => applyTextColor(color)}
                  title={color}
                />
              ))}
              <div className="hex-input-wrapper">
                <input
                  type="text"
                  placeholder="#000000"
                  value={hexTextColor}
                  onChange={(e) => setHexTextColor(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleHexColorSubmit('text');
                    }
                  }}
                  className="hex-color-input"
                />
                <button
                  type="button"
                  className="hex-submit-button"
                  onClick={() => handleHexColorSubmit('text')}
                  title="Apply"
                >
                  ✓
                </button>
              </div>
              <button
                type="button"
                className="color-option reset"
                onClick={() => applyFormat('removeFormat')}
                title="Reset color"
              >
                <X size={12} />
              </button>
            </div>
          </div>
          )}

          {/* Highlight (selected text) - TM Agent only */}
          {isPremium && (
          <div className="color-picker-wrapper">
            <button
              type="button"
              className="toolbar-button"
              title="Highlight Selected Text"
            >
              <Highlighter size={14} />
            </button>
            <div className="color-picker-menu">
              {['#fef08a', '#fecaca', '#c7d2fe', '#bbf7d0', '#fde68a'].map(color => (
                <button
                  key={color}
                  type="button"
                  className="color-option"
                  style={{ backgroundColor: color }}
                  onClick={() => applyHighlight(color)}
                  title={color}
                />
              ))}
              <div className="hex-input-wrapper">
                <input
                  type="text"
                  placeholder="#fef08a"
                  value={hexHighlightColor}
                  onChange={(e) => setHexHighlightColor(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleHexColorSubmit('highlight');
                    }
                  }}
                  className="hex-color-input"
                />
                <button
                  type="button"
                  className="hex-submit-button"
                  onClick={() => handleHexColorSubmit('highlight')}
                  title="Apply"
                >
                  ✓
                </button>
              </div>
              <button
                type="button"
                className="color-option reset"
                onClick={() => applyFormat('removeFormat')}
                title="Remove highlight"
              >
                <X size={12} />
              </button>
            </div>
          </div>
          )}

          {/* Background Color (whole paragraph) - TM Agent only */}
          {isPremium && (
          <div className="color-picker-wrapper">
            <button
              type="button"
              className="toolbar-button"
              title="Background Color"
            >
              <div className="background-color-icon" />
            </button>
            <div className="color-picker-menu">
              {['#ffffff', '#f9fafb', '#f3f4f6', '#e5e7eb'].map(color => (
                <button
                  key={color}
                  type="button"
                  className="color-option"
                  style={{ backgroundColor: color }}
                  onClick={() => applyBackgroundColor(color)}
                  title={color}
                />
              ))}
              <div className="hex-input-wrapper">
                <input
                  type="text"
                  placeholder="#ffffff"
                  value={hexBackgroundColor}
                  onChange={(e) => setHexBackgroundColor(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleHexColorSubmit('background');
                    }
                  }}
                  className="hex-color-input"
                />
                <button
                  type="button"
                  className="hex-submit-button"
                  onClick={() => handleHexColorSubmit('background')}
                  title="Apply"
                >
                  ✓
                </button>
              </div>
              <button
                type="button"
                className="color-option reset"
                onClick={() => applyBackgroundColor('')}
                title="Reset background"
              >
                <X size={12} />
              </button>
            </div>
          </div>
          )}

          <div className="toolbar-actions">
            <button
              type="button"
              className="toolbar-button reset"
              onClick={handleReset}
              title="Reset to original"
            >
              Reset
            </button>
            <button
              type="button"
              className="toolbar-button save"
              onClick={handleSave}
              title="Save"
            >
              Save
            </button>
            <button
              type="button"
              className="toolbar-button cancel"
              onClick={handleCancel}
              title="Discard changes"
            >
              Discard
            </button>
          </div>
        </div>
        {useParagraphMode ? (
          <div className="paragraphs-container">
            {paragraphs.map((para, index) => (
              <div key={index} className="paragraph-wrapper">
                <div
                  ref={el => paragraphRefs.current[index] = el}
                  className="editable-text-input paragraph-input"
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: para }}
                  onKeyDown={(e) => {
                    // Allow Enter to create new paragraph
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleInsertParagraph(index);
                    }
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div
            ref={editorRef}
            className="editable-text-input"
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => {
              // Content is automatically updated via contentEditable
            }}
            dangerouslySetInnerHTML={{ __html: editedContent }}
            style={{
              backgroundColor: backgroundColor || undefined
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`editable-text-container ${className}`}
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Tag
        className="editable-text-content"
        dangerouslySetInnerHTML={{ __html: editedContent }}
        style={backgroundColor ? { backgroundColor } : undefined}
      />
      {isHovered && isPremium && (
        <>
          <button
            className="editable-text-edit-button"
            onClick={handleEdit}
            title="Edit text"
            aria-label="Edit text"
            type="button"
          >
            <SquarePen size={14} />
          </button>
          {onDelete && (
            <button
              className="editable-text-delete-button"
              onClick={handleDeleteComponent}
              title="Delete section"
              aria-label="Delete section"
              type="button"
            >
              <Trash2 size={14} />
            </button>
          )}
        </>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={handleCancelDelete}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm-header">
              <h3>Delete Section</h3>
            </div>
            <div className="delete-confirm-content">
              <p>Are you sure you want to delete this section?</p>
            </div>
            <div className="delete-confirm-actions">
              <button
                type="button"
                className="delete-confirm-btn cancel"
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
              <button
                type="button"
                className="delete-confirm-btn confirm"
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
