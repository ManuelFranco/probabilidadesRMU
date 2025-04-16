const express = require('express');
const cors = require('cors');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path'); // <-- ✅ add this

const app = express();
const PORT = process.env.PORT || 5000;
const seedrandom = require('seedrandom');
const rng = seedrandom('42'); // Puedes cambiar la semilla a voluntad



app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

app.get('/', (req, res) => {
  res.send('Servidor funcionando correctamente');
});

app.get('/resultados', (req, res) => {
  const resultados = [];
  //fs.createReadStream('partidos.csv')
  fs.createReadStream(path.join(__dirname, 'partidos.csv'))
    .pipe(csv())
    .on('data', (data) => {
      if (resultados.length < 5) {
        resultados.push(data);
      }
    })
    .on('end', () => {
      res.json(resultados);
    });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});


// Nueva ruta: cálculo de clasificación
app.get('/clasificacion', (req, res) => {
    const equipos = {};
    const enfrentamientos = {};
  
    //fs.createReadStream('partidos.csv')
    fs.createReadStream(path.join(__dirname, 'partidos.csv'))
      .pipe(csv())
      .on('data', (row) => {
        const local = row.LOCAL.trim();
        const visitante = row.VISITANTE.trim();
        const [golesLocal, golesVisitante] = row.RESULTADO.split('-').map(Number);
  
        // Inicializar stats si no existen
        [local, visitante].forEach((equipo) => {
          if (!equipos[equipo]) {
            equipos[equipo] = {
              equipo,
              V: 0, E: 0, D: 0,
              GF: 0, GC: 0,
              PTS: 0
            };
          }
        });
  
        // Actualizar goles
        equipos[local].GF += golesLocal;
        equipos[local].GC += golesVisitante;
        equipos[visitante].GF += golesVisitante;
        equipos[visitante].GC += golesLocal;
  
        // Resultado y puntos
        if (golesLocal > golesVisitante) {
          equipos[local].V += 1;
          equipos[local].PTS += 3;
          equipos[visitante].D += 1;
        } else if (golesLocal < golesVisitante) {
          equipos[visitante].V += 1;
          equipos[visitante].PTS += 3;
          equipos[local].D += 1;
        } else {
          equipos[local].E += 1;
          equipos[visitante].E += 1;
          equipos[local].PTS += 1;
          equipos[visitante].PTS += 1;
        }
  
        // Guardar enfrentamiento para posibles desempates
        const key = [local, visitante].sort().join('|');
        if (!enfrentamientos[key]) enfrentamientos[key] = [];
        enfrentamientos[key].push({ local, visitante, golesLocal, golesVisitante });
      })
      .on('end', () => {
        // Calcular GA y armar lista
        let clasificacion = Object.values(equipos).map(e => ({
          ...e,
          GA: e.GF - e.GC
        }));
  
        // Ordenar aplicando reglas de desempate
        clasificacion.sort((a, b) => {
          if (b.PTS !== a.PTS) return b.PTS - a.PTS;
  
          // Enfrentamiento directo
          const clave = [a.equipo, b.equipo].sort().join('|');
          const partidos = enfrentamientos[clave] || [];
  
          if (partidos.length === 1) {
            const p = partidos[0];
            if ((p.local === a.equipo && p.golesLocal > p.golesVisitante) ||
                (p.visitante === a.equipo && p.golesVisitante > p.golesLocal)) {
              return -1;
            } else if ((p.local === b.equipo && p.golesLocal > p.golesVisitante) ||
                       (p.visitante === b.equipo && p.golesVisitante > p.golesLocal)) {
              return 1;
            }
          }
  
          if (partidos.length === 2) {
            let golesA = 0, golesB = 0;
            partidos.forEach(p => {
              if (p.local === a.equipo) golesA += p.golesLocal;
              if (p.visitante === a.equipo) golesA += p.golesVisitante;
              if (p.local === b.equipo) golesB += p.golesLocal;
              if (p.visitante === b.equipo) golesB += p.golesVisitante;
            });
            if (golesA !== golesB) return golesB - golesA;
          }
  
          // Último criterio: diferencia de goles
          return b.GA - a.GA;
        });
  
        res.json(clasificacion);
      });
  });


  const { v4: uuidv4 } = require('uuid');

let partidosRestantes = []; // Cache temporal en memoria

// Leer partidos restantes
app.get('/partidos-restantes', (req, res) => {
  partidosRestantes = [];
  //fs.createReadStream('partidos_restantes.csv')
  fs.createReadStream(path.join(__dirname, 'partidos_restantes.csv'))
    .pipe(csv())
    .on('data', (row) => {
      partidosRestantes.push({
        id: uuidv4(),
        JORNADA: parseInt(row.JORNADA),
        LOCAL: row.LOCAL.trim(),
        VISITANTE: row.VISITANTE.trim(),
        PROB_LOCAL: parseFloat(row.PROB_LOCAL),
        PROB_EMPATE: parseFloat(row.PROB_EMPATE),
        PROB_VISITANTE: parseFloat(row.PROB_VISITANTE),
      });
    })
    .on('end', () => {
      res.json(partidosRestantes);
    });
});

// Simular partidos y devolver nueva clasificación
app.post('/simular', (req, res) => {
    const incomingMatches = req.body.length ? req.body : partidosRestantes;

    const simulatedMatches = incomingMatches.map(match => {
      const rnd = rng();
      let resultado;
      if (rnd < match.PROB_LOCAL) {
        resultado = '1';
      } else if (rnd < match.PROB_LOCAL + match.PROB_EMPATE) {
        resultado = 'X';
      } else {
        resultado = '2';
      }
  
      let golesLocal = 0;
      let golesVisitante = 0;
  
      if (resultado === '1') {
        golesLocal = Math.floor(rng() * 3) + 1;
        golesVisitante = Math.floor(rng() * golesLocal);
      } else if (resultado === '2') {
        golesVisitante = Math.floor(rng() * 3) + 1;
        golesLocal = Math.floor(rng() * golesVisitante);
      } else {
        golesLocal = golesVisitante = Math.floor(rng() * 3);
      }
  
      return {
        LOCAL: match.LOCAL,
        VISITANTE: match.VISITANTE,
        RESULTADO: `${golesLocal}-${golesVisitante}`
      };
    });
  
    const partidosBase = [];
    //fs.createReadStream('partidos.csv')
    fs.createReadStream(path.join(__dirname, 'partidos.csv'))
      .pipe(csv())
      .on('data', (row) => {
        partidosBase.push({
          LOCAL: row.LOCAL,
          VISITANTE: row.VISITANTE,
          RESULTADO: row.RESULTADO
        });
      })
      .on('end', () => {
        const todosLosPartidos = partidosBase.concat(simulatedMatches);
  
        const equipos = {};
        const enfrentamientos = {};
  
        todosLosPartidos.forEach(row => {
          const local = row.LOCAL.trim();
          const visitante = row.VISITANTE.trim();
          const [golesLocal, golesVisitante] = row.RESULTADO.split('-').map(Number);
  
          [local, visitante].forEach((equipo) => {
            if (!equipos[equipo]) {
              equipos[equipo] = {
                equipo,
                V: 0, E: 0, D: 0,
                GF: 0, GC: 0,
                PTS: 0
              };
            }
          });
  
          equipos[local].GF += golesLocal;
          equipos[local].GC += golesVisitante;
          equipos[visitante].GF += golesVisitante;
          equipos[visitante].GC += golesLocal;
  
          if (golesLocal > golesVisitante) {
            equipos[local].V += 1;
            equipos[local].PTS += 3;
            equipos[visitante].D += 1;
          } else if (golesLocal < golesVisitante) {
            equipos[visitante].V += 1;
            equipos[visitante].PTS += 3;
            equipos[local].D += 1;
          } else {
            equipos[local].E += 1;
            equipos[visitante].E += 1;
            equipos[local].PTS += 1;
            equipos[visitante].PTS += 1;
          }
  
          const key = [local, visitante].sort().join('|');
          if (!enfrentamientos[key]) enfrentamientos[key] = [];
          enfrentamientos[key].push({ local, visitante, golesLocal, golesVisitante });
        });
  
        let clasificacion = Object.values(equipos).map(e => ({
          ...e,
          GA: e.GF - e.GC
        }));
  
        clasificacion.sort((a, b) => {
          if (b.PTS !== a.PTS) return b.PTS - a.PTS;
          const clave = [a.equipo, b.equipo].sort().join('|');
          const partidos = enfrentamientos[clave] || [];
  
          if (partidos.length === 1) {
            const p = partidos[0];
            if ((p.local === a.equipo && p.golesLocal > p.golesVisitante) ||
                (p.visitante === a.equipo && p.golesVisitante > p.golesLocal)) return -1;
            if ((p.local === b.equipo && p.golesLocal > p.golesVisitante) ||
                (p.visitante === b.equipo && p.golesVisitante > p.golesLocal)) return 1;
          }
  
          if (partidos.length === 2) {
            let golesA = 0, golesB = 0;
            partidos.forEach(p => {
              if (p.local === a.equipo) golesA += p.golesLocal;
              if (p.visitante === a.equipo) golesA += p.golesVisitante;
              if (p.local === b.equipo) golesB += p.golesLocal;
              if (p.visitante === b.equipo) golesB += p.golesVisitante;
            });
            if (golesA !== golesB) return golesB - golesA;
          }
  
          return b.GA - a.GA;
        });
  
        res.json({ clasificacion, partidosSimulados: simulatedMatches });
      });
  });
  


  app.post('/simular-multiple', (req, res) => {
    const rng = seedrandom('42'); // Puedes cambiar la semilla a voluntad

    const incomingMatches = req.body;
    const campeones = {};
    const playoff = {};
    const ningun = {};
    const descenso = {};
  
    const partidosBase = [];
    fs.createReadStream('partidos.csv')
      .pipe(csv())
      .on('data', (row) => {
        partidosBase.push({
          LOCAL: row.LOCAL,
          VISITANTE: row.VISITANTE,
          RESULTADO: row.RESULTADO
        });
      })
      .on('end', () => {
        const N = 10000;
  
        for (let i = 0; i < N; i++) {
          const simulatedMatches = incomingMatches.map(match => {
            const rnd = rng();
            let resultado;
            if (rnd < match.PROB_LOCAL) {
              resultado = '1';
            } else if (rnd < match.PROB_LOCAL + match.PROB_EMPATE) {
              resultado = 'X';
            } else {
              resultado = '2';
            }
  
            let golesLocal = 0;
            let golesVisitante = 0;
  
            if (resultado === '1') {
              golesLocal = Math.floor(rng() * 3) + 1;
              golesVisitante = Math.floor(rng() * golesLocal);
            } else if (resultado === '2') {
              golesVisitante = Math.floor(rng() * 3) + 1;
              golesLocal = Math.floor(rng() * golesVisitante);
            } else {
              golesLocal = golesVisitante = Math.floor(rng() * 3);
            }
  
            return {
              LOCAL: match.LOCAL,
              VISITANTE: match.VISITANTE,
              RESULTADO: `${golesLocal}-${golesVisitante}`
            };
          });
  
          const partidosTodos = partidosBase.concat(simulatedMatches);
          const equipos = {};
  
          partidosTodos.forEach(row => {
            const local = row.LOCAL.trim();
            const visitante = row.VISITANTE.trim();
            const [golesLocal, golesVisitante] = row.RESULTADO.split('-').map(Number);
  
            [local, visitante].forEach((e) => {
              if (!equipos[e]) {
                equipos[e] = { equipo: e, PTS: 0, GF: 0, GC: 0 };
              }
            });
  
            equipos[local].GF += golesLocal;
            equipos[local].GC += golesVisitante;
            equipos[visitante].GF += golesVisitante;
            equipos[visitante].GC += golesLocal;
  
            if (golesLocal > golesVisitante) {
              equipos[local].PTS += 3;
            } else if (golesLocal < golesVisitante) {
              equipos[visitante].PTS += 3;
            } else {
              equipos[local].PTS += 1;
              equipos[visitante].PTS += 1;
            }
          });
  
          const clasificacion = Object.values(equipos).map(e => ({
            ...e,
            GA: e.GF - e.GC
          }));
  
          clasificacion.sort((a, b) => {
            if (b.PTS !== a.PTS) return b.PTS - a.PTS;
            return b.GA - a.GA;
          });
  
          clasificacion.forEach((equipo, idx) => {
            if (idx === 0) {
              campeones[equipo.equipo] = (campeones[equipo.equipo] || 0) + 1;
            } else if (idx >= 1 && idx <= 4) {
              playoff[equipo.equipo] = (playoff[equipo.equipo] || 0) + 1;
            } else if (idx >= 5 && idx <= 15) {
              ningun[equipo.equipo] = (ningun[equipo.equipo] || 0) + 1;
            } else {
              descenso[equipo.equipo] = (descenso[equipo.equipo] || 0) + 1;
            }
          });
        }
  
        const equiposTodos = new Set([...Object.keys(campeones), ...Object.keys(playoff), ...Object.keys(ningun), ...Object.keys(descenso)]);

        //print equiposTodos
        console.log(equiposTodos);
  
        const resultados = Array.from(equiposTodos).map(equipo => ({
          equipo,
          porcentajeCampeon: ((campeones[equipo] || 0) / N * 100).toFixed(2),
          porcentajePlayoff: ((playoff[equipo] || 0) / N * 100).toFixed(2),
          porcentajeNingun: ((ningun[equipo] || 0) / N * 100).toFixed(2),
          porcentajeDescenso: ((descenso[equipo] || 0) / N * 100).toFixed(2)
        })).sort((a, b) => b.porcentajeCampeon - a.porcentajeCampeon);
  
        res.json(resultados);
      });
  });
  
  