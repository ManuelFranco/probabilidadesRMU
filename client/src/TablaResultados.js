import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './TablaResultados.css'; // Para estilos

const TablaResultados = () => {
  const [resultados, setResultados] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/resultados')
      .then(res => setResultados(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="tabla-contenedor">
      <h2>Resultados de Partidos</h2>
      <table className="tabla-resultados">
        <thead>
          <tr>
            <th>Local</th>
            <th>Visitante</th>
            <th>Resultado</th>
          </tr>
        </thead>
        <tbody>
          {resultados.map((partido, index) => (
            <tr key={index}>
              <td>{partido.LOCAL}</td>
              <td>{partido.VISITANTE}</td>
              <td>{partido.RESULTADO}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TablaResultados;
