(() => {
  const fields = cardFields;
  const contentFields = ["term", "pinyin", "body"];
  const key = "citiao-draft-v2";
  let imageUrl;
  let imageFile;
  let exporting = false;
  try {
    const modern = localStorage.getItem(key);
    const saved = JSON.parse(modern || localStorage.getItem("citiao-draft-v1") || "null");
    if (saved && typeof saved === "object") {
      for (const id of contentFields) {
        if (typeof saved[id] !== "string") continue;
        if ($(id).tagName === "SELECT" && !Array.from($(id).options).some(o => o.value === saved[id])) continue;
        $(id).value = saved[id];
      }
      $("draft-status").textContent = "已恢复文字草稿";
    }
  } catch { $("draft-status").textContent = "草稿读取失败，本次仍可制图"; }
  function saveDraft() {
    try {
      localStorage.setItem(key, JSON.stringify(Object.fromEntries(contentFields.map(id => [id, $(id).value]))));
      $("draft-status").textContent = "草稿已保存在本机";
    } catch { $("draft-status").textContent = "本机无法保存草稿，请勿关闭未完成的内容"; }
  }
  fields.forEach(id => $(id).addEventListener("input", saveDraft));
  fields.forEach(id => $(id).addEventListener("change", saveDraft));
  $("reset").addEventListener("click", () => {
    if (!confirm("恢复示例会替换当前文字，确定继续吗？")) return;
    reset(); saveDraft();
  });
  $("preview-toggle").addEventListener("click", () => {
    document.activeElement?.blur(); render();
    document.body.classList.add("preview-mode");
    if (matchMedia("(max-width:900px)").matches) {
      $("back-edit").focus(); window.scrollTo(0, 0);
    }
  });
  $("back-edit").addEventListener("click", () => {
    document.body.classList.remove("preview-mode");
    $("preview-toggle").focus();
  });
  // A mobile preview needs the same save action without duplicating its handler.
  const previewSave = document.createElement("button");
  previewSave.textContent = "保存图片";
  previewSave.id = "preview-save";
  document.querySelector(".preview").append(previewSave);
  async function exportCard() {
    if (exporting) return;
    render();
    if ($("download").disabled) { alert($("layout-status").textContent); return; }
    exporting = true;
    try {
      const blob = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("图片生成失败")), "image/png"));
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      imageUrl = URL.createObjectURL(blob);
      imageFile = new File([blob], filename(), { type:"image/png" });
      $("export-image").src = imageUrl;
      const shareable = !!navigator.canShare?.({ files:[imageFile] });
      $("share-image").hidden = !shareable;
      $("export-status").textContent = shareable ? "可通过分享菜单存储图像，也可以长按上方图片保存。" : "可长按上方图片保存，或下载 PNG。";
      $("export-dialog").showModal();
    } catch { alert("暂时无法生成图片，请重新打开工具后再试。"); }
    finally { exporting = false; }
  }
  $("download").addEventListener("click", exportCard);
  previewSave.addEventListener("click", exportCard);
  $("close-export").addEventListener("click", () => $("export-dialog").close());
  $("share-image").addEventListener("click", async () => {
    if (!imageFile) return;
    try { await navigator.share({ files:[imageFile] }); }
    catch(e) { if (e.name !== "AbortError") $("export-status").textContent = "分享未完成，可以长按图片保存或下载 PNG。"; }
  });
  $("download-image").addEventListener("click", () => {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.href = imageUrl; link.download = imageFile.name;
    document.body.append(link); link.click(); link.remove();
  });
  render();
  window.addEventListener("pageshow", event => {
    if (!event.persisted) return;
    for (const [id, value] of Object.entries(defaults)) setSetting(id, value);
    selectedRows=$("titleRows").value;
    render();
  });
  $("update-app").addEventListener("click", () => { saveDraft(); location.reload(); });
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    let controlled = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (controlled) $("update-app").hidden = false;
      controlled = true;
    });
    navigator.serviceWorker.register("./sw.js").then(() => navigator.serviceWorker.ready).then(reg => {
      const channel = new MessageChannel();
      channel.port1.onmessage = e => {
        $("offline-status").textContent = e.data.ready ? "离线已就绪" : "离线文件不完整，请联网重新打开";
        channel.port1.close();
      };
      reg.active.postMessage({type:"CHECK_OFFLINE"}, [channel.port2]);
    }).catch(() => { $("offline-status").textContent = "离线未就绪，请联网重新打开"; });
  } else { $("offline-status").textContent = "当前打开方式不支持安装离线文件"; }
})();
