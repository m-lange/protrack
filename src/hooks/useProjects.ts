import { useCallback, useEffect, useState } from 'react';
import { deleteProject, getAllProjects, saveProject } from '../db/database';
import type { Project } from '../types/project';

function byOrder(a: Project, b: Project): number {
  return a.order - b.order;
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[] | null>(null);

  useEffect(() => {
    getAllProjects().then((loaded) => {
      setProjects([...loaded].sort(byOrder));
    });
  }, []);

  const nextOrder = useCallback(() => {
    const current = projects ?? [];
    return current.length === 0 ? 0 : Math.max(...current.map((p) => p.order)) + 1;
  }, [projects]);

  const upsertProject = useCallback(async (project: Project) => {
    await saveProject(project);
    setProjects((prev) => {
      const others = (prev ?? []).filter((p) => p.id !== project.id);
      return [...others, project].sort(byOrder);
    });
  }, []);

  const removeProject = useCallback(async (id: string) => {
    await deleteProject(id);
    setProjects((prev) => (prev ?? []).filter((p) => p.id !== id));
  }, []);

  const moveProject = useCallback(async (id: string, direction: 'up' | 'down') => {
    setProjects((prev) => {
      const list = [...(prev ?? [])].sort(byOrder);
      const index = list.findIndex((p) => p.id === id);
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (index === -1 || swapIndex < 0 || swapIndex >= list.length) {
        return prev;
      }
      const a = list[index];
      const b = list[swapIndex];
      const swappedA = { ...a, order: b.order };
      const swappedB = { ...b, order: a.order };
      void saveProject(swappedA);
      void saveProject(swappedB);
      list[index] = swappedB;
      list[swapIndex] = swappedA;
      return list.sort(byOrder);
    });
  }, []);

  return { projects, upsertProject, removeProject, moveProject, nextOrder };
}
