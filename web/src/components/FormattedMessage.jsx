import React from 'react';

/**
 * Parses inline bold syntax (**bold text**) into React elements.
 */
const renderInlineFormatting = (text) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-bold text-slate-900 dark:text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

/**
 * Formats AI chat responses into clean, attractive structured cards and text.
 */
const FormattedMessage = ({ content, role }) => {
  if (!content) return null;

  // Split lines and parse blocks
  const lines = content.split('\n');
  const elements = [];
  let currentList = [];

  const flushList = (keyPrefix) => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`${keyPrefix}-list`} className="space-y-1.5 my-2 pl-4 list-disc marker:text-primary">
          {currentList.map((item, i) => (
            <li key={i} className="text-slate-700 leading-relaxed text-sm">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(idx);
      return;
    }

    // Divider line
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushList(idx);
      elements.push(
        <hr key={idx} className="my-3 border-slate-200 dark:border-slate-800" />
      );
      return;
    }

    // Headers (### or ## or #)
    if (trimmed.startsWith('#')) {
      flushList(idx);
      const level = (trimmed.match(/^#+/) || ['#'])[0].length;
      const headerText = trimmed.replace(/^#+\s*/, '');

      if (level === 1) {
        elements.push(
          <h1 key={idx} className="text-xl font-extrabold text-slate-900 my-3 flex items-center gap-2 border-b pb-2 border-slate-200">
            {renderInlineFormatting(headerText)}
          </h1>
        );
      } else if (level === 2) {
        elements.push(
          <h2 key={idx} className="text-lg font-bold text-slate-900 my-2.5 flex items-center gap-2">
            {renderInlineFormatting(headerText)}
          </h2>
        );
      } else {
        elements.push(
          <h3 key={idx} className="text-base font-bold text-primary my-2 flex items-center gap-1.5">
            {renderInlineFormatting(headerText)}
          </h3>
        );
      }
      return;
    }

    // Bullet points (- or * or •)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      const itemText = trimmed.replace(/^[-*•]\s*/, '');
      currentList.push(itemText);
      return;
    }

    // Status cards / Badged metrics (e.g. 🟢 Normal, 🔴 High, 🟡 Low)
    if (trimmed.includes('🟢') || trimmed.includes('🔴') || trimmed.includes('🟡')) {
      flushList(idx);
      let badgeStyle = "bg-slate-100 text-slate-800 border-slate-200";
      if (trimmed.includes('🟢')) badgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-200/80";
      if (trimmed.includes('🔴')) badgeStyle = "bg-rose-50 text-rose-800 border-rose-200/80";
      if (trimmed.includes('🟡')) badgeStyle = "bg-amber-50 text-amber-800 border-amber-200/80";

      elements.push(
        <div key={idx} className={`p-3 my-2 rounded-xl border text-sm font-medium ${badgeStyle}`}>
          {renderInlineFormatting(trimmed)}
        </div>
      );
      return;
    }

    // Numbered list item (e.g. 1. 📋)
    if (/^\d+\.\s/.test(trimmed)) {
      flushList(idx);
      const textAfterNum = trimmed.replace(/^\d+\.\s*/, '');
      elements.push(
        <div key={idx} className="my-2 text-sm font-semibold text-slate-900 flex items-start gap-2">
          <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
            {trimmed.match(/^\d+/)[0]}
          </span>
          <div className="flex-1 pt-0.5">{renderInlineFormatting(textAfterNum)}</div>
        </div>
      );
      return;
    }

    // Default paragraph
    flushList(idx);
    elements.push(
      <p key={idx} className={`text-sm leading-relaxed my-1.5 ${role === 'user' ? 'text-white' : 'text-slate-700'}`}>
        {renderInlineFormatting(trimmed)}
      </p>
    );
  });

  flushList('end');

  return <div className="space-y-1">{elements}</div>;
};

export default FormattedMessage;
