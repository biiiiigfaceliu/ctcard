'use strict';
var $ = id => document.getElementById(id);
var canvas = $('card'), ctx=canvas.getContext('2d');
var fontStack='"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif';
var sample={term:'聊天多动症',pinyin:'liáo tiān duō dòng zhèng',body:'特指在跟好朋友聊天的时候，一个话题刚扔出去就能毫无征兆地切换到下一个话题，两个人想到啥就往对话框里扔啥，从聊八卦能无缝衔接到我最近买了个衣服然后那个东西好难吃。\n\n没有逻辑，没有重点，彼此还可以毫无障碍地聊下去。'};
var defaults={titleRows:'1',cellSize:'110',cells1:'0',cells2:'0',cells3:'0',rowGap:'24',showPinyin:true,ratio:'4:5',bodySize:'30',lineHeight:'2.6',tracking:'1.5',margin:'72',bodyWidth:'510',padding:'104',sectionGap:'86',resolution:'1080'};
var cardFields=['term','pinyin','body',...Object.keys(defaults)];
var lastLayout=null;
var selectedRows='1';
function num(id) { const el=$(id); const value=el.value===''?Number(defaults[id]):Number(el.value);return Math.min(Number(el.max),Math.max(Number(el.min),value)); }
function measure(text,spacing) { const a=CardLayout.chars(text);return spacing ? a.reduce((s,c)=>s+ctx.measureText(c).width,0)+Math.max(0,a.length-1)*spacing : ctx.measureText(text).width; }
function spacedText(text,x,y,spacing) {
  if(!spacing) {ctx.fillText(text,x,y);return;}
  // Explicit tracking works consistently on older iOS canvas implementations.
  for(const char of CardLayout.chars(text)) {ctx.fillText(char,x,y);x+=ctx.measureText(char).width+spacing;}
}
function centered(text,x,y,size,maxWidth) {
  ctx.font='900 '+size+'px '+fontStack;
  size *= Math.min(1,maxWidth/Math.max(1,ctx.measureText(text).width));
  ctx.font='900 '+size+'px '+fontStack;
  const m=ctx.measureText(text);
  const ascent=m.actualBoundingBoxAscent || size*.8, descent=m.actualBoundingBoxDescent || size*.1;
  ctx.fillText(text,x-m.width/2,y+(ascent-descent)/2);
}
function render() {
  const count=Number($('titleRows').value);
  $('row2-label').hidden=count<2; $('row3-label').hidden=count<3;
  $('pinyin').disabled=!$('showPinyin').checked;
  try {
    const rows=CardLayout.title($('term').value,count,[1,2,3].map(i=>num('cells'+i)));
    const margin=num('margin'),padding=num('padding'),size=num('bodySize'),spacing=num('tracking');
    const maxCells=Math.max(...rows.map(r=>r.cells));
    const cell=Math.min(num('cellSize'),(864-margin*2)/maxCells);
    if(cell<Math.min(76,num('cellSize'))) throw new Error('这一排标题太长。请主动选择两排／三排，或在“格子大小”中调小；当前不会自动换排。');
    const bodyWidth=Math.min(num('bodyWidth'),864-margin*2);
    const lh=size*num('lineHeight');
    ctx.font='400 '+size+'px '+fontStack;ctx.letterSpacing='0px';
    const body=[]; let offset=0;
    const paragraphs=$('body').value.trim().replace(/\r/g,'').split(/\n[ \t]*\n+/).filter(Boolean);
    for(let p=0;p<paragraphs.length;p++) {
      const hardLines=paragraphs[p].split('\n');
      for(let h=0;h<hardLines.length;h++) {
        if(CardLayout.closing.test(CardLayout.chars(hardLines[h].trim())[0] || '')) throw new Error('手动换行后出现了句首标点，请将标点移回上一行。');
        for(const line of CardLayout.wrap(hardLines[h],bodyWidth,h===0?size:0,t=>measure(t,spacing))) {
          body.push({...line,y:offset}); offset+=lh;
        }
      }
      if(p<paragraphs.length-1) offset+=size*.85;
    }
    const rowGap=num('rowGap');
    const titleBottom=padding+count*cell+(count-1)*rowGap;
    const pinyin=$('showPinyin').checked ? $('pinyin').value.trim() : '';
    const bodyY=titleBottom+(pinyin?52:0)+(body.length?num('sectionGap'):0);
    const bodyHeight=body.length ? offset-lh+size*1.2 : 0;
    const needed=Math.ceil(bodyY+bodyHeight+padding);
    const ratio=$('ratio').value;
    const targetHeight=ratio==='auto'?needed:Math.round(864*Number(ratio.split(':')[1])/Number(ratio.split(':')[0]));
    const height=Math.max(targetHeight,needed);
    if(height>8000) throw new Error('正文过长，请分成多张词卡。');
    const scale=Number($('resolution').value)/864;
    canvas.width=Number($('resolution').value);canvas.height=Math.ceil(height*scale);ctx.scale(scale,scale);ctx.letterSpacing='0px';
    ctx.fillStyle='#fff';ctx.fillRect(0,0,864,height);
    ctx.textBaseline='alphabetic';ctx.textAlign='left';
    for(let r=0;r<rows.length;r++) {
      const row=rows[r],left=(864-row.cells*cell)/2,top=padding+r*(cell+rowGap);
      ctx.strokeStyle='#ff2727';ctx.lineWidth=1.1;
      for(let i=0;i<row.cells;i++) {
        const x=left+i*cell;
        ctx.strokeRect(x,top,cell,cell);ctx.beginPath();
        ctx.moveTo(x,top);ctx.lineTo(x+cell,top+cell);ctx.moveTo(x+cell,top);ctx.lineTo(x,top+cell);
        ctx.moveTo(x+cell/2,top);ctx.lineTo(x+cell/2,top+cell);ctx.moveTo(x,top+cell/2);ctx.lineTo(x+cell,top+cell/2);ctx.stroke();
      }
      let x=left+Math.floor((row.cells-row.used)/2)*cell;
      ctx.fillStyle='#000';
      for(const token of row.tokens) {
        const width=token.units*cell;
        centered(token.text,x+width/2,top+cell/2,cell*.84,width-cell*.10);x+=width;
      }
    }
    if(pinyin) {
      ctx.font='700 20px Arial,'+fontStack;ctx.fillStyle='#111';
      const w=ctx.measureText(pinyin).width;
      if(w>864-margin*2) ctx.font='700 '+(20*(864-margin*2)/w)+'px Arial,'+fontStack;
      ctx.fillText(pinyin,(864-ctx.measureText(pinyin).width)/2,titleBottom+40);
    }
    ctx.font='400 '+size+'px '+fontStack;ctx.fillStyle='#111';
    for(const line of body) spacedText(line.text,(864-bodyWidth)/2+line.indent,bodyY+size+line.y,spacing);
    lastLayout={rows,cell,body,bodyWidth,size,spacing,height,needed,bodyY,padding,rowGap,pinyin,overflow:rows.overflow};
    $('title-status').textContent=rows.overflow ? '未排入标题：'+rows.overflow+'。请增加格数或调整换行，补齐后即可保存。' : '0 = 自动格数 · 当前 '+rows.map(r=>r.cells).join(' / ')+' 格';
    $('title-status').classList.toggle('warning',!!rows.overflow);
    $('layout-status').textContent=rows.overflow ? $('title-status').textContent : canvas.width+' × '+canvas.height+' px'+(height>targetHeight?' · 已自动加高，保留完整内容':'');
    $('download').disabled=!!rows.overflow;
  } catch(e) {
    lastLayout=null;canvas.width=864;canvas.height=360;ctx.fillStyle='#fff';ctx.fillRect(0,0,864,360);
    ctx.fillStyle='#777';ctx.font='24px '+fontStack;ctx.textAlign='center';ctx.fillText('请调整排版后预览',432,180);
    $('layout-status').textContent=e.message;$('download').disabled=true;
  }
}
function filename() {return ($('term').value.trim().replace(/[\\/:*?"<>|\r\n]/g,'')||'词卡')+'.png';}
function setSetting(id,value) {if($(id).type==='checkbox') $(id).checked=Boolean(value);else $(id).value=value;}
function reset() {for(const [id,value] of Object.entries({...sample,...defaults})) setSetting(id,value);selectedRows=$('titleRows').value;render();}
reset();
function changeRows() {
  const next=$('titleRows').value;
  if(next===selectedRows) return;
  selectedRows=next;
  for(let i=1;i<=3;i++) $('cells'+i).value=Number(next)>1?'4':'0';
}
$('titleRows').addEventListener('input',changeRows);
$('titleRows').addEventListener('change',changeRows);
cardFields.forEach(id=>{ $(id).addEventListener('input',render);$(id).addEventListener('change',render); });
render();
