import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
  open: boolean;
  onClose: () => void;
  textSizeLarge: boolean;
  highContrast: boolean;
};

export default function AddContentModal({ open, onClose, textSizeLarge, highContrast }: Props) {
  const { t } = useTranslation();
  const initial = {
    title: "",
    type: "",
    tags: "",
    description: "",
    resources: [""],
    safety: "low",
    author: "",
  };

  const [form, setForm] = useState(initial);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        modalRef.current?.querySelector<HTMLInputElement>("input")?.focus();
      }, 100);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setField = (k: string, v: any) => setForm((s) => ({ ...s, [k]: v }));

  const addResource = () => setForm((s) => ({ ...s, resources: [...s.resources, ""] }));
  const setResource = (idx: number, val: string) =>
    setForm((s) => ({ ...s, resources: s.resources.map((r, i) => (i === idx ? val : r)) }));

  const clearForm = () => {
    setForm(initial);
  };

  const validate = () => {
    if (!form.title || form.title.trim().length < 3) {
      alert(t("validationTitleRequired"));
      return false;
    }
    if (!form.type) {
      alert(t("validationTypeRequired"));
      return false;
    }
    return true;
  };

  const save = () => {
    if (!validate()) return;
    const key = "tabla_maestra";
    const historyKey = "tabla_maestra_history";
    const stored = JSON.parse(localStorage.getItem(key) || "[]");
    const item = {
      id: Date.now().toString(),
      title: form.title,
      type: form.type,
      tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
      description: form.description,
      resources: form.resources.filter(Boolean),
      safety: form.safety,
      author: form.author,
      createdAt: new Date().toISOString(),
    };
    stored.push(item);
    localStorage.setItem(key, JSON.stringify(stored));

    const history = JSON.parse(localStorage.getItem(historyKey) || "[]");
    history.push({ id: item.id, action: "create", at: new Date().toISOString(), snapshot: item });
    localStorage.setItem(historyKey, JSON.stringify(history));

    alert(t("savedToast"));
    clearForm();
    onClose();
  };

  

  if (!open) return null;

  // classes depending on contrast mode
  const containerBg = highContrast ? "bg-black text-yellow-300" : "bg-white text-black";
  const inputClass = highContrast
    ? "w-full border p-2 rounded bg-black text-yellow-300 border-yellow-300"
    : "w-full border px-3 py-2 rounded";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-content-title"
        className={`relative z-10 mx-4 w-full max-w-md rounded shadow-lg ${containerBg} p-6`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="add-content-title" className={`${textSizeLarge ? "text-2xl" : "text-xl"} font-semibold`}>
            {t("addContent")}
          </h2>
          <button aria-label={t("close")} onClick={onClose} className="p-2 rounded hover:bg-gray-100">
            <X className={highContrast ? "text-yellow-300" : "text-black"} />
          </button>
        </div>

        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div>
            <label className="block mb-1">{t("titleLabel")}</label>
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder={t("titlePlaceholder")}
            />
          </div>

          <div>
            <label className="block mb-1">{t("typeLabel")}</label>
            <select className={inputClass} value={form.type} onChange={(e) => setField("type", e.target.value)}>
              <option value="">{t("chooseType")}</option>
              <option value="molecule">{t("molecules")}</option>
              <option value="atom">{t("atoms")}</option>
              <option value="experiment">{t("experiments")}</option>
              <option value="article">{t("article")}</option>
            </select>
          </div>

          <div>
            <label className="block mb-1">{t("tagsLabel")}</label>
            <input
              className={inputClass}
              value={form.tags}
              onChange={(e) => setField("tags", e.target.value)}
              placeholder={t("tagsPlaceholder")}
            />
          </div>

          <div>
            <label className="block mb-1">{t("descriptionLabel")}</label>
            <textarea
              className={inputClass}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={4}
            />
          </div>

          <div>
            <label className="block mb-1">{t("resourcesLabel")}</label>
            <div className="space-y-2">
              {form.resources.map((r, i) => (
                <input
                  key={i}
                  className={inputClass}
                  value={r}
                  onChange={(e) => setResource(i, e.target.value)}
                  placeholder={t("resourcePlaceholder")}
                />
              ))}
              <button type="button" onClick={addResource} className="text-sm underline">
                {t("addResource")}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="w-1/2 pr-2">
              <label className="block mb-1">{t("safetyLabel")}</label>
              <select className={inputClass} value={form.safety} onChange={(e) => setField("safety", e.target.value)}>
                <option value="low">{t("safetyLow")}</option>
                <option value="medium">{t("safetyMedium")}</option>
                <option value="high">{t("safetyHigh")}</option>
              </select>
            </div>

            <div className="w-1/2 pl-2">
              <label className="block mb-1">{t("authorLabel")}</label>
              <input className={inputClass} value={form.author} onChange={(e) => setField("author", e.target.value)} />
            </div>
          </div>

          <div className="mt-4">
            <button type="submit" className="w-full bg-blue-600 text-white px-4 py-2 rounded">
              {t("saveBtn")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
