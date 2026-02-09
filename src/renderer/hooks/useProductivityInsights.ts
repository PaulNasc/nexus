import { useMemo } from 'react';

import type { TaskStats } from './useSupabaseTasks';
import type { UserSettings } from './useSettings';

export interface ProductivitySuggestion {
  id: string;
  title: string;
  body: string;
  severity: 'info' | 'success' | 'warning';
}

interface UseProductivityInsightsArgs {
  tasks: Array<{
    id: number;
    status: string;
    priority?: string;
    due_date?: string;
    completed_at?: string;
  }>;
  stats: TaskStats | null;
  settings: Pick<
    UserSettings,
    | 'dailyGoal'
    | 'aiResponseMode'
    | 'aiProactiveMode'
    | 'showProductivityTips'
    | 'showProgressInsights'
  >;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function parseISODate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatByMode(mode: 'detailed' | 'balanced' | 'concise', parts: string[]): string {
  if (parts.length === 0) return '';

  if (mode === 'concise') {
    return parts[0];
  }

  if (mode === 'balanced') {
    return parts.slice(0, Math.min(2, parts.length)).join(' ');
  }

  return parts.join(' ');
}

export function useProductivityInsights({ tasks, stats, settings }: UseProductivityInsightsArgs) {
  return useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);

    const completedToday = tasks.filter((t) => {
      const completedAt = parseISODate(t.completed_at);
      return completedAt ? isSameDay(completedAt, now) : false;
    }).length;

    const overdueTasks = tasks.filter((t) => {
      const due = parseISODate(t.due_date);
      const isDone = t.status === 'concluido' || Boolean(t.completed_at);
      return Boolean(due) && !isDone && due!.getTime() < todayStart.getTime();
    });

    const dueTodayTasks = tasks.filter((t) => {
      const due = parseISODate(t.due_date);
      const isDone = t.status === 'concluido' || Boolean(t.completed_at);
      return Boolean(due) && !isDone && isSameDay(due!, now);
    });

    const highPriorityOpen = tasks.filter((t) => {
      const isDone = t.status === 'concluido' || Boolean(t.completed_at);
      return !isDone && (t.priority === 'high' || t.priority === 'alta');
    }).length;

    const totalTasks = stats?.total ?? tasks.length;
    const completedAll = stats?.concluido ?? tasks.filter((t) => t.status === 'concluido' || Boolean(t.completed_at)).length;
    const completionRateAll = totalTasks > 0 ? Math.round((completedAll / totalTasks) * 100) : 0;

    const tipParts: string[] = [];

    if (overdueTasks.length > 0) {
      tipParts.push(`Você tem ${overdueTasks.length} tarefa(s) vencida(s).`);
      tipParts.push('Sugestão: comece pela tarefa mais importante e finalize uma por vez.');
      tipParts.push('Se necessário, mova o restante para "Esta Semana" e reduza o escopo de hoje.');
    } else if (dueTodayTasks.length > 0) {
      tipParts.push(`Hoje existem ${dueTodayTasks.length} tarefa(s) com prazo.`);
      tipParts.push('Sugestão: escolha 1 tarefa de maior impacto para finalizar primeiro.');
      tipParts.push('Use blocos de foco (ex.: 25min) e revise ao final do dia.');
    } else if (highPriorityOpen > 0) {
      tipParts.push(`Você tem ${highPriorityOpen} tarefa(s) de alta prioridade pendente(s).`);
      tipParts.push('Sugestão: reserve o primeiro bloco do dia para uma delas.');
    } else if (completedToday >= settings.dailyGoal) {
      tipParts.push(`Meta diária batida: ${completedToday}/${settings.dailyGoal}.`);
      tipParts.push('Sugestão: finalize pendências pequenas ou planeje o próximo dia.');
    } else {
      tipParts.push('Sugestão: organize 3 tarefas-chave e execute em sequência, evitando alternar contexto.');
      tipParts.push('Use pequenas pausas entre blocos para manter consistência.');
    }

    const tipText = formatByMode(settings.aiResponseMode, tipParts);

    const progressParts: string[] = [];

    if (totalTasks === 0) {
      progressParts.push('Comece criando suas primeiras tarefas para acompanhar seu progresso.');
    } else {
      progressParts.push(`Progresso geral: ${completionRateAll}% concluído (${completedAll}/${totalTasks}).`);

      if (overdueTasks.length > 0) {
        progressParts.push(`Atenção: ${overdueTasks.length} tarefa(s) vencida(s) precisam de prioridade.`);
      } else {
        progressParts.push('Nenhuma tarefa vencida detectada.');
      }

      if (dueTodayTasks.length > 0) {
        progressParts.push(`Prazo hoje: ${dueTodayTasks.length} tarefa(s) com vencimento.`);
      }

      progressParts.push(`Hoje: ${completedToday} tarefa(s) concluída(s). Meta: ${settings.dailyGoal}.`);
    }

    const progressText = formatByMode(settings.aiResponseMode, progressParts);

    const proactiveSuggestions: ProductivitySuggestion[] = [];

    if (settings.aiProactiveMode) {
      if (overdueTasks.length > 0) {
        proactiveSuggestions.push({
          id: 'overdue',
          title: 'Resolver tarefas vencidas',
          body: `Você tem ${overdueTasks.length} tarefa(s) vencida(s). Separe 30–60min para limpar pelo menos 1 hoje.`,
          severity: 'warning',
        });
      }

      if (completedToday < settings.dailyGoal) {
        const remaining = Math.max(0, settings.dailyGoal - completedToday);
        proactiveSuggestions.push({
          id: 'daily-goal',
          title: 'Avançar na meta diária',
          body: `Faltam ${remaining} tarefa(s) para sua meta. Escolha tarefas curtas para manter o ritmo.`,
          severity: 'info',
        });
      } else {
        proactiveSuggestions.push({
          id: 'maintain',
          title: 'Manter consistência',
          body: 'Meta atingida. Aproveite para revisar tarefas da semana e preparar o próximo dia.',
          severity: 'success',
        });
      }

      if (highPriorityOpen > 0) {
        proactiveSuggestions.push({
          id: 'high-priority',
          title: 'Foco em alta prioridade',
          body: `Existem ${highPriorityOpen} tarefa(s) de alta prioridade pendente(s). Bloqueie um período de foco para uma delas.`,
          severity: 'warning',
        });
      }
    }

    return {
      tipText,
      progressText,
      proactiveSuggestions,
      metrics: {
        completedToday,
        overdueCount: overdueTasks.length,
        dueTodayCount: dueTodayTasks.length,
        completionRateAll,
      },
    };
  }, [tasks, stats, settings.aiProactiveMode, settings.aiResponseMode, settings.dailyGoal]);
}
