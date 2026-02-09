import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useTheme } from '../hooks/useTheme';
import { useLogging } from '../hooks/useLogging';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  category: 'security' | 'performance' | 'user' | 'system' | 'database';
  data?: Record<string, any>;
}

interface LogViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({ isOpen, onClose }) => {
  useTheme();
  const { logAction } = useLogging();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  const categories = [
    { id: 'all', name: 'Todos', color: '#6B7280' },
    { id: 'security', name: 'Segurança', color: '#EF4444' },
    { id: 'performance', name: 'Performance', color: '#10B981' },
    { id: 'user', name: 'Usuário', color: '#3B82F6' },
    { id: 'system', name: 'Sistema', color: '#8B5CF6' },

    { id: 'database', name: 'Banco', color: '#EC4899' }
  ];

  const levels = [
    { id: 'all', name: 'Todos', color: '#6B7280' },
    { id: 'debug', name: 'Debug', color: '#6B7280' },
    { id: 'info', name: 'Info', color: '#3B82F6' },
    { id: 'warn', name: 'Aviso', color: '#F59E0B' },
    { id: 'error', name: 'Erro', color: '#EF4444' }
  ];

  useEffect(() => {
    if (isOpen) {
      loadLogs();
      logAction('log_viewer_opened', 'logging');
    }
  }, [isOpen]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      // Simular carregamento de logs (em produção, isso viria do main process)
      const mockLogs: LogEntry[] = [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Sistema de logging inicializado',
          category: 'system',
          data: { version: '1.0.0' }
        },

        {
          timestamp: new Date(Date.now() - 120000).toISOString(),
          level: 'warn',
          message: 'Tentativa de acesso não autorizado',
          category: 'security',
          data: { action: 'settings_change', userId: 'anonymous' }
        }
      ];

      setLogs(mockLogs);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportLogs = () => {
    try {
      const logData = JSON.stringify(logs, null, 2);
      const blob = new Blob([logData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus-logs-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      logAction('logs_exported', 'logging', { count: logs.length });
    } catch (error) {
      console.error('Erro ao exportar logs:', error);
    }
  };

  const clearLogs = () => {
    if (window.confirm('Tem certeza que deseja limpar todos os logs?')) {
      setLogs([]);
      logAction('logs_cleared', 'logging');
    }
  };

  const filteredLogs = logs.filter(log => {
    const categoryMatch = selectedCategory === 'all' || log.category === selectedCategory;
    const levelMatch = selectedLevel === 'all' || log.level === selectedLevel;
    return categoryMatch && levelMatch;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return '#EF4444';
      case 'warn': return '#F59E0B';
      case 'info': return '#3B82F6';
      case 'debug': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Visualizador de Logs
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Sistema de logs estruturados
            </p>
          </div>
          <Button onClick={onClose} variant="ghost" size="sm">
            ✕
          </Button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Categoria
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nível
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {levels.map(level => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={loadLogs} disabled={isLoading}>
                {isLoading ? 'Carregando...' : 'Atualizar'}
              </Button>
              <Button onClick={exportLogs} variant="secondary">
                Exportar
              </Button>
              <Button onClick={clearLogs} variant="danger">
                Limpar
              </Button>
            </div>
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-auto p-6">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {isLoading ? 'Carregando logs...' : 'Nenhum log encontrado'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          style={{ backgroundColor: getLevelColor(log.level) }}
                          className="text-white"
                        >
                          {log.level.toUpperCase()}
                        </Badge>
                        <Badge
                          style={{ backgroundColor: categories.find(c => c.id === log.category)?.color }}
                          className="text-white"
                        >
                          {categories.find(c => c.id === log.category)?.name}
                        </Badge>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-gray-900 dark:text-white mb-2">
                        {log.message}
                      </p>
                      {log.data && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                            Dados adicionais
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              {filteredLogs.length} logs encontrados
            </span>
            <span>
              Última atualização: {new Date().toLocaleTimeString('pt-BR')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}; 