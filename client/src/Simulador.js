import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Simulador.css';

import ReactSlider from 'react-slider';

const nombreArchivoEscudo = (equipo) =>
  `/escudos/${equipo
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // elimina tildes
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')}.png`;




const Simulador = () => {
  const [partidos, setPartidos] = useState([]);
  const [clasificacion, setClasificacion] = useState([]);
  const [simulado, setSimulado] = useState(false);
  const [partidosSimulados, setPartidosSimulados] = useState([]);
  const [probabilidadesCampeon, setProbabilidadesCampeon] = useState([]);


  useEffect(() => {
    cargarPartidosRestantes();
    cargarClasificacion();
  }, []);
  

  const partidosPorJornada = partidos.reduce((acc, partido) => {
    const j = partido.JORNADA;
    if (!acc[j]) acc[j] = [];
    acc[j].push(partido);
    return acc;
  }, {});


  const cargarPartidosRestantes = () => {
    axios.get('http://localhost:5000/partidos-restantes')
      .then(res => {
        const partidosConEnteros = res.data.map(p => ({
          ...p,
          JORNADA: parseInt(p.JORNADA),
          PROB_LOCAL: Math.round(p.PROB_LOCAL * 100),
          PROB_EMPATE: Math.round(p.PROB_EMPATE * 100),
          PROB_VISITANTE: Math.round(p.PROB_VISITANTE * 100),
        }));
        setPartidos(partidosConEnteros);
      })
      .catch(err => console.error(err));
  };

  const cargarClasificacion = () => {
    axios.get('http://localhost:5000/clasificacion')
      .then(res => setClasificacion(res.data))
      .catch(err => console.error(err));
  };

  const simular = () => {
    const partidosDecimales = partidos.map(p => ({
      ...p,
      JORNADA: parseInt(p.JORNADA),
      PROB_LOCAL: p.PROB_LOCAL / 100,
      PROB_EMPATE: p.PROB_EMPATE / 100,
      PROB_VISITANTE: p.PROB_VISITANTE / 100,
    }));
  
    axios.post('http://localhost:5000/simular', partidosDecimales)
      .then(res => {
        setClasificacion(res.data.clasificacion);
        setPartidosSimulados(res.data.partidosSimulados);
        setSimulado(true);
      })
      .catch(err => console.error(err));
  };
  
  

  const actualizarProbabilidad = (index, campo, valor) => {
    const copia = [...partidos];
    copia[index][campo] = parseInt(valor); // Guardamos como entero
    setPartidos(copia);
  };
  
  
  const simularTodo = () => {
    const partidosDecimales = partidos.map(p => ({
      ...p,
      JORNADA: parseInt(p.JORNADA),
      PROB_LOCAL: p.PROB_LOCAL / 100,
      PROB_EMPATE: p.PROB_EMPATE / 100,
      PROB_VISITANTE: p.PROB_VISITANTE / 100,
    }));
  
    axios.post('http://localhost:5000/simular-multiple', partidosDecimales)
    .then(res => setProbabilidadesCampeon(res.data))
    .catch(err => console.error(err));
  
  };
  



  const reiniciar = () => {
    cargarClasificacion();
    cargarPartidosRestantes();
    setSimulado(false);
    setProbabilidadesCampeon([]);
    setPartidosSimulados([]);
  };
  

  return (
    <div className="simulador-container">
      <h2>Partidos Restantes</h2>
      {Object.entries(partidosPorJornada).map(([jornada, lista]) => (
        <div key={jornada}>
          <h3>Jornada {jornada}</h3>
          <table className="tabla-partidos">
            <thead>
              <tr>
                <th>Local</th>
                <th>Visitante</th>
                <th>Probabilidades</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p, i) => {
                const handleSliderChange = ([localEnd, empateEnd]) => {
                  const copia = [...partidos];
                  const idx = partidos.findIndex(x => x.LOCAL === p.LOCAL && x.VISITANTE === p.VISITANTE && x.JORNADA === p.JORNADA);
                  copia[idx].PROB_LOCAL = localEnd;
                  copia[idx].PROB_EMPATE = empateEnd - localEnd;
                  copia[idx].PROB_VISITANTE = 100 - empateEnd;
                  setPartidos(copia);
                };
                const porcentajeLocal = `${p.PROB_LOCAL}%`; // por ejemplo: 35%
                const porcentajeEmpate = `${p.PROB_LOCAL + p.PROB_EMPATE}%`; // por ejemplo: 65%


                return (
                  <tr key={p.LOCAL + '-' + p.VISITANTE}>
                    <td style={{alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                    <img src={nombreArchivoEscudo(p.LOCAL)} alt={p.LOCAL} style={{ height: '24px' }} />
                      {p.LOCAL}
                    </td>
                    <td style={{alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                      {p.VISITANTE}
                      <img src={nombreArchivoEscudo(p.VISITANTE)} alt={p.VISITANTE} style={{ height: '24px' }} />
                    </td>
                    <td>
                    <div
  className="barra-probabilidad"
  style={{
    display: 'flex',
    height: '12px',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '8px',
  }}
>
  <div style={{
    width: `${p.PROB_LOCAL}%`,
    backgroundColor: 'green'
  }} />
  <div style={{
    width: `${p.PROB_EMPATE}%`,
    backgroundColor: 'goldenrod'
  }} />
  <div style={{
    width: `${p.PROB_VISITANTE}%`,
    backgroundColor: 'red'
  }} />
</div>
                       
<ReactSlider
  className="slider-plano"
  thumbClassName="slider-thumb"
  trackClassName="slider-track"
  value={[p.PROB_LOCAL, p.PROB_LOCAL + p.PROB_EMPATE]}
  onChange={handleSliderChange}
  min={0}
  max={100}
  pearling
/>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8em' }}>
                        <span style={{ color: 'green' }}>Local: {p.PROB_LOCAL}%</span>
                        <span style={{ color: 'goldenrod' }}>Empate: {p.PROB_EMPATE}%</span>
                        <span style={{ color: 'red' }}>Visitante: {p.PROB_VISITANTE}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

  
      <div className="botones">
      <button onClick={simularTodo}>Calcular probabilidades</button>
      <button onClick={reiniciar}>Reiniciar</button>
      </div>
  
      <h2>Clasificación actual {simulado && '(Simulada)'}</h2>
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
  
      {simulado && (
  <>
    <h2>Resultados Simulados</h2>
    <table className="tabla-partidos">
      <thead>
        <tr>
          <th>Local</th>
          <th>Visitante</th>
          <th>Resultado</th>
        </tr>
      </thead>
      <tbody>
        {partidosSimulados.map((p, i) => (
          <tr key={i}>
            <td>{p.LOCAL}</td>
            <td>{p.VISITANTE}</td>
            <td>{p.RESULTADO}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </>
)}

{probabilidadesCampeon.length > 0 && (
  <div>
    <h2>Probabilidad de Ser Campeón / Play-Off</h2>
    <table className="tabla-clasificacion">
      <thead>
        <tr>
          <th>Equipo</th>
          <th>% Campeón</th>
          <th>% Play-Off (2º-5º)</th>
          <th>% Zona media</th>
          <th>% Descenso</th>

        </tr>
      </thead>
      <tbody>
        {probabilidadesCampeon.map((e, i) => (
          <tr key={i}>
            <td style={{alignItems: 'center', gap: '6px' }}>
    <img
      src={nombreArchivoEscudo(e.equipo)}
      alt={e.equipo}
      style={{ height: '24px' }}
    />
    {e.equipo}
  </td>
            <td><strong>{e.porcentajeCampeon}%</strong></td>
            <td>{e.porcentajePlayoff}%</td>
            <td>{e.porcentajeNingun}%</td>
            <td>{e.porcentajeDescenso}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}


    </div>
  );
  
};

export default Simulador;
