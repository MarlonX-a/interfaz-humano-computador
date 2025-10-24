import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

export default function AddContentPage({ textSizeLarge, highContrast }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    title: "",
    type: "",
    tags: [],
    description: "",
    resources: [""],
    safety: "low",
    author: "",
  });
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState({});

  const inputClass = highContrast
    ? "w-full border p-2 rounded bg-black text-yellow-300 border-yellow-300"
    : "w-full border px-3 py-2 rounded";

  const typeOptions = useMemo(() => [
    { value: "molecule", label: t("molecules") },
    { value: "atom", label: t("atoms") },
    { value: "experiment", label: t("experiments") },
    { value: "article", label: t("article") },
  ], [t]);
  const filteredTypeSuggestions = useMemo(() => {
    const q = form.type.toLowerCase();
    if (!q) return typeOptions;
    return typeOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [form.type, typeOptions]);

  const defaultTags = ["reacción", "agua", "orgánica", "inorgánica", "síntesis", "experimental", "ácido", "base"];
  const filteredTagSuggestions = useMemo(() => {
    const q = tagInput.toLowerCase();
    return defaultTags.filter((s) => s.toLowerCase().includes(q) && !form.tags.includes(s));
  }, [tagInput, form.tags]);

  const addResource = () => setForm((s) => ({ ...s, resources: [...s.resources, ""] }));
  const setResource = (idx, val) => setForm((s) => ({ ...s, resources: s.resources.map((r, i) => (i === idx ? val : r)) }));

  const addTag = (tag) => {
    const v = tag.trim();
    if (!v) return;
    if (form.tags.includes(v)) return;
    setForm((s) => ({ ...s, tags: [...s.tags, v] }));
    setTagInput("");
  };
  const removeTag = (tag) => setForm((s) => ({ ...s, tags: s.tags.filter((t) => t !== tag) }));

  const clearForm = () => {
    setForm({
      title: "",
      type: "",
      tags: [],
      description: "",
      resources: [""],
      safety: "low",
      author: "",
    });
    setErrors({});
    setTagInput("");
  };

  const validateFields = () => {
    const e = {};
    if (!form.title || form.title.trim().length < 3) e.title = t("validationTitleRequired");
    if (!form.type) e.type = t("validationTypeRequired");
    setErrors(e);
    return e;
  };

  const save = () => {
    const e = validateFields();
    if (Object.keys(e).length > 0) {
      toast.error(Object.values(e)[0]);
      return;
    }
    toast.success(t("savedToast"));
    clearForm();
  };

  const containerBg = highContrast ? "bg-black text-yellow-300" : "bg-white text-black";

  return (
    <div className="max-w-md mx-auto">
      <h2 className={`${textSizeLarge ? "text-2xl" : "text-xl"} font-semibold mb-4`}>{t("addContent")}</h2>
      <div className={`p-6 rounded shadow ${containerBg}`}>
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); save(); }}>
          <div>
            <label className="block mb-1">{t("titleLabel")}</label>
            <input
              className={inputClass}
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder={t("titlePlaceholder")}
            />
            {errors.title && (
              <p className="text-sm text-red-600 mt-1">{errors.title}</p>
            )}
          </div>
          <div>
            <label className="block mb-1">{t("typeLabel")}</label>
            <input
              className={inputClass}
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              placeholder={t("chooseType")}
            />
            {filteredTypeSuggestions.length > 0 && (
              <div className="border rounded mt-1 bg-white text-black">
                {filteredTypeSuggestions.map((opt) => (
                  <div key={opt.value} className="px-2 py-1 hover:bg-gray-100 cursor-pointer" onClick={() => setForm(f => ({...f, type: opt.label}))}>
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
            {errors.type && (
              <p className="text-sm text-red-600 mt-1">{errors.type}</p>
            )}
          </div>
          <div>
            <label className="block mb-1">{t("tagsLabel")}</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                  <span>{tag}</span>
                  <button type="button" className="ml-2 text-xs" onClick={() => removeTag(tag)}>×</button>
                </span>
              ))}
            </div>
            <input
              className={inputClass}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
              placeholder={t("tagsPlaceholder")}
            />
            {tagInput && filteredTagSuggestions.length > 0 && (
              <div className="border rounded mt-1 bg-white text-black max-h-40 overflow-auto">
                {filteredTagSuggestions.map((s) => (
                  <div key={s} className="px-2 py-1 hover:bg-gray-100 cursor-pointer" onClick={() => addTag(s)}>
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block mb-1">{t("descriptionLabel")}</label>
            <textarea
              className={inputClass}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4}
              placeholder={t("descriptionLabel")}
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
                  onChange={e => setResource(i, e.target.value)}
                  placeholder={t("resourcePlaceholder")}
                />
              ))}
              <button type="button" onClick={addResource} className="text-sm underline mt-1">{t("addResource")}</button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-1/2">
              <label className="block mb-1">{t("safetyLabel")}</label>
              <select
                className={inputClass}
                value={form.safety}
                onChange={e => setForm(f => ({ ...f, safety: e.target.value }))}
              >
                <option value="low">{t("safetyLow")}</option>
                <option value="medium">{t("safetyMedium")}</option>
                <option value="high">{t("safetyHigh")}</option>
              </select>
            </div>
            <div className="w-1/2">
              <label className="block mb-1">{t("authorLabel")}</label>
              <input
                className={inputClass}
                value={form.author}
                onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-4">
            <button type="button" onClick={clearForm} className="px-3 py-2 rounded bg-gray-200 text-black">{t("clearBtn")}</button>
            <button type="submit" className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60" >{t("saveBtn")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
