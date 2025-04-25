import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import './Simulador.css';

import { flushSync } from 'react-dom';
import html2canvas from 'html2canvas';
import { FaShareAlt } from 'react-icons/fa';

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
  const [cargando, setCargando] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const shareRef = useRef(null);
  const [shareName, setShareName] = useState('');


  const handleShare = async () => {
    // 1) Pedir nombre al usuario
    const name = window.prompt('¿Cómo quieres que aparezca tu nombre en la imagen?');
    if (!name) return; // si cancela o deja vacío, abortar

    // 2) Forzar render con el nuevo nombre antes de capturar
    flushSync(() => {
      setShareName(name);
      setCapturing(true);
    });
    // 3) Capturar
    try {
      const canvas = await html2canvas(shareRef.current, { scale: 2 });
      canvas.toBlob(blob => {
        if (!blob) return;
        const file = new File([blob], 'predicciones.png', { type: 'image/png' });

        if (navigator.canShare?.({ files: [file] })) {
          navigator.share({
            files: [file],
            title: `Predicciones del final de liga de ${name}`,
            text: '¡Mira mis probabilidades!'
          });
        } else {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'predicciones.png';
          link.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Error al generar la imagen:', err);
    } finally {
      // 4) Limpiar el nombre para que no permanezca
      setShareName('');
      setCapturing(false);
    }
  };


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
    axios.get('/partidos-restantes')
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
    axios.get('/clasificacion')
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
  
    axios.post('/simular', partidosDecimales)
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
  
  //    axios.post('http://localhost:5000/simular-multiple', partidosDecimales)
  const simularTodo = () => {
    setCargando(true);
    const partidosDecimales = partidos.map(p => ({
      ...p,
      JORNADA: parseInt(p.JORNADA),
      PROB_LOCAL: p.PROB_LOCAL / 100,
      PROB_EMPATE: p.PROB_EMPATE / 100,
      PROB_VISITANTE: p.PROB_VISITANTE / 100,
    }));
  
    axios.post('/simular-multiple', partidosDecimales)
    .then(res => setProbabilidadesCampeon(res.data))
    .catch(err => console.error(err))
    .finally(() => setCargando(false));
  
  };
  



  const reiniciar = () => {
    cargarClasificacion();
    cargarPartidosRestantes();
    setSimulado(false);
    setProbabilidadesCampeon([]);
    setPartidosSimulados([]);
  };
  

  const loadingPhrases = [
    'Intentando aparcar en Nueva Condomina...',
    'Buscando a Cadorini en el once...',
    'Detectando a árbitros en modo estrella de cine...',
    'Localizando a Albertolofe entre la afición visitante...',
    'Contabilizando fueras de juego no pitados...',
    'Teniendo en cuenta primas...',
    'Un saludo a ElPostGrana',
    'Pidiendo un recibimiento en casa...',
    'Haciendo cola en la cantina...',
    'Llevando cuidado con el perro (muerde)...',
    'Replicando la celebración de Pedro Benito...',
    'Llenando el Rico Pérez...',
    'Comprando camisetas falsas por internet...',
    'Sumando asistencias de Juan Carlos Real...',
    'Insertando imagen de PeloPincel...',
    'Echando de menos a Armandismo...',
  ];
  // 2) Estado para el índice de frase actual
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    let timer;
    if (cargando) {
      // Reiniciamos aleatoriamente al arrancar cada carga
      setPhraseIndex(Math.floor(Math.random() * loadingPhrases.length));
  
      timer = setInterval(() => {
        setPhraseIndex(i => (i + 1) % loadingPhrases.length);
      }, 2000);
    }
    return () => clearInterval(timer);
  }, [cargando]);
  

  // … tu lógica de simularTodo o simular que pone cargando = true …

  if (cargando) {
    return (
      <div className="simulador-cargando">
        <h2>Simulando resultados...</h2>
        {/* 4) Subtítulo dinámico */}
        <h3 className="loading-subtitle">
          {loadingPhrases[phraseIndex]}
        </h3>
        <div className="loader"></div>
      </div>
    );
  }


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
            <th>PJ</th>
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
              <td>{equipo.V + equipo.E + equipo.D}</td>
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
    <h2>Probabilidades totales</h2>

      <div 
        ref={shareRef} 
        className={`share-card${capturing ? ' capturing' : ''}`}
      >
                {/* Título dinámico sólo aparece en el share */}
        {shareName && (
          <h2 style={{
            margin: '0 0 16px',
            fontFamily: 'Segoe UI, sans-serif'
          }}>
            Predicciones de {shareName}
          </h2>
        )}

{probabilidadesCampeon.length > 0 && (
  <div>
    <table className="tabla-clasificacion">
      <thead>
        <tr>
          <th>Equipo</th>
          <th>Campeón</th>
          <th>Play-Off</th>
          <th>Zona media</th>
          <th>Descenso</th>

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

  {/* ESTA LÍNEA: sólo se verá en captura */}
  <p className="share-promo">
    Simulador diseñado por @RMUBigData. 
    Calcula tus probabilidades en: https://probabilidadesrmu.onrender.com/
  </p>


</div>
<button className="btn-share" onClick={handleShare}>
        <FaShareAlt style={{ marginRight: '6px' }}/>
        Compartir resumen
      </button>


    </div>
  );
  



};

export default Simulador;
