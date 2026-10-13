import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
async function api(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No fue posible completar la operación.');
  return data;
}

function Login({ onLogin }) {
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setError('');
    try { const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(form) }); localStorage.setItem('token', data.token); onLogin(data.user); }
    catch (e) { setError(e.message); }
  }
  return <main className="login-shell"><section className="login-card"><span className="eyebrow">CONTROL ACADÉMICO</span><h1>Registro de asistencia</h1><p className="muted">Estudiantes ingresan con correo o número de registro. El administrador utiliza sus credenciales.</p><form onSubmit={submit}><label>Correo o número de registro<input required value={form.identifier} onChange={e => setForm({ ...form, identifier: e.target.value })} /></label><label>Contraseña <span className="help">(solo administrador)</span><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>{error && <div className="error">{error}</div>}<button>Iniciar sesión</button></form></section></main>;
}

function StudentView({ user, logout }) {
  const [dates, setDates] = useState([]); const [attendance, setAttendance] = useState([]); const [message, setMessage] = useState('');
  async function load() { const [d, a] = await Promise.all([api('/class-dates'), api('/attendance')]); setDates(d); setAttendance(a); }
  useEffect(() => { load().catch(e => setMessage(e.message)); }, []);
  async function mark(classDateId) { try { await api('/attendance', { method: 'POST', body: JSON.stringify({ classDateId }) }); setMessage('Asistencia registrada correctamente.'); await load(); } catch (e) { setMessage(e.message); } }
  const present = attendance.filter(a => a.status === 'PRESENT').length; const absent = attendance.filter(a => a.status === 'ABSENT').length;
  const today = todayLocal();
  return <Dashboard title={`Hola, ${user.name}`} subtitle="Consulta tu historial y registra tu asistencia" logout={logout}>
    <div className="stats"><div><strong>{present}</strong><span>Presentes</span></div><div><strong>{absent}</strong><span>Faltas</span></div><div><strong>{dates.length ? Math.round((present / dates.length) * 100) : 0}%</strong><span>Asistencia</span></div></div>
    {message && <div className="notice">{message}</div>}
    <section className="panel"><div className="panel-heading"><div><h2>Mi historial de asistencia</h2><p className="muted">Solo puedes marcar durante el día programado.</p></div><span className="module-badge">Módulo activo</span></div>
      <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Horario</th><th>Estado</th><th>Hora de registro</th><th>Acción</th></tr></thead><tbody>{dates.map(d => { const item = attendance.find(a => a.class_date_id === d.id); const date = normalizeDate(d.class_date); const status = item?.status || 'PENDING'; const canMark = date === today && status !== 'PRESENT'; return <tr key={d.id}><td>{formatDate(date)}</td><td>{String(d.start_time).slice(0, 5)} - {String(d.end_time).slice(0, 5)}</td><td><span className={`status ${status === 'PRESENT' ? 'present' : status === 'PENDING' ? 'pending' : 'absent'}`}>{status === 'PRESENT' ? 'Presente' : status === 'PENDING' ? 'Pendiente' : 'Falta'}</span></td><td>{item?.marked_at ? new Date(item.marked_at).toLocaleTimeString() : '—'}</td><td>{canMark ? <button className="small" onClick={() => mark(d.id)}>Marcar asistencia</button> : <span className="muted">{status === 'PRESENT' ? 'Registrada' : date < today ? 'Fecha finalizada' : 'No disponible todavía'}</span>}</td></tr>; })}</tbody></table></div>
    </section>
  </Dashboard>;
}

function AdminView({ user, logout }) {
  const [tab, setTab] = useState('attendance'); const [students, setStudents] = useState([]); const [attendance, setAttendance] = useState([]); const [logs, setLogs] = useState([]); const [message, setMessage] = useState(''); const [search, setSearch] = useState(''); const [filterDate, setFilterDate] = useState(''); const [selectedStudent, setSelectedStudent] = useState('');
  async function load() {
    const query = new URLSearchParams(); if (filterDate) query.set('date', filterDate); if (selectedStudent) query.set('studentId', selectedStudent);
    const [s, a, l] = await Promise.all([api(`/students?search=${encodeURIComponent(search)}`), api(`/attendance?${query}`), api('/activity-logs')]); setStudents(s); setAttendance(a); setLogs(l);
  }
  useEffect(() => { load().catch(e => setMessage(e.message)); }, [filterDate, selectedStudent]);
  async function update(row) { const status = row.status === 'PRESENT' ? 'ABSENT' : 'PRESENT'; try { await api(`/attendance/${row.student_id}/${row.class_date_id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); setMessage('Asistencia modificada y auditada.'); await load(); } catch (e) { setMessage(e.message); } }
  async function importFile(endpoint, event) { const file = event.target.files[0]; if (!file) return; const form = new FormData(); form.append('file', file); try { const result = await api(endpoint, { method: 'POST', body: form }); setMessage(`Importación terminada: ${result.imported} registros cargados.${result.errors.length ? ` Errores: ${result.errors.join(' ')}` : ''}`); await load(); } catch (e) { setMessage(e.message); } event.target.value = ''; }
  async function activateModule(event) { event.preventDefault(); const name = event.target.elements.name.value; if (!window.confirm('Esto archivará el módulo actual. ¿Deseas continuar?')) return; try { await api('/modules/activate', { method: 'POST', body: JSON.stringify({ name }) }); setMessage('Nuevo módulo activado. Ahora importa sus estudiantes y fechas.'); await load(); } catch (e) { setMessage(e.message); } }
  const present = attendance.filter(a => a.status === 'PRESENT').length; const absent = attendance.filter(a => a.status === 'ABSENT').length;
  return <Dashboard title="Panel administrativo" subtitle="Gestiona el módulo activo, estudiantes y asistencias" logout={logout}>
    {message && <div className="notice">{message}</div>}
    <nav className="tabs">{[['attendance', 'Asistencias'], ['students', 'Estudiantes'], ['imports', 'Importar Excel'], ['activity', 'Historial de actividades'], ['module', 'Nuevo módulo']].map(([key, label]) => <button key={key} className={tab === key ? 'tab active' : 'tab'} onClick={() => setTab(key)}>{label}</button>)}</nav>
    {tab === 'attendance' && <><div className="stats"><div><strong>{students.length}</strong><span>Estudiantes</span></div><div><strong>{present}</strong><span>Presentes</span></div><div><strong>{absent}</strong><span>Faltas</span></div></div><section className="panel"><div className="panel-heading"><h2>Vista general de asistencias</h2><div className="filters"><input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} /><select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}><option value="">Todos los estudiantes</option>{students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></div></div><AttendanceTable rows={attendance} onUpdate={update} /></section></>}
    {tab === 'students' && <section className="panel"><div className="panel-heading"><h2>Listado de estudiantes activos</h2><form className="inline-form" onSubmit={e => { e.preventDefault(); load(); }}><input placeholder="Buscar por nombre o registro" value={search} onChange={e => setSearch(e.target.value)} /><button className="small">Buscar</button></form></div><div className="table-wrap"><table><thead><tr><th>Número de registro</th><th>Nombre completo</th><th>Correo electrónico</th></tr></thead><tbody>{students.map(s => <tr key={s.id}><td>{s.registration_number}</td><td>{s.full_name}</td><td>{s.email}</td></tr>)}</tbody></table></div></section>}
    {tab === 'imports' && <ImportPanel onImport={importFile} />}
    {tab === 'activity' && <section className="panel"><div className="panel-heading"><div><h2>Historial de actividades</h2><p className="muted">Acciones del módulo activo, con usuario y fecha.</p></div></div><div className="table-wrap"><table><thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>{logs.map(log => <tr key={log.id}><td>{new Date(log.created_at).toLocaleString()}</td><td>{log.user_name || 'Sistema'}</td><td>{actionLabel(log.action)}</td><td>{log.details && Object.keys(log.details).length ? JSON.stringify(log.details) : '—'}</td></tr>)}</tbody></table></div></section>}
    {tab === 'module' && <section className="panel narrow"><h2>Activar nuevo módulo</h2><p className="muted">Los datos anteriores se conservarán, pero dejarán de estar activos.</p><form onSubmit={activateModule}><label>Nombre del nuevo módulo<input name="name" required placeholder="Ej. Módulo 2 - 2026" /></label><button>Archivar actual y activar nuevo</button></form></section>}
  </Dashboard>;
}

function ImportPanel({ onImport }) {
  return <section className="import-grid"><ImportCard title="Estudiantes" description="Columnas: Número de registro, Nombre completo y Correo electrónico." endpoint="/import/students" onImport={onImport} /><ImportCard title="Fechas de clases" description="Columnas: Fecha, Hora inicio y Hora fin." endpoint="/import/class-dates" onImport={onImport} /></section>;
}
function ImportCard({ title, description, endpoint, onImport }) { return <section className="panel import-card"><span className="upload-icon">↑</span><h2>Importar {title}</h2><p className="muted">{description}</p><label className="file-label">Seleccionar archivo Excel<input type="file" accept=".xlsx,.xls,.csv" onChange={e => onImport(endpoint, e)} /></label><small>El sistema validará campos obligatorios y duplicados.</small></section>; }
function AttendanceTable({ rows, onUpdate }) { return <div className="table-wrap"><table><thead><tr><th>Estudiante</th><th>Fecha</th><th>Estado</th><th>Hora</th><th></th></tr></thead><tbody>{rows.map(row => <tr key={`${row.student_id}-${row.class_date_id}`}><td>{row.full_name}<small>{row.registration_number}</small></td><td>{formatDate(row.class_date)}</td><td><span className={`status ${row.status === 'PRESENT' ? 'present' : row.status === 'PENDING' ? 'pending' : 'absent'}`}>{row.status === 'PRESENT' ? 'Presente' : row.status === 'PENDING' ? 'Pendiente' : 'Falta'}</span></td><td>{row.marked_at ? new Date(row.marked_at).toLocaleTimeString() : '—'}</td><td><button className="small secondary" onClick={() => onUpdate(row)}>Cambiar</button></td></tr>)}</tbody></table></div>; }
function Dashboard({ title, subtitle, logout, children }) { return <div className="app-shell"><header><div><span className="eyebrow">MÓDULO ACTIVO</span><h1>{title}</h1><p className="header-subtitle">{subtitle}</p></div><button className="secondary" onClick={logout}>Cerrar sesión</button></header><main className="content">{children}</main></div>; }
function normalizeDate(value) {
  const text = String(value ?? '').trim();
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const local = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  return local ? `${local[3]}-${local[2].padStart(2, '0')}-${local[1].padStart(2, '0')}` : '';
}
function formatDate(value) {
  const date = normalizeDate(value);
  if (!date) return 'Fecha inválida';
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX').format(new Date(year, month - 1, day));
}
function todayLocal() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function actionLabel(action) { return ({ MARK_ATTENDANCE: 'Marcó asistencia', UPDATE_ATTENDANCE: 'Modificó asistencia', ACTIVATE_MODULE: 'Activó módulo' }[action] || action); }
function App() { const [user, setUser] = useState(null); useEffect(() => { const token = localStorage.getItem('token'); if (token) { try { const payload = JSON.parse(atob(token.split('.')[1])); setUser({ name: payload.name, role: payload.role }); } catch { localStorage.clear(); } } }, []); function logout() { localStorage.clear(); setUser(null); } if (!user) return <Login onLogin={setUser} />; return user.role === 'ADMIN' ? <AdminView user={user} logout={logout} /> : <StudentView user={user} logout={logout} />; }
createRoot(document.getElementById('root')).render(<App />);
