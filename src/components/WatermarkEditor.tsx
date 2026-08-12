// A minimal CodeMirror 6 editor that colors token spans by their watermark
// contribution. Replaces the contentEditable + tint readout in GenerationPane.

import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { prettyToken } from '../lib/pieces';

export interface TokenSpan {
  text: string;
  contribution: number;
}

interface WatermarkEditorProps {
  text: string;
  onTextChange: (text: string) => void;
  tokens: TokenSpan[];
}

// Build a decoration set from token spans. Each token is mapped to the
// character range it occupies in the document text, then decorated with a
// background whose opacity is proportional to its contribution score.
function buildDecorations(view: EditorView, tokens: TokenSpan[]): DecorationSet {
  const doc = view.state.doc.toString();
  const builder: { from: number; to: number; deco: Decoration }[] = [];
  let pos = 0;

  for (const token of tokens) {
    const pretty = prettyToken(token.text);
    if (pretty.length === 0) continue;
    const idx = doc.indexOf(pretty, pos);
    if (idx < 0) continue;
    const alpha = Math.min(0.42, 0.09 * token.contribution);
    builder.push({
      from: idx,
      to: idx + pretty.length,
      deco: Decoration.mark({
        attributes: {
          style: `background-color: rgba(230, 30, 37, ${alpha.toFixed(3)}); border-radius: 2px;`,
        },
      }),
    });
    pos = idx + pretty.length;
  }

  return Decoration.set(
    builder.map((b) => b.deco.range(b.from, b.to)),
    true,
  );
}

// CM6 theme: transparent background, DM Mono font, no chrome.
const editorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
    fontFamily: "'DM Mono', ui-monospace, monospace",
    fontSize: '15px',
    lineHeight: '2',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-content': {
    caretColor: '#232324',
    padding: '0',
    fontFamily: "'DM Mono', ui-monospace, monospace",
    fontSize: '15px',
    lineHeight: '2',
  },
  '.cm-line': {
    padding: '0',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#232324',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(35, 35, 36, 0.15) !important',
  },
});

export default function WatermarkEditor({ text, onTextChange, tokens }: WatermarkEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const tokensRef = useRef<TokenSpan[]>(tokens);
  tokensRef.current = tokens;
  const onTextChangeRef = useRef(onTextChange);
  onTextChangeRef.current = onTextChange;

  // Create the EditorView once on mount.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ViewPlugin that reads tokensRef and recomputes decorations.
    const tokenDecoPlugin = ViewPlugin.define(
      (view) => ({
        decorations: buildDecorations(view, tokensRef.current),
        update(update: ViewUpdate) {
          // Always rebuild — tokens may have changed externally.
          this.decorations = buildDecorations(update.view, tokensRef.current);
        },
      }),
      {
        decorations: (v) => v.decorations,
      },
    );

    const state = EditorState.create({
      doc: text,
      extensions: [
        keymap.of([...defaultKeymap, ...historyKeymap]),
        history(),
        editorTheme,
        EditorView.lineWrapping,
        tokenDecoPlugin,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onTextChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: container });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only mount/unmount — text identity at creation time is captured once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When tokens change, force a decoration update by dispatching a no-op
  // state effect so the ViewPlugin's update() runs.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    // A zero-length replace dispatches a transaction without changing doc text,
    // which triggers the plugin update cycle.
    view.dispatch({ effects: [] });
  }, [tokens]);

  // If external code resets the text (e.g. generation replaces it), push
  // the new content into the editor.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== text) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: text },
      });
    }
  }, [text]);

  return <div ref={containerRef} className="watermark-editor" />;
}
