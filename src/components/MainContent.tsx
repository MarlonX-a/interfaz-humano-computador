import { useState } from "react";
import { Newspaper } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function MainContent({
  textSizeLarge,
  highContrast,
}: {
  textSizeLarge: boolean;
  highContrast: boolean;
}) {
  const { t } = useTranslation();
  const [sessionStarted] = useState(true);

  return (
    <main
      className={`flex flex-col flex-1 px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto ${
        highContrast ? "bg-black text-yellow-300" : "bg-gray-50 text-gray-900"
      } ${textSizeLarge ? "text-lg" : "text-sm"}`}
    >
      {/* Mensaje de bienvenida */}
      <section
        className={`bg-white rounded-2xl shadow-sm border p-6 mb-8 transition-colors ${
          highContrast ? "bg-black border-yellow-300 text-yellow-300" : "border-gray-200"
        }`}
      >
        <h1 className="text-2xl font-semibold mb-1 text-center sm:text-left">
          {t("welcome")}
        </h1>
        <p className="text-gray-600 mb-4 text-center sm:text-left">{t("explore")}</p>
        <p className="text-sm text-gray-500 text-center sm:text-left">{t("learn")}</p>

        {sessionStarted && (
          <div
            className={`mt-4 px-4 py-2 rounded-lg text-sm text-center sm:text-left transition-colors ${
              highContrast
                ? "bg-yellow-900 border-yellow-500 text-yellow-300"
                : "bg-green-100 border-green-300 text-green-800"
            }`}
          >
            {t("sessionStarted")}
          </div>
        )}
      </section>

      {/* Bloque de noticias con ayuda contextual siempre visible */}
      <section
        className={`bg-white rounded-2xl shadow-sm border p-6 transition-colors ${
          highContrast ? "bg-black border-yellow-300 text-yellow-300" : "border-gray-200"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start gap-4 mb-4">
          <Newspaper className="text-blue-600" size={24} />
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold">{t("news")}</h2>
            <p className="text-sm text-gray-500 mt-1">{t("newsHelp")}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article className="p-4 border rounded-xl hover:bg-gray-50 transition">
            <h3 className="font-medium">{t("newWaterMolecule")}</h3>
            <p className="text-sm text-gray-500 mt-1">{t("newWaterMoleculeDesc")}</p>
            <p className="text-xs text-gray-400 mt-2">{t("dateJan15")}</p>
          </article>

          <article className="p-4 border rounded-xl hover:bg-gray-50 transition">
            <h3 className="font-medium">{t("updatedPeriodicTable")}</h3>
            <p className="text-sm text-gray-500 mt-1">{t("updatedPeriodicTableDesc")}</p>
            <p className="text-xs text-gray-400 mt-2">{t("dateJan10")}</p>
          </article>

          <article className="p-4 border rounded-xl hover:bg-gray-50 transition">
            <h3 className="font-medium">{t("virtualExperiments")}</h3>
            <p className="text-sm text-gray-500 mt-1">{t("virtualExperimentsDesc")}</p>
            <p className="text-xs text-gray-400 mt-2">{t("dateJan5")}</p>
          </article>
        </div>
      </section>
    </main>
  );
}
