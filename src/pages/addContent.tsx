import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import toast from "react-hot-toast";
import heroImage from "../img/quimica1.png";
import { useTranslation } from "react-i18next";

interface RecordType {
  id: number;
  title: string;
  type: string;
  author: string;
  difficulty: string;
  tags: string[];
  description: string;
  resources: string[];
}

interface HistoryType {
  id: number;
  title: string;
  action: string;
  author: string;
  created_at: string;
}

type Difficulty = "fácil" | "media" | "difícil";

export default function AddContentPage({
  textSizeLarge,
  highContrast,
}: {
  textSizeLarge: boolean;
  highContrast: boolean;
}) {
  const { t } = useTranslation();
  
  const [form, setForm] = useState<RecordType>({
    id: 0,
    title: "",
    type: "molecule",
    author: "",
    difficulty: "fácil",
    tags: [],
    description: "",
    resources: [""],
  });
  const [records, setRecords] = useState<RecordType[]>([]);
  const [historial, setHistorial] = useState<HistoryType[]>([]);
  const [filter, setFilter] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);

  const inputClass = "w-full border px-3 py-2 rounded text-black";

  const typeOptions = useMemo(
    () => [
      { value: "molecule", label: t("addcontent.form.typeOptions.molecule") },
      { value: "atom", label: t("addcontent.form.typeOptions.atom") },
      { value: "experiment", label: t("addcontent.form.typeOptions.experiment") },
      { value: "article", label: t("addcontent.form.typeOptions.article") },
    ],
    [t]
  );

  const defaultTags = ["reacción", "agua", "orgánica", "inorgánica", "síntesis", "experimental", "ácido", "base"];
  const filteredTagSuggestions = useMemo(() => {
    const q = tagInput.toLowerCase();
    return defaultTags.filter((s) => s.toLowerCase().includes(q) && !form.tags.includes(s));
  }, [tagInput, form.tags]);

  useEffect(() => {
    fetchRecords();
    fetchHistorial();
  }, []);

  const fetchRecords = async () => {
    const { data, error } = await supabase.from("contenido").select("*");
    if (error) console.error(error);
    else setRecords(data);
  };

  const fetchHistorial = async () => {
    const { data, error } = await supabase.from("historial").select("*").order("created_at", { ascending: false });
    if (error) console.error(error);
    else setHistorial(data);
  };

  const addTag = (tag: string) => {
    const v = tag.trim();
    if (!v || form.tags.includes(v)) return;
    setForm((f) => ({ ...f, tags: [...f.tags, v] }));
    setTagInput("");
  };
  const removeTag = (tag: string) => setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));

  const addResource = () => setForm((f) => ({ ...f, resources: [...f.resources, ""] }));
  const removeResource = (idx: number) => setForm((f) => ({ ...f, resources: f.resources.filter((_, i) => i !== idx) }));
  const setResource = (idx: number, val: string) =>
    setForm((f) => ({ ...f, resources: f.resources.map((r, i) => (i === idx ? val : r)) }));

  const clearForm = () => {
    setForm({
      id: 0,
      title: "",
      type: "molecule",
      author: "",
      difficulty: "fácil",
      tags: [],
      description: "",
      resources: [""],
    });
    setErrors({});
    setIsEditing(false);
    setTagInput("");
  };

  const validateFields = () => {
    const e: Record<string, string> = {};
    if (!form.title || form.title.trim().length < 3) e.title = t("addcontent.validation.titleRequired");
    if (!form.author || form.author.trim().length < 3) e.author = t("addcontent.validation.authorRequired");
    setErrors(e);
    return e;
  };

  const saveRecord = async () => {
    const e = validateFields();
    if (Object.keys(e).length > 0) {
      toast.error(Object.values(e)[0]);
      return;
    }

    if (isEditing) {
      const { error } = await supabase.from("contenido").update(form).eq("id", form.id);
      if (error) toast.error(t("addcontent.toast.updateError"));
      else {
        toast.success(t("addcontent.toast.updateSuccess"));
        fetchRecords();
        clearForm();
      }
    } else {
      const { error } = await supabase.from("contenido").insert([form]);
      if (error) toast.error(t("addcontent.toast.saveError"));
      else {
        toast.success(t("addcontent.toast.saveSuccess"));
        fetchRecords();
        clearForm();
      }
    }
  };

  const editRecord = (r: RecordType) => {
    setForm(r);
    setIsEditing(true);
  };
  const deleteRecord = async (id: number) => {
    const { error } = await supabase.from("contenido").delete().eq("id", id);
    if (error) toast.error(t("addcontent.toast.deleteError"));
    else {
      toast.success(t("addcontent.toast.deleteSuccess"));
      fetchRecords();
    }
  };

  const difficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "fácil":
        return "bg-green-200 text-green-800";
      case "media":
        return "bg-yellow-200 text-yellow-800";
      case "difícil":
        return "bg-red-200 text-red-800";
      default:
        return "";
    }
  };

  const filteredRecords = useMemo(() => {
    const q = filter.toLowerCase();
    return records.filter((r) => r.title.toLowerCase().includes(q) || r.tags.some((t) => t.toLowerCase().includes(q)));
  }, [filter, records]);

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-start">

      {/* Imagen de fondo */}
      <img src={heroImage} alt="Fondo" className="absolute inset-0 w-full h-full object-cover opacity-70" />
      <div className={`absolute inset-0 ${highContrast ? "bg-black/50" : "bg-white/20"}`}></div>

      {/* Contenido sobre la imagen */}
      <div className="relative z-10 w-full max-w-4xl p-6 mt-12 space-y-8">

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveRecord(); }}>
            <div>
              <label className="block mb-1">{t("addcontent.form.title")}</label>
              <input className={inputClass} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
            </div>
            <div>
              <label className="block mb-1">{t("addcontent.form.type")}</label>
              <select className={inputClass} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {typeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1">{t("addcontent.form.author")}</label>
              <input className={inputClass} value={form.author} onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))} />
              {errors.author && <p className="text-red-600 text-sm mt-1">{errors.author}</p>}
            </div>
            <div>
              <label className="block mb-1">{t("addcontent.form.difficulty")}</label>
              <select className={inputClass} value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as Difficulty }))}>
                <option value="fácil">{t("addcontent.form.difficultyOptions.easy")}</option>
                <option value="media">{t("addcontent.form.difficultyOptions.medium")}</option>
                <option value="difícil">{t("addcontent.form.difficultyOptions.hard")}</option>
              </select>
            </div>
            <div>
              <label className="block mb-1">{t("addcontent.form.description")}</label>
              <textarea className={inputClass} value={form.description} rows={3} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="block mb-1">{t("addcontent.form.tags")}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.tags.map((tag) => (
                  <span key={tag} className="bg-blue-200 text-blue-800 px-2 py-1 rounded-full text-xs">
                    {tag} <button type="button" className="ml-1 text-xs" onClick={() => removeTag(tag)}>×</button>
                  </span>
                ))}
              </div>
              <input className={inputClass} value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }} />
            </div>
            <div>
              <label className="block mb-1">{t("addcontent.form.resources")}</label>
              {form.resources.map((r, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input className={inputClass} value={r} onChange={(e) => setResource(i, e.target.value)} />
                  <button type="button" className="text-red-500" onClick={() => removeResource(i)}>×</button>
                </div>
              ))}
              <button type="button" className="underline text-sm" onClick={addResource}>{t("addcontent.form.addResource")}</button>
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button type="button" className="px-3 py-2 rounded bg-gray-200 text-black" onClick={clearForm}>{t("addcontent.form.clear")}</button>
              <button type="submit" className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
                {isEditing ? t("addcontent.form.update") : t("addcontent.form.save")}
              </button>
            </div>
          </form>
        </div>

        {/* Tabla de registros */}
        <div className="bg-white rounded-2xl shadow-lg p-6 overflow-x-auto">
          <input type="text" placeholder={t("addcontent.table.filter")} className="mb-4 w-full border px-3 py-2 rounded" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <table className="min-w-full border-collapse border text-black">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2">{t("addcontent.table.columns.title")}</th>
                <th className="border p-2">{t("addcontent.table.columns.type")}</th>
                <th className="border p-2">{t("addcontent.table.columns.difficulty")}</th>
                <th className="border p-2">{t("addcontent.table.columns.tags")}</th>
                <th className="border p-2">{t("addcontent.table.columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr><td colSpan={5} className="border p-2 text-center">{t("addcontent.table.noRecords")}</td></tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-100">
                    <td className="border p-2">{r.title}</td>
                    <td className="border p-2">{r.type}</td>
                    <td className={`border p-2 ${difficultyColor(r.difficulty)}`}>{r.difficulty}</td>
                    <td className="border p-2">{r.tags.join(", ")}</td>
                    <td className="border p-2 flex gap-2">
                      <button className="px-2 py-1 bg-yellow-200 rounded text-sm" onClick={() => editRecord(r)}>
                        {t("addcontent.table.actions.edit")}
                      </button>
                      <button className="px-2 py-1 bg-red-400 rounded text-sm text-white" onClick={() => deleteRecord(r.id)}>
                        {t("addcontent.table.actions.delete")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Historial de cambios */}
        <div className="bg-white rounded-2xl shadow-lg p-6 overflow-x-auto">
          <h2 className="text-xl font-semibold mb-4">{t("addcontent.history.title")}</h2>
          <table className="min-w-full border-collapse border text-black">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2">{t("addcontent.history.columns.record")}</th>
                <th className="border p-2">{t("addcontent.history.columns.action")}</th>
                <th className="border p-2">{t("addcontent.history.columns.author")}</th>
                <th className="border p-2">{t("addcontent.history.columns.date")}</th>
              </tr>
            </thead>
            <tbody>
              {historial.length === 0 ? (
                <tr><td colSpan={4} className="border p-2 text-center">{t("addcontent.history.noHistory")}</td></tr>
              ) : (
                historial.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-100">
                    <td className="border p-2">{h.title}</td>
                    <td className="border p-2">{h.action}</td>
                    <td className="border p-2">{h.author}</td>
                    <td className="border p-2">{new Date(h.created_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  );
}
