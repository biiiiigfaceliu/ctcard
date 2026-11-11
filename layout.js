(function(root) {
  'use strict';
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh', {granularity:'grapheme'}) : null;
  const chars = text => segmenter ? Array.from(segmenter.segment(text), s => s.segment) : Array.from(text);
  const closing = /[，。！？、；：）】》」』”’％%…,.!?;:)\]}>]/u;
  const opening = /[（【《「『“‘(\[{<]/u;
  function legal(a, b) {
    return !closing.test(b || '') && !opening.test(a || '') && !(/[A-Za-z0-9]/.test(a || '') && /[A-Za-z0-9]/.test(b || ''));
  }
  function wrap(text, width, indent, measure) {
    const a = chars(text.trim()), lines = [];
    let start = 0;
    while (start < a.length) {
      const inset = lines.length ? 0 : indent;
      let end = start;
      while (end < a.length && measure(a.slice(start, end + 1).join('')) <= width - inset) end++;
      if (end === start) throw new Error('正文宽度不足，请增大正文宽度或减小字号。');
      if (end < a.length) {
        let split = end;
        function validBoundary(pos) {
          let next=pos, prev=pos-1;
          while(a[next]===' ') next++;
          while(a[prev]===' ') prev--;
          return legal(a[prev],a[next]);
        }
        while (split > start && !validBoundary(split)) split--;
        // Overlong Latin words may wrap internally; punctuation remains attached.
        if (split === start) {
          split = end;
          while (split > start && (closing.test(a[split]) || opening.test(a[split - 1]))) split--;
        }
        if (split === start) throw new Error('这一组标点无法排入当前行，请调整正文宽度。');
        end = split;
      }
      lines.push({text:a.slice(start,end).join('').trimEnd(), indent:inset});
      start = end;
      while (a[start] === ' ') start++;
    }
    if (lines.length > 1) {
      const last = lines[lines.length-1], prev = lines[lines.length-2];
      if (chars(last.text).filter(c=>!closing.test(c)).length < 2) {
        const p = chars(prev.text);
        for (let cut=p.length-1;cut>1;cut--) {
          const moved = p.slice(cut).join('') + last.text;
          if (measure(moved) > width) break;
          if (legal(p[cut-1],p[cut]) && chars(moved).filter(c=>!closing.test(c)).length >= 2) {
            prev.text = p.slice(0,cut).join(''); last.text = moved; break;
          }
        }
      }
    }
    return lines;
  }
  function titleTokens(text) {
    const result=[];
    for (const part of text.match(/[A-Za-z0-9]+(?:['’.-][A-Za-z0-9]+)*|[^A-Za-z0-9]/gu) || []) {
      const latin = /^[A-Za-z0-9]/.test(part);
      result.push({text:part, latin, units:latin ? Math.ceil(part.length*2/3) : 1});
    }
    return result;
  }
  function title(text, count, capacities) {
    const explicit = text.trim().split(/\n/).map(s=>s.trim());
    let rows=[], overflow=[];
    if (explicit.length>1) {
      rows=explicit.slice(0,count).map(titleTokens);
      overflow=explicit.slice(count).flatMap(titleTokens);
      while(rows.length<count) rows.push([]);
    } else {
      const tokens=titleTokens(text.trim() || '词条');
      let at=0;
      for(let i=0;i<count;i++) {
        const remaining=tokens.slice(at).reduce((s,t)=>s+t.units,0);
        const limit=capacities[i] || Math.ceil(remaining/(count-i));
        const row=[]; let used=0;
        while(at<tokens.length) {
          const token=tokens[at];
          if(used+token.units>limit && (row.length || capacities[i])) break;
          row.push(token); used+=token.units; at++;
          if(used>=limit) break;
        }
        rows.push(row);
      }
      overflow.push(...tokens.slice(at));
    }
    const result=rows.map((tokens,i)=>{
      if(capacities[i]) {
        let used=0, end=0;
        while(end<tokens.length && used+tokens[end].units<=capacities[i]) used+=tokens[end++].units;
        overflow.push(...tokens.slice(end)); tokens=tokens.slice(0,end);
      }
      const used=tokens.reduce((s,t)=>s+t.units,0);
      return {tokens, cells:capacities[i] || Math.max(1,used), used};
    });
    result.overflow=overflow.map(t=>t.text).join('');
    return result;
  }
  root.CardLayout={chars,wrap,title,closing,opening};
})(typeof window === 'undefined' ? globalThis : window);
