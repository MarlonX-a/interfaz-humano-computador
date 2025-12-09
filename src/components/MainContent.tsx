import { useState } from "react";
import { Newspaper } from "lucide-react";
import { useTranslation } from "react-i18next";
import heroImage from "../img/HeroImage.png";

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
      {/* 🌟 Hero mejorado */}
      <section
        className={`relative flex flex-col justify-center items-center text-center rounded-2xl shadow-md border mb-12 transition-colors min-h-[55vh] sm:min-h-[65vh] md:min-h-[75vh] lg:min-h-[85vh] overflow-hidden ${
          highContrast
            ? "bg-black border-yellow-300 text-yellow-300"
            : "bg-white border-gray-200 text-gray-800"
        }`}
      >
        {/* Imagen de fondo (decorativa) */}
        <img
          src={heroImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />

        {/* Capa de color para contraste */}
        <div
          className={`absolute inset-0 ${
            highContrast ? "bg-black/80" : "bg-white/60"
          }`}
        ></div>

        {/* Contenido principal */}
        <div className="relative z-10 px-6 sm:px-12 max-w-3xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight drop-shadow-lg">
            {t("heroTitle", {
              defaultValue: "Explora el mundo de la ciencia de forma interactiva",
            })}
          </h1>

          <p className="text-base sm:text-lg mb-6 opacity-90">
            {t("heroSubtitle", {
              defaultValue:
                "Descubre conceptos, experimentos virtuales y avances científicos en un entorno diseñado para el aprendizaje dinámico.",
            })}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
            <button
            className={`mt-2 px-6 py-3 rounded-full font-semibold text-base transition-all ${
              highContrast
                ? "bg-yellow-500 text-black hover:bg-yellow-400"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {t("heroButton", { defaultValue: "Comienza a aprender" })}
            </button>

            {sessionStarted && (
              <div
                role="status"
                aria-live="polite"
                className={`mt-2 inline-block px-5 py-2 rounded-lg text-sm transition-colors ${
                  highContrast
                    ? "bg-yellow-900 border border-yellow-500 text-yellow-300"
                    : "bg-green-100 border border-green-300 text-green-800"
                }`}
              >
                {t("sessionStarted", { defaultValue: "Sesión iniciada correctamente" })}
              </div>
            )}
          </div>
          
        </div>
      </section>

      {/* 📰 Noticias */}
      <section
        className={`bg-white rounded-2xl shadow-sm border p-6 transition-colors ${
          highContrast
            ? "bg-black border-yellow-300 text-yellow-300"
            : "border-gray-200"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start gap-4 mb-4">
          <Newspaper className={`${highContrast ? 'text-yellow-300' : 'text-blue-600'}`} size={24} />
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold">{t("news")}</h2>
            <p className="text-sm text-gray-500 mt-1">{t("newsHelp")}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article className="p-4 border rounded-xl hover:bg-gray-50 transition" aria-labelledby="news-1-title">
            <a href="#" className="block focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-md">
              <h3 id="news-1-title" className="font-medium">{t("newWaterMolecule")}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {t("newWaterMoleculeDesc")}
              </p>
              <p className="text-xs text-gray-400 mt-2">{t("dateJan15")}</p>
            </a>
          </article>

          <article className="p-4 border rounded-xl hover:bg-gray-50 transition" aria-labelledby="news-2-title">
            <a href="#" className="block focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-md">
              <h3 id="news-2-title" className="font-medium">{t("updatedPeriodicTable")}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {t("updatedPeriodicTableDesc")}
              </p>
              <p className="text-xs text-gray-400 mt-2">{t("dateJan10")}</p>
            </a>
          </article>

          <article className="p-4 border rounded-xl hover:bg-gray-50 transition" aria-labelledby="news-3-title">
            <a href="#" className="block focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-md">
              <h3 id="news-3-title" className="font-medium">{t("virtualExperiments")}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {t("virtualExperimentsDesc")}
              </p>
              <p className="text-xs text-gray-400 mt-2">{t("dateJan5")}</p>
            </a>
          </article>
        </div>
      </section>
    </main>
  );
}
