
import React from 'react';
import { SystemLog } from '../types';

interface SystemConsoleProps {
  logs: SystemLog[];
}

const SystemConsole: React.FC<SystemConsoleProps> = ({ logs }) => {
  return (
    <div className="glass h-full rounded-xl flex flex-col overflow-hidden font-mono text-sm">
      <div className="bg-slate-800/50 px-4 py-2 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
          </div>
          <span className="text-slate-400 text-xs font-bold ml-2">SYSTEM_CONTROL_CONSOLE</span>
        </div>
        <i className="fas fa-terminal text-slate-500"></i>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {logs.map((log, idx) => (
          <div key={idx} className="flex gap-3">
            <span className="text-slate-500 whitespace-nowrap">[{log.timestamp}]</span>
            <span className={`
              ${log.type === 'info' ? 'text-blue-400' : ''}
              ${log.type === 'success' ? 'text-emerald-400' : ''}
              ${log.type === 'warning' ? 'text-amber-400' : ''}
              ${log.type === 'error' ? 'text-rose-400' : ''}
              ${log.type === 'ai' ? 'text-purple-400 italic' : ''}
            `}>
              {log.type === 'ai' ? '>> ' : '> '}{log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemConsole;
