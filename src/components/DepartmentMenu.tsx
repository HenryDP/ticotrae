import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Menu, GripVertical } from 'lucide-react';
import { DEPARTAMENTOS } from '../types';
import { motion, useDragControls } from 'motion/react';

interface DepartmentMenuProps {
  onSelectCategory: (category: string) => void;
  selectedCategory: string;
}

export default function DepartmentMenu({ onSelectCategory, selectedCategory }: DepartmentMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDepartment, setActiveDepartment] = useState<string | null>(null);
  const [hasDragged, setHasDragged] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveDepartment(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <motion.div 
      className="fixed z-[100] bottom-6 left-6 xs:left-8 xs:bottom-8 sm:bottom-12 sm:left-12 flex items-end gap-2" 
      ref={menuRef}
      drag
      dragControls={dragControls}
      dragListener={false} // Solo arrastrar por el handle
      dragMomentum={false}
      onDragStart={() => {
        setHasDragged(true);
        setIsOpen(false);
      }}
      onDragEnd={(e, info) => {
        // Small delay so click doesn't trigger immediately if it was just a tiny move
        setTimeout(() => setHasDragged(false), 200);
      }}
      style={{ touchAction: 'none' }}
    >
      <div 
        onPointerDown={(e) => dragControls.start(e)}
        className="p-3 cursor-grab active:cursor-grabbing bg-white/90 dark:bg-slate-800/90 rounded-full shadow-lg border border-gray-200 dark:border-slate-700 backdrop-blur hover:bg-gray-50 flex-shrink-0"
        title="Mover menú"
      >
        <GripVertical size={20} className="text-gray-500" />
      </div>

      <div className="relative">
        <button
          onClick={() => {
            if (!hasDragged) setIsOpen(!isOpen);
          }}
          className={`flex items-center gap-2 px-5 py-3 border rounded-full transition-colors font-bold shadow-xl backdrop-blur-md ${
            selectedCategory !== "Todas"
              ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700'
              : 'bg-white/95 dark:bg-slate-800/95 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-slate-700 hover:bg-gray-50'
          }`}
        >
          <Menu size={20} />
          <span className="hidden sm:inline truncate max-w-[120px]">
            {selectedCategory !== "Todas" ? selectedCategory.split(' - ')[0] : "Departamentos"}
          </span>
          <span className="inline sm:hidden truncate max-w-[90px]">
            {selectedCategory !== "Todas" ? selectedCategory.split(' - ')[0] : "Depto"}
          </span>
          <ChevronDown size={18} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute bottom-full mb-3 left-0 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col pointer-events-auto">
            {Object.entries(DEPARTAMENTOS).map(([dep, subcats]) => (
              <div
                key={dep}
                className="relative group"
                onMouseEnter={() => window.innerWidth > 640 && setActiveDepartment(dep)}
                onMouseLeave={() => window.innerWidth > 640 && setActiveDepartment(null)}
              >
                <button
                  onClick={(e) => {
                    if (window.innerWidth <= 640) {
                      e.preventDefault();
                      setActiveDepartment(activeDepartment === dep ? null : dep);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium transition-colors ${
                    activeDepartment === dep
                      ? 'bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {dep}
                  <ChevronRight size={16} className={activeDepartment === dep ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'} />
                </button>

                {/* Submenú desplegable al hacer hover (Desktop) */}
                {activeDepartment === dep && (
                  <div className="absolute bottom-0 left-full ml-1 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden hidden sm:flex flex-col">
                    <button
                      onClick={() => {
                        onSelectCategory(dep);
                        setIsOpen(false);
                        setActiveDepartment(null);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors ${
                        selectedCategory === dep
                          ? 'bg-blue-600 text-white'
                          : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      Ver todo en {dep}
                    </button>
                    {subcats.map(sub => {
                      const fullName = `${dep} - ${sub}`;
                      return (
                        <button
                          key={sub}
                          onClick={() => {
                            onSelectCategory(fullName);
                            setIsOpen(false);
                            setActiveDepartment(null);
                          }}
                          className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                            selectedCategory === fullName
                              ? 'bg-blue-600 text-white font-medium'
                              : 'text-gray-600 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                )}
                
                {/* Submenú para móvil (Expansión inline) */}
                {activeDepartment === dep && (
                  <div className="sm:hidden flex flex-col bg-gray-50/50 dark:bg-slate-900 border-y border-gray-100 dark:border-slate-700 h-48 overflow-y-auto">
                    <button
                      onClick={() => {
                        onSelectCategory(dep);
                        setIsOpen(false);
                        setActiveDepartment(null);
                      }}
                      className={`w-full text-left pl-8 pr-4 py-2.5 text-sm font-bold transition-colors ${
                        selectedCategory === dep
                          ? 'bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-l-2 border-blue-500'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      Ver todo en {dep}
                    </button>
                    {subcats.map(sub => {
                      const fullName = `${dep} - ${sub}`;
                      return (
                        <button
                          key={sub}
                          onClick={() => {
                            onSelectCategory(fullName);
                            setIsOpen(false);
                            setActiveDepartment(null);
                          }}
                          className={`w-full text-left pl-8 pr-4 py-2.5 text-sm transition-colors ${
                            selectedCategory === fullName
                              ? 'bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium border-l-2 border-blue-500'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            
            <div className="border-t border-gray-100 dark:border-slate-700">
               <button
                  key="Ofertas"
                  onClick={() => {
                    onSelectCategory("Ofertas");
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3.5 text-sm transition-colors font-bold ${
                    selectedCategory === "Ofertas"
                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700' 
                      : 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                  }`}
                >
                  Ofertas del Día
                </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
