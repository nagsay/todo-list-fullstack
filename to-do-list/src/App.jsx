import { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Check, Calendar, Sun, Moon, 
  GripVertical, Edit2, X, Save, Clock 
} from 'lucide-react';
import Confetti from 'react-confetti';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './App.css';

// ⚠️ IMPORTANTE: Se for rodar no computador, use o link do 127.0.0.1
// Se for fazer o DEPLOY (colocar na internet), troque pelo link do Render!
const API_URL = 'http://127.0.0.1:8000/api/tasks/';// --- Componente de Item (Igual, mas preparado para API) ---

function SortableItem({ task, toggleTask, deleteTask, startEditing, isEditing, editValue, setEditValue, saveEdit, cancelEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  const categoryColors = { Pessoal: 'bg-pink', Trabalho: 'bg-blue', Estudos: 'bg-purple' };
  const isLate = task.date && new Date(task.date) < new Date().setHours(0,0,0,0) && !task.completed;

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const offsetDate = new Date(date.getTime() + userTimezoneOffset);
    return offsetDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <li ref={setNodeRef} style={style} className={`task-item ${task.completed ? 'completed' : ''}`}>
      {isEditing ? (
        <div className="edit-mode">
          <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} autoFocus />
          <button onClick={() => saveEdit(task.id)} className="icon-btn save"><Save size={16}/></button>
          <button onClick={cancelEdit} className="icon-btn cancel"><X size={16}/></button>
        </div>
      ) : (
        <>
          <div className="drag-handle" {...attributes} {...listeners}><GripVertical size={18} /></div>
          <div className="task-content" onClick={() => toggleTask(task.id, task.completed)}>
            <div className="checkbox-custom">{task.completed && <Check size={14} strokeWidth={3} />}</div>
            <div className="text-wrapper">
              <span className={task.completed ? '' : (isLate ? 'text-danger' : '')}>{task.text}</span>
              <div className="tags-row">
                <span className={`category-tag ${categoryColors[task.category]}`}>{task.category}</span>
                {task.date && (
                  <span className={`date-tag ${isLate ? 'date-late' : ''}`}>
                    <Clock size={10} style={{marginRight: 4}}/>{formatDate(task.date)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="actions">
            <button onClick={() => startEditing(task)} className="icon-btn edit"><Edit2 size={16} /></button>
            <button onClick={() => deleteTask(task.id)} className="icon-btn delete"><Trash2 size={16} /></button>
          </div>
        </>
      )}
    </li>
  );
}

// --- Componente Principal ---
function App() {
  const [tasks, setTasks] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [category, setCategory] = useState('Pessoal');
  const [date, setDate] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [filter, setFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // 1. GET - Buscar tarefas do Django
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error("Erro ao buscar tarefas:", error);
    }
  };

  // 2. POST - Criar tarefa
  const addTask = async () => {
    if (!inputValue.trim()) return;
    
    const newTask = {
      text: inputValue,
      completed: false,
      category: category,
      date: date || null,
    };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });
      const savedTask = await response.json();
      setTasks([savedTask, ...tasks]);
      setInputValue('');
      setDate('');
    } catch (error) {
      console.error("Erro ao criar:", error);
    }
  };

  // 3. PATCH - Atualizar status
  const toggleTask = async (id, currentStatus) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !currentStatus } : t));
    try {
      await fetch(`${API_URL}${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentStatus }),
      });
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      fetchTasks();
    }
  };

  // 4. DELETE - Apagar
  const deleteTask = async (id) => {
    setTasks(tasks.filter(t => t.id !== id));
    try {
      await fetch(`${API_URL}${id}/`, { method: 'DELETE' });
    } catch (error) {
      console.error("Erro ao deletar:", error);
      fetchTasks();
    }
  };

  // 5. PATCH - Salvar Edição
  const saveEdit = async (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, text: editValue } : t));
    setEditingId(null);
    try {
      await fetch(`${API_URL}${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editValue }),
      });
    } catch (error) {
      console.error("Erro ao editar:", error);
    }
  };

  const startEditing = (task) => {
    setEditingId(task.id);
    setEditValue(task.text);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setTasks((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length === 0 ? 0 : (completedCount / tasks.length) * 100;
  
  const filteredTasks = tasks.filter(task => {
    if (filter === 'completed') return task.completed;
    if (filter === 'active') return !task.completed;
    return true;
  });

  return (
    <div className={`app-container ${darkMode ? 'dark' : ''}`}>
      {tasks.length > 0 && progress === 100 && (
        <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={500} />
      )}

      <div className="glass-card">
        <header>
          <div className="date-display"><Calendar size={18} /><span>{today}</span></div>
          <button onClick={() => setDarkMode(!darkMode)} className="theme-toggle">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        {/* --- NOME ATUALIZADO AQUI --- */}
        <h1>Lumina To Do List</h1>

        <div className="progress-container">
          <div className="progress-info"><span>Progresso</span><span>{Math.round(progress)}%</span></div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="input-group">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="category-select">
            <option value="Pessoal">Pessoal</option>
            <option value="Trabalho">Trabalho</option>
            <option value="Estudos">Estudos</option>
          </select>
          <input type="text" placeholder="Nova tarefa..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} />
          <input type="date" className="date-input" value={date} onChange={(e) => setDate(e.target.value)} />
          <button onClick={addTask} className="add-btn"><Plus size={24} /></button>
        </div>

        <div className="filters">
          {['all', 'active', 'completed'].map((f) => (
            <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
              {f === 'all' ? 'Todas' : f === 'active' ? 'Pendentes' : 'Concluídas'}
            </button>
          ))}
        </div>

        <div className="list-container">
          {filteredTasks.length === 0 && <li className="empty-state">Carregando... 🍃</li>}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredTasks} strategy={verticalListSortingStrategy} disabled={filter !== 'all'}>
              <ul className="task-list">
                {filteredTasks.map(task => (
                  <SortableItem key={task.id} task={task} toggleTask={toggleTask} deleteTask={deleteTask} startEditing={startEditing} isEditing={editingId === task.id} editValue={editValue} setEditValue={setEditValue} saveEdit={saveEdit} cancelEdit={() => setEditingId(null)} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}

export default App;