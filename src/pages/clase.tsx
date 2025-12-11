// Clase page removed. Use /lessons or /contenido/:contentId for viewing content.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ClasePage() {
  const navigate = useNavigate();
  useEffect(() => {
    // Redirect to lessons page if the old route is used
    navigate('/lessons');
  }, [navigate]);
  return null;
}
