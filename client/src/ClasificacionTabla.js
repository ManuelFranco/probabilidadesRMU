import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './ClasificacionTabla.css';

const ClasificacionTabla = () => {
  const [clasificacion, setClasificacion] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/clasificacion')
      .then(res => setClasificacion(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="tabla-clasificacion-contenedor">
      <h2>Clasificación</h2>
      <table className="tabla-clasificacion">
        <thead>
          <tr>
            <th>#</th>
            <th>Equipo</th>
            <th>V</th>
            <th>E</th>
            <th>D</th>
            <th>GF</th>
            <th>GC</th>
            <th>GA</th>
            <th>PTS</th>
          </tr>
        </thead>
        <tbody>
          {clasificacion.map((equipo, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{equipo.equipo}</td>
              <td>{equipo.V}</td>
              <td>{equipo.E}</td>
              <td>{equipo.D}</td>
              <td>{equipo.GF}</td>
              <td>{equipo.GC}</td>
              <td>{equipo.GA}</td>
              <td><strong>{equipo.PTS}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClasificacionTabla;
