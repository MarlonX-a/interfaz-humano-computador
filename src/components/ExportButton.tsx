import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, FileSpreadsheet, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import type { StudentPerformance, AnalyticsData } from '../lib/data/performance';

interface ExportButtonProps {
  students: StudentPerformance[];
  analytics: AnalyticsData;
  format: 'csv' | 'pdf';
}

export default function ExportButton({ students, analytics, format }: ExportButtonProps) {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);

  const exportToCSV = () => {
    setExporting(true);
    try {
      // Preparar datos para CSV
      const csvData = students.map((student) => ({
        Estudiante: student.display_name || student.email || student.usuario_id,
        Email: student.email || '',
        'Total Pruebas': student.total_pruebas,
        'Promedio Puntaje': `${student.promedio_puntaje.toFixed(1)}%`,
        Aprobados: student.aprobados,
        Reprobados: student.reprobados,
        'Lecciones Completadas': student.lecciones_completadas,
        'Última Actividad': student.ultima_actividad
          ? new Date(student.ultima_actividad).toLocaleDateString('es-ES')
          : '',
      }));

      // Convertir a CSV
      const headers = Object.keys(csvData[0] || {});
      const csvRows = [
        headers.join(','),
        ...csvData.map((row) =>
          headers
            .map((header) => {
              const value = row[header as keyof typeof row];
              return typeof value === 'string' && value.includes(',')
                ? `"${value}"`
                : value;
            })
            .join(',')
        ),
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `desempeno_estudiantes_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(t('teacher.performance.export.success') || 'Datos exportados correctamente');
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      toast.error(t('teacher.performance.export.error') || 'Error al exportar datos');
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = () => {
    setExporting(true);
    toast.error(t('teacher.performance.export.pdfNotImplemented') || 'Exportación a PDF próximamente');
    setExporting(false);
    // TODO: Implementar exportación a PDF con jspdf
  };

  const handleExport = () => {
    if (format === 'csv') {
      exportToCSV();
    } else {
      exportToPDF();
    }
  };

  const Icon = format === 'csv' ? FileSpreadsheet : FileText;

  return (
    <button
      onClick={handleExport}
      disabled={exporting || students.length === 0}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {exporting ? (
        <>
          <Loader size={18} className="animate-spin" />
          <span>{t('teacher.performance.exporting') || 'Exportando...'}</span>
        </>
      ) : (
        <>
          <Icon size={18} />
          <span>
            {format === 'csv'
              ? t('teacher.performance.export.csv') || 'Exportar CSV'
              : t('teacher.performance.export.pdf') || 'Exportar PDF'}
          </span>
        </>
      )}
    </button>
  );
}

