/**
 * Constantes de cores do tema
 */

export const THEME_COLORS = {
  primary: '#8b8b8b',
  primaryDark: '#6b6b6b',
  primaryLight: '#a0a0a0',

  background: {
    main: '#1a1a1a',
    secondary: '#1e1e1e',
    tertiary: '#252525',
  },

  status: {
    success: '#00C853',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  },

  levels: {
    beginner: 'from-gray-500 to-gray-600',
    advanced: 'from-green-500 to-emerald-600',
    expert: 'from-blue-500 to-cyan-600',
    master: 'from-purple-500 to-pink-600',
    legendary: 'from-yellow-500 to-amber-600',
  },
};

export const LEVEL_CONFIG = {
  beginner: { threshold: 0, icon: '🌱', next: 100 },
  advanced: { threshold: 100, icon: '💪', next: 250 },
  expert: { threshold: 250, icon: '🔥', next: 500 },
  master: { threshold: 500, icon: '⚡', next: 1000 },
  legendary: { threshold: 1000, icon: '👑', next: null },
};

/**
 * Retorna informações do level baseado nas horas
 */
export function getLevelInfo(hours) {
  if (hours >= 1000) {
    return {
      level: 'Legendary',
      color: THEME_COLORS.levels.legendary,
      icon: LEVEL_CONFIG.legendary.icon,
      next: null,
    };
  }
  if (hours >= 500) {
    return {
      level: 'Master',
      color: THEME_COLORS.levels.master,
      icon: LEVEL_CONFIG.master.icon,
      next: 1000,
    };
  }
  if (hours >= 250) {
    return {
      level: 'Expert',
      color: THEME_COLORS.levels.expert,
      icon: LEVEL_CONFIG.expert.icon,
      next: 500,
    };
  }
  if (hours >= 100) {
    return {
      level: 'Advanced',
      color: THEME_COLORS.levels.advanced,
      icon: LEVEL_CONFIG.advanced.icon,
      next: 250,
    };
  }
  return {
    level: 'Beginner',
    color: THEME_COLORS.levels.beginner,
    icon: LEVEL_CONFIG.beginner.icon,
    next: 100,
  };
}
