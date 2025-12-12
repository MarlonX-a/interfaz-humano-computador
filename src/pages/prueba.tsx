import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TakePruebaModal from '../components/TakePruebaModal';
import { parseId } from '../lib/parseId';

export default function PruebaPage() {
  const navigate = useNavigate();
  const params = useParams();
  const lessonId = parseId(params.lessonId);
  const pruebaId = parseId(params.pruebaId);

  const handleClose = () => {
    // Prefer to go back if possible, otherwise go to lesson detail
    try {
      navigate(-1);
    } catch (e) {
      if (lessonId) navigate(`/lesson/${lessonId}`);
      else navigate('/lessons');
    }
  };

  if (lessonId == null || pruebaId == null) {
    return (
      <div className="p-6">
        <h3 className="text-lg font-semibold">ID inválido</h3>
        <p className="text-sm text-gray-600">Los parámetros de la URL no son válidos. Verifica el enlace.</p>
      </div>
    );
  }

  return (
    <>
      <TakePruebaModal open={true} onClose={handleClose} pruebaId={pruebaId} leccionId={lessonId} />
    </>
  );
}
